import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type { Prisma } from '../../generated/prisma/client';
import type { AuthenticatedUser } from '../../common/auth/auth-context';
import { ApiException } from '../../common/http/api-exception';
import { type Page, pageWindow, type PageQueryDto } from '../../common/http/pagination';
import { cleanText, excerptOf, likeContains, optionalText } from '../../common/http/text';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service';
import { technologySelect } from '../technologies/technologies.dto';
import { TechnologiesService } from '../technologies/technologies.service';
import { publicAuthorSelect, toPublicAuthor } from '../users/projections';
import type { CreateProjectDto, MemberDto, OwnProjectQueryDto, OwnProjectSummaryDto, ProjectDetailDto, ProjectListQueryDto, ProjectSummaryDto, UpdateProjectDto } from './projects.dto';

const HOUR = 60 * 60 * 1000;
const DETAIL_MEMBERS = 50;
const summarySelect = {
  id: true, ownerId: true, title: true, objective: true, availability: true, recruitmentStatus: true, visibility: true, createdAt: true, updatedAt: true,
  owner: { select: publicAuthorSelect },
  technologies: { select: { technology: { select: technologySelect } }, orderBy: { technology: { name: 'asc' } } },
  _count: { select: { members: true } }
} as const satisfies Prisma.ProjectSelect;
const memberSelect = { joinedAt: true, user: { select: publicAuthorSelect } } as const satisfies Prisma.ProjectMemberSelect;
const memberOrder = [{ joinedAt: 'asc' }, { userId: 'asc' }] as const satisfies Prisma.ProjectMemberOrderByWithRelationInput[];

type SummaryRow = Prisma.ProjectGetPayload<{ select: typeof summarySelect }>;
type MemberRow = Prisma.ProjectMemberGetPayload<{ select: typeof memberSelect }>;

export const projectNotFound = () => new ApiException(404, 'PROJECT_NOT_FOUND', 'Projet introuvable.');
const notOwner = () => new ApiException(403, 'NOT_OWNER', 'Seul le responsable du projet peut effectuer cette action.');

@Injectable()
export class ProjectsService {
  constructor(private readonly database: DatabaseService, private readonly technologies: TechnologiesService, private readonly limiter: RateLimiter) {}

  list(query: ProjectListQueryDto): Promise<Page<ProjectSummaryDto>> {
    const words = (query.q ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 8);
    return this.page({
      visibility: 'VISIBLE',
      recruitmentStatus: query.recruitment,
      technologies: query.technology ? { some: { technology: { slug: query.technology } } } : undefined,
      AND: words.map(word => {
        const contains = { contains: likeContains(word), mode: 'insensitive' as const };
        return { OR: [{ title: contains }, { objective: contains }] };
      })
    }, query, row => this.toSummary(row));
  }

  /** Projets visibles créés ou rejoints ; le responsable étant membre, chaque projet n'apparaît qu'une fois. */
  async listByMember(userId: string, query: PageQueryDto): Promise<Page<ProjectSummaryDto>> {
    if (!await this.database.prisma.user.findUnique({ where: { id: userId }, select: { id: true } })) throw new ApiException(404, 'USER_NOT_FOUND', 'Profil introuvable.');
    return this.page({ visibility: 'VISIBLE', members: { some: { userId } } }, query, row => this.toSummary(row));
  }

  listOwn(userId: string, query: OwnProjectQueryDto): Promise<Page<OwnProjectSummaryDto>> {
    const where: Prisma.ProjectWhereInput = query.role === 'OWNER' ? { ownerId: userId } : query.role === 'MEMBER' ? { members: { some: { userId } }, NOT: { ownerId: userId } } : { members: { some: { userId } } };
    return this.page(where, query, row => ({ ...this.toSummary(row), role: row.ownerId === userId ? 'OWNER' : 'MEMBER', visibility: row.visibility }));
  }

  async detail(id: string, viewer?: AuthenticatedUser): Promise<ProjectDetailDto> {
    const project = await this.database.prisma.project.findFirst({ where: { id, visibility: 'VISIBLE' }, select: { ...summarySelect, members: { select: { ...memberSelect, userId: true }, orderBy: memberOrder, take: DETAIL_MEMBERS } } });
    if (!project) throw projectNotFound();
    const isMember = viewer ? project.ownerId === viewer.id || project.members.some(m => m.userId === viewer.id) || await this.isMember(id, viewer.id) : false;
    return {
      ...this.toSummary(project), objective: project.objective,
      members: project.members.map(m => toMember(m, project.ownerId)),
      viewerRole: !viewer || !isMember ? null : project.ownerId === viewer.id ? 'OWNER' : 'MEMBER'
    };
  }

  /** Le projet et l'adhésion du responsable sont créés dans la même transaction : jamais de projet sans responsable membre. */
  async create(user: AuthenticatedUser, input: CreateProjectDto): Promise<ProjectDetailDto> {
    this.limiter.consume(`project:${user.id}`, 5, HOUR);
    await this.technologies.assertExist(input.technologyIds, 'technologyIds');
    const project = await this.database.prisma.project.create({
      data: {
        ownerId: user.id, title: cleanText(input.title), objective: cleanText(input.objective), availability: optionalText(input.availability) ?? null,
        recruitmentStatus: input.recruitmentStatus ?? 'OPEN',
        technologies: { create: input.technologyIds.map(technologyId => ({ technologyId })) },
        members: { create: { userId: user.id } }
      },
      select: { id: true }
    });
    return this.detail(project.id, user);
  }

  async update(user: AuthenticatedUser, id: string, input: UpdateProjectDto): Promise<ProjectDetailDto> {
    await this.assertOwner(user, id);
    if (input.technologyIds) await this.technologies.assertExist(input.technologyIds, 'technologyIds');
    await this.database.prisma.$transaction(async tx => {
      await tx.project.update({
        where: { id },
        data: {
          title: input.title === undefined ? undefined : cleanText(input.title), objective: input.objective === undefined ? undefined : cleanText(input.objective),
          availability: optionalText(input.availability), recruitmentStatus: input.recruitmentStatus
        }
      });
      if (input.technologyIds) {
        await tx.projectTechnology.deleteMany({ where: { projectId: id } });
        await tx.projectTechnology.createMany({ data: input.technologyIds.map(technologyId => ({ projectId: id, technologyId })) });
      }
    });
    return this.detail(id, user);
  }

  async members(id: string, query: PageQueryDto): Promise<Page<MemberDto>> {
    const project = await this.database.prisma.project.findFirst({ where: { id, visibility: 'VISIBLE' }, select: { ownerId: true } });
    if (!project) throw projectNotFound();
    const { page, pageSize, skip, take } = pageWindow(query);
    const [total, rows] = await this.database.prisma.$transaction([
      this.database.prisma.projectMember.count({ where: { projectId: id } }),
      this.database.prisma.projectMember.findMany({ where: { projectId: id }, orderBy: memberOrder, skip, take, select: memberSelect })
    ]);
    return { data: rows.map(row => toMember(row, project.ownerId)), meta: { page, pageSize, total } };
  }

  private async assertOwner(user: AuthenticatedUser, id: string): Promise<void> {
    const project = await this.database.prisma.project.findFirst({ where: { id, visibility: 'VISIBLE' }, select: { ownerId: true } });
    if (!project) throw projectNotFound();
    if (project.ownerId !== user.id) throw notOwner();
  }

  private async isMember(projectId: string, userId: string): Promise<boolean> {
    return (await this.database.prisma.projectMember.count({ where: { projectId, userId } })) > 0;
  }

  private async page<T>(where: Prisma.ProjectWhereInput, query: PageQueryDto, map: (row: SummaryRow) => T): Promise<Page<T>> {
    const { page, pageSize, skip, take } = pageWindow(query);
    const [total, rows] = await this.database.prisma.$transaction([
      this.database.prisma.project.count({ where }),
      this.database.prisma.project.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip, take, select: summarySelect })
    ]);
    return { data: rows.map(map), meta: { page, pageSize, total } };
  }

  private toSummary(row: SummaryRow): ProjectSummaryDto {
    return {
      id: row.id, title: row.title, summary: excerptOf(row.objective), owner: toPublicAuthor(row.owner), technologies: row.technologies.map(t => t.technology),
      recruitmentStatus: row.recruitmentStatus, availability: row.availability, memberCount: row._count.members, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString()
    };
  }
}

function toMember(row: MemberRow, ownerId: string): MemberDto {
  return { ...toPublicAuthor(row.user), isOwner: row.user.id === ownerId, joinedAt: row.joinedAt.toISOString() };
}
