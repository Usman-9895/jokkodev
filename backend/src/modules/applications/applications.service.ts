import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type { Prisma } from '../../generated/prisma/client';
import type { AuthenticatedUser } from '../../common/auth/auth-context';
import { isUniqueViolation } from '../../common/auth/prisma-errors';
import { ApiException } from '../../common/http/api-exception';
import { type Page, pageWindow } from '../../common/http/pagination';
import { cleanText } from '../../common/http/text';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service';
import { projectNotFound } from '../projects/projects.service';
import { publicAuthorSelect, toPublicAuthor } from '../users/projections';
import type { ApplicationDto, ApplicationQueryDto, CreateApplicationDto, DecideApplicationDto } from './applications.dto';

const HOUR = 60 * 60 * 1000;
const applicationSelect = {
  id: true, status: true, message: true, createdAt: true, decidedAt: true, applicantId: true,
  applicant: { select: publicAuthorSelect },
  project: { select: { id: true, ownerId: true, title: true, recruitmentStatus: true, visibility: true, owner: { select: publicAuthorSelect } } }
} as const satisfies Prisma.ApplicationSelect;
type ApplicationRow = Prisma.ApplicationGetPayload<{ select: typeof applicationSelect }>;

const notFound = () => new ApiException(404, 'APPLICATION_NOT_FOUND', 'Candidature introuvable.');
const conflict = (code: string, message: string) => new ApiException(409, code, message);

@Injectable()
export class ApplicationsService {
  constructor(private readonly database: DatabaseService, private readonly limiter: RateLimiter) {}

  /**
   * Le projet est relu sous verrou partagé : une fermeture concurrente du recrutement (UPDATE) attend la fin de la
   * candidature, ou la candidature voit le recrutement déjà fermé. L'unicité (projet, candidat) tranche les doubles envois.
   */
  async apply(user: AuthenticatedUser, projectId: string, input: CreateApplicationDto): Promise<ApplicationDto> {
    this.limiter.consume(`application:${user.id}`, 20, HOUR);
    try {
      const id = await this.database.prisma.$transaction(async tx => {
        const [project] = await tx.$queryRaw<{ ownerId: string; visibility: string; recruitmentStatus: string }[]>`
          SELECT "ownerId", visibility::text AS visibility, "recruitmentStatus"::text AS "recruitmentStatus" FROM "Project" WHERE id = ${projectId}::uuid FOR SHARE`;
        if (!project || project.visibility !== 'VISIBLE') throw projectNotFound();
        if (project.ownerId === user.id) throw conflict('OWN_PROJECT', 'Le responsable ne peut pas candidater à son propre projet.');
        if (await tx.projectMember.count({ where: { projectId, userId: user.id } })) throw conflict('ALREADY_MEMBER', 'Tu es déjà membre de ce projet.');
        if (await tx.application.count({ where: { projectId, applicantId: user.id } })) throw applicationExists();
        if (project.recruitmentStatus !== 'OPEN') throw conflict('RECRUITMENT_CLOSED', 'Le recrutement de ce projet est fermé.');
        const created = await tx.application.create({ data: { projectId, applicantId: user.id, message: cleanText(input.message) }, select: { id: true } });
        return created.id;
      });
      return this.get(user, id);
    } catch (error) {
      if (isUniqueViolation(error)) throw applicationExists();
      throw error;
    }
  }

  /** Demandes reçues : réservé au responsable d'un projet visible. */
  async listForProject(user: AuthenticatedUser, projectId: string, query: ApplicationQueryDto): Promise<Page<ApplicationDto>> {
    const project = await this.database.prisma.project.findFirst({ where: { id: projectId, visibility: 'VISIBLE' }, select: { ownerId: true } });
    if (!project) throw projectNotFound();
    if (project.ownerId !== user.id) throw new ApiException(403, 'NOT_OWNER', 'Seul le responsable du projet peut consulter les candidatures.');
    return this.page(user, { projectId, status: query.status }, query);
  }

  listOwn(user: AuthenticatedUser, query: ApplicationQueryDto): Promise<Page<ApplicationDto>> {
    return this.page(user, { applicantId: user.id, status: query.status }, query);
  }

  /** Lecture réservée aux deux parties ; pour toute autre session, la demande n'existe pas. */
  async get(user: AuthenticatedUser, id: string): Promise<ApplicationDto> {
    const row = await this.database.prisma.application.findUnique({ where: { id }, select: applicationSelect });
    if (!row || !isParty(row, user)) throw notFound();
    if (row.project.visibility !== 'VISIBLE' && row.applicantId !== user.id) throw notFound();
    return toApplication(row, user);
  }

  /**
   * Transitions depuis PENDING uniquement. La mise à jour est conditionnelle à l'état PENDING : entre deux décisions
   * concurrentes, une seule aboutit. L'acceptation et l'adhésion sont écrites dans la même transaction.
   * Répéter la décision déjà appliquée renvoie l'état courant sans rien modifier.
   */
  async decide(user: AuthenticatedUser, id: string, input: DecideApplicationDto): Promise<ApplicationDto> {
    await this.database.prisma.$transaction(async tx => {
      const row = await tx.application.findUnique({ where: { id }, select: { status: true, applicantId: true, projectId: true, applicant: { select: { status: true } }, project: { select: { ownerId: true, visibility: true } } } });
      if (!row || !isParty({ applicantId: row.applicantId, project: row.project }, user)) throw notFound();
      const actorIsOwner = row.project.ownerId === user.id;
      if (input.status === 'WITHDRAWN' ? row.applicantId !== user.id : !actorIsOwner) {
        throw new ApiException(403, 'TRANSITION_FORBIDDEN', input.status === 'WITHDRAWN' ? 'Seul le candidat peut retirer sa demande.' : 'Seul le responsable du projet peut décider.');
      }
      if (row.status === input.status) return;
      if (row.status !== 'PENDING') throw invalidTransition();
      if (input.status !== 'WITHDRAWN' && row.project.visibility !== 'VISIBLE') throw projectNotFound();
      if (input.status === 'ACCEPTED' && row.applicant.status !== 'ACTIVE') throw conflict('APPLICANT_SUSPENDED', 'Ce compte est suspendu.');
      const { count } = await tx.application.updateMany({ where: { id, status: 'PENDING' }, data: { status: input.status, decidedAt: new Date() } });
      if (count !== 1) {
        // Décision concurrente déjà validée : identique, c'est une répétition ; différente, la demande est déjà traitée.
        const current = await tx.application.findUnique({ where: { id }, select: { status: true } });
        if (current?.status === input.status) return;
        throw invalidTransition();
      }
      if (input.status === 'ACCEPTED') await tx.projectMember.createMany({ data: [{ projectId: row.projectId, userId: row.applicantId }], skipDuplicates: true });
    });
    return this.get(user, id);
  }

  private async page(user: AuthenticatedUser, where: Prisma.ApplicationWhereInput, query: ApplicationQueryDto): Promise<Page<ApplicationDto>> {
    const { page, pageSize, skip, take } = pageWindow(query);
    const [total, rows] = await this.database.prisma.$transaction([
      this.database.prisma.application.count({ where }),
      this.database.prisma.application.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip, take, select: applicationSelect })
    ]);
    return { data: rows.map(row => toApplication(row, user)), meta: { page, pageSize, total } };
  }
}

function applicationExists() { return conflict('APPLICATION_EXISTS', 'Tu as déjà candidaté à ce projet.'); }
function invalidTransition() { return conflict('INVALID_TRANSITION', 'Cette demande a déjà été traitée.'); }

function isParty(row: { applicantId: string; project: { ownerId: string } }, user: AuthenticatedUser): boolean {
  return row.applicantId === user.id || row.project.ownerId === user.id;
}

function toApplication(row: ApplicationRow, viewer: AuthenticatedUser): ApplicationDto {
  const available = row.project.visibility === 'VISIBLE';
  return {
    id: row.id, status: row.status, message: row.message, applicant: toPublicAuthor(row.applicant),
    project: { id: row.project.id, available, title: available ? row.project.title : null, recruitmentStatus: available ? row.project.recruitmentStatus : null, owner: available ? toPublicAuthor(row.project.owner) : null },
    createdAt: row.createdAt.toISOString(), decidedAt: row.decidedAt?.toISOString() ?? null,
    viewerRole: row.applicantId === viewer.id ? 'APPLICANT' : 'OWNER'
  };
}
