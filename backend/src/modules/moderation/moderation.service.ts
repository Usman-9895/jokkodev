import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type { Prisma } from '../../generated/prisma/client';
import type { AuthenticatedUser } from '../../common/auth/auth-context';
import { isUniqueViolation } from '../../common/auth/prisma-errors';
import { ApiException } from '../../common/http/api-exception';
import { type Page, pageWindow, type PageQueryDto } from '../../common/http/pagination';
import { cleanText, excerptOf } from '../../common/http/text';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service';
import type { ContentType, CreateReportDto, CreatedReportDto, Decision, DirectActionDto, ModerationActionDto, ReportDetailDto, ReportDto, ReportQueryDto, ReportTargetDto, ResolveReportDto } from './moderation.dto';

type Tx = Prisma.TransactionClient;
const HOUR = 60 * 60 * 1000;
const userSelect = { id: true, username: true, status: true, role: true } as const;
const reportSelect = {
  id: true, status: true, reason: true, decision: true, closedAt: true, createdAt: true, questionId: true, answerId: true, projectId: true,
  reporter: { select: userSelect }, closedBy: { select: userSelect },
  question: { select: { id: true, title: true, context: true, visibility: true, author: { select: userSelect } } },
  answer: { select: { id: true, body: true, visibility: true, questionId: true, author: { select: userSelect }, question: { select: { title: true } } } },
  project: { select: { id: true, title: true, objective: true, visibility: true, owner: { select: userSelect } } }
} as const satisfies Prisma.ReportSelect;
const actionSelect = { id: true, decision: true, reason: true, reportId: true, questionId: true, answerId: true, projectId: true, targetUserId: true, createdAt: true, admin: { select: userSelect } } as const satisfies Prisma.ModerationActionSelect;

type ReportRow = Prisma.ReportGetPayload<{ select: typeof reportSelect }>;
type ActionRow = Prisma.ModerationActionGetPayload<{ select: typeof actionSelect }>;
interface ContentTarget { type: ContentType; id: string }

const reportNotFound = () => new ApiException(404, 'REPORT_NOT_FOUND', 'Signalement introuvable.');
const targetNotFound = () => new ApiException(404, 'TARGET_NOT_FOUND', 'Contenu introuvable.');
const targetColumn = { QUESTION: 'questionId', ANSWER: 'answerId', PROJECT: 'projectId' } as const;

@Injectable()
export class ModerationService {
  constructor(private readonly database: DatabaseService, private readonly limiter: RateLimiter) {}

  /** Le déclarant vient de la session ; la cible doit exister et être publique. Le signalement ne change pas la visibilité. */
  async report(user: AuthenticatedUser, input: CreateReportDto): Promise<CreatedReportDto> {
    this.limiter.consume(`report:${user.id}`, 20, HOUR);
    const target = { type: input.targetType, id: input.targetId.toLowerCase() };
    const authorId = await this.publicAuthor(target);
    if (!authorId) throw targetNotFound();
    if (authorId === user.id) throw new ApiException(403, 'SELF_REPORT_FORBIDDEN', 'Tu ne peux pas signaler ton propre contenu.');
    const column = targetColumn[target.type];
    const exists = await this.database.prisma.report.count({ where: { reporterId: user.id, status: 'OPEN', [column]: target.id } });
    if (exists) throw alreadyOpen();
    try {
      const report = await this.database.prisma.report.create({ data: { reporterId: user.id, reason: cleanText(input.reason), [column]: target.id }, select: { id: true, createdAt: true } });
      return { id: report.id, status: 'OPEN', targetType: target.type, targetId: target.id, createdAt: report.createdAt.toISOString() };
    } catch (error) {
      // Index unique partiel : deux envois simultanés ne créent qu'un signalement ouvert.
      if (isUniqueViolation(error)) throw alreadyOpen();
      throw error;
    }
  }

  async reports(query: ReportQueryDto): Promise<Page<ReportDto>> {
    const { page, pageSize, skip, take } = pageWindow(query);
    const where: Prisma.ReportWhereInput = { status: query.status };
    const [total, rows] = await this.database.prisma.$transaction([
      this.database.prisma.report.count({ where }),
      this.database.prisma.report.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip, take, select: reportSelect })
    ]);
    return { data: rows.map(toReport), meta: { page, pageSize, total } };
  }

  async reportDetail(id: string): Promise<ReportDetailDto> {
    const row = await this.database.prisma.report.findUnique({ where: { id }, select: reportSelect });
    if (!row) throw reportNotFound();
    const report = toReport(row);
    const column = targetColumn[report.target.type];
    const [openReportsOnTarget, history] = await Promise.all([
      this.database.prisma.report.count({ where: { status: 'OPEN', [column]: report.target.id } }),
      this.database.prisma.moderationAction.findMany({ where: { OR: [{ [column]: report.target.id }, { targetUserId: report.target.author.id }] }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 50, select: actionSelect })
    ]);
    return { ...report, openReportsOnTarget, history: history.map(toAction) };
  }

  /**
   * Décision et clôture dans la même transaction. Le signalement est verrouillé : deux administrateurs qui décident en même
   * temps produisent une seule décision, le second reçoit 409. Le compte suspendu est l'auteur de la cible, jamais un identifiant fourni.
   */
  async resolve(admin: AuthenticatedUser, id: string, input: ResolveReportDto): Promise<ReportDetailDto> {
    const reason = cleanText(input.reason);
    await this.database.prisma.$transaction(async tx => {
      const [locked] = await tx.$queryRaw<{ status: string }[]>`SELECT status::text AS status FROM "Report" WHERE id = ${id}::uuid FOR UPDATE`;
      if (!locked) throw reportNotFound();
      if (locked.status !== 'OPEN') throw new ApiException(409, 'REPORT_ALREADY_CLOSED', 'Ce signalement a déjà été traité.');
      const report = await tx.report.findUniqueOrThrow({ where: { id }, select: { questionId: true, answerId: true, projectId: true } });
      const target = contentTargetOf(report);
      const authorId = await this.authorOf(tx, target);
      if (input.decision === 'HIDE_CONTENT') await this.hide(tx, target, true);
      if (input.decision === 'SUSPEND_ACCOUNT') await this.suspend(tx, authorId, true);
      await tx.moderationAction.create({ data: { adminId: admin.id, decision: input.decision, reason, reportId: id, ...actionTarget(input.decision, target, authorId) } });
      await tx.report.update({ where: { id }, data: { status: 'CLOSED', decision: input.decision, closedById: admin.id, closedAt: new Date() } });
    });
    return this.reportDetail(id);
  }

  /** Action directe motivée, hors signalement. Une action sans effet (déjà masqué, déjà suspendu) est refusée en 409. */
  async act(admin: AuthenticatedUser, input: DirectActionDto): Promise<ModerationActionDto> {
    const reason = cleanText(input.reason);
    const targetId = input.targetId.toLowerCase();
    if ((input.decision === 'SUSPEND_ACCOUNT') !== (input.targetType === 'USER')) {
      throw new ApiException(400, 'VALIDATION_ERROR', 'Certaines données sont invalides.', { fieldErrors: { targetType: ['Cible incompatible avec l’action.'] } });
    }
    const id = await this.database.prisma.$transaction(async tx => {
      if (input.targetType === 'USER') {
        await this.suspend(tx, targetId, false);
        return (await tx.moderationAction.create({ data: { adminId: admin.id, decision: 'SUSPEND_ACCOUNT', reason, targetUserId: targetId }, select: { id: true } })).id;
      }
      const target = { type: input.targetType, id: targetId };
      await this.hide(tx, target, false);
      return (await tx.moderationAction.create({ data: { adminId: admin.id, decision: 'HIDE_CONTENT', reason, [targetColumn[target.type]]: target.id }, select: { id: true } })).id;
    });
    return toAction(await this.database.prisma.moderationAction.findUniqueOrThrow({ where: { id }, select: actionSelect }));
  }

  async actions(query: PageQueryDto): Promise<Page<ModerationActionDto>> {
    const { page, pageSize, skip, take } = pageWindow(query);
    const [total, rows] = await this.database.prisma.$transaction([
      this.database.prisma.moderationAction.count(),
      this.database.prisma.moderationAction.findMany({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip, take, select: actionSelect })
    ]);
    return { data: rows.map(toAction), meta: { page, pageSize, total } };
  }

  /**
   * Masquage. La question concernée est verrouillée comme lors du choix d'une solution : masquer la réponse acceptée
   * retire la solution dans la même transaction, et une acceptation concurrente ne peut pas la rétablir.
   */
  private async hide(tx: Tx, target: ContentTarget, tolerateHidden: boolean): Promise<void> {
    const already = () => { if (!tolerateHidden) throw new ApiException(409, 'ALREADY_HIDDEN', 'Ce contenu est déjà masqué.'); };
    if (target.type === 'QUESTION') {
      const [question] = await tx.$queryRaw<{ visibility: string }[]>`SELECT visibility::text AS visibility FROM "Question" WHERE id = ${target.id}::uuid FOR UPDATE`;
      if (!question) throw targetNotFound();
      if (question.visibility === 'HIDDEN') return already();
      await tx.question.update({ where: { id: target.id }, data: { visibility: 'HIDDEN' } });
    } else if (target.type === 'ANSWER') {
      const answer = await tx.answer.findUnique({ where: { id: target.id }, select: { questionId: true } });
      if (!answer) throw targetNotFound();
      await tx.$queryRaw`SELECT id FROM "Question" WHERE id = ${answer.questionId}::uuid FOR UPDATE`;
      const { count } = await tx.answer.updateMany({ where: { id: target.id, visibility: 'VISIBLE' }, data: { visibility: 'HIDDEN' } });
      if (count === 0) return already();
      await tx.question.updateMany({ where: { id: answer.questionId, acceptedAnswerId: target.id }, data: { acceptedAnswerId: null } });
    } else {
      const { count } = await tx.project.updateMany({ where: { id: target.id, visibility: 'VISIBLE' }, data: { visibility: 'HIDDEN' } });
      if (count === 0) {
        if (!await tx.project.count({ where: { id: target.id } })) throw targetNotFound();
        return already();
      }
    }
  }

  /** Suspension : statut relu à chaque requête et sessions révoquées, l'effet est immédiat. Ses contenus restent visibles. */
  private async suspend(tx: Tx, userId: string, tolerateSuspended: boolean): Promise<void> {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { role: true, status: true } });
    if (!user) throw targetNotFound();
    if (user.role === 'ADMIN') throw new ApiException(409, 'CANNOT_SUSPEND_ADMIN', 'Un administrateur ne peut pas être suspendu par cette procédure.');
    if (user.status === 'SUSPENDED') {
      if (!tolerateSuspended) throw new ApiException(409, 'ALREADY_SUSPENDED', 'Ce compte est déjà suspendu.');
    } else {
      await tx.user.update({ where: { id: userId }, data: { status: 'SUSPENDED' } });
    }
    await tx.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  private async authorOf(tx: Tx, target: ContentTarget): Promise<string> {
    if (target.type === 'QUESTION') return (await tx.question.findUniqueOrThrow({ where: { id: target.id }, select: { authorId: true } })).authorId;
    if (target.type === 'ANSWER') return (await tx.answer.findUniqueOrThrow({ where: { id: target.id }, select: { authorId: true } })).authorId;
    return (await tx.project.findUniqueOrThrow({ where: { id: target.id }, select: { ownerId: true } })).ownerId;
  }

  private async publicAuthor(target: ContentTarget): Promise<string | null> {
    const prisma = this.database.prisma;
    if (target.type === 'QUESTION') return (await prisma.question.findFirst({ where: { id: target.id, visibility: 'VISIBLE' }, select: { authorId: true } }))?.authorId ?? null;
    if (target.type === 'ANSWER') return (await prisma.answer.findFirst({ where: { id: target.id, visibility: 'VISIBLE', question: { visibility: 'VISIBLE' } }, select: { authorId: true } }))?.authorId ?? null;
    return (await prisma.project.findFirst({ where: { id: target.id, visibility: 'VISIBLE' }, select: { ownerId: true } }))?.ownerId ?? null;
  }
}

function alreadyOpen() { return new ApiException(409, 'REPORT_ALREADY_OPEN', 'Tu as déjà signalé ce contenu ; il est en cours d’examen.'); }

function contentTargetOf(row: { questionId: string | null; answerId: string | null; projectId: string | null }): ContentTarget {
  if (row.questionId) return { type: 'QUESTION', id: row.questionId };
  if (row.answerId) return { type: 'ANSWER', id: row.answerId };
  return { type: 'PROJECT', id: row.projectId as string };
}

/** Cible enregistrée dans l'historique : le compte pour une suspension, le contenu sinon (contrainte CHECK en base). */
function actionTarget(decision: Decision, target: ContentTarget, authorId: string) {
  return decision === 'SUSPEND_ACCOUNT' ? { targetUserId: authorId } : { [targetColumn[target.type]]: target.id };
}

function toReport(row: ReportRow): ReportDto {
  let target: ReportTargetDto;
  if (row.question) target = { type: 'QUESTION', id: row.question.id, title: row.question.title, excerpt: excerptOf(row.question.context, 500), visibility: row.question.visibility, author: row.question.author, questionId: null };
  else if (row.answer) target = { type: 'ANSWER', id: row.answer.id, title: row.answer.question.title, excerpt: excerptOf(row.answer.body, 500), visibility: row.answer.visibility, author: row.answer.author, questionId: row.answer.questionId };
  else if (row.project) target = { type: 'PROJECT', id: row.project.id, title: row.project.title, excerpt: excerptOf(row.project.objective, 500), visibility: row.project.visibility, author: row.project.owner, questionId: null };
  else throw new Error('Signalement sans cible.');
  return {
    id: row.id, status: row.status, reason: row.reason, reporter: row.reporter, target, decision: row.decision, closedBy: row.closedBy,
    closedAt: row.closedAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString()
  };
}

function toAction(row: ActionRow): ModerationActionDto {
  const target = row.targetUserId ? { type: 'USER' as const, id: row.targetUserId } : contentTargetOf(row);
  return { id: row.id, decision: row.decision, reason: row.reason, admin: row.admin, reportId: row.reportId, target, createdAt: row.createdAt.toISOString() };
}
