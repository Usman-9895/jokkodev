import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type { Prisma } from '../../generated/prisma/client';
import type { AuthenticatedUser } from '../../common/auth/auth-context';
import { ApiException } from '../../common/http/api-exception';
import { type Page, pageWindow, type PageQueryDto } from '../../common/http/pagination';
import { cleanText, excerptOf, likeContains } from '../../common/http/text';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service';
import { technologySelect } from '../technologies/technologies.dto';
import { TechnologiesService } from '../technologies/technologies.service';
import { technologyFilter } from '../technologies/technology-filter';
import { publicAuthorSelect, toPublicAuthor } from '../users/projections';
import { QUESTION_BODY_MAX, type AnswerDto, type AnswerWithQuestionDto, type CreateAnswerDto, type CreateQuestionDto, type OwnQuestionQueryDto, type OwnQuestionSummaryDto, type QuestionDetailDto, type QuestionListQueryDto, type QuestionSummaryDto, type UpdateAnswerDto, type UpdateQuestionDto } from './questions.dto';

const HOUR = 60 * 60 * 1000;
const answerSelect = { id: true, questionId: true, body: true, code: true, codeLanguage: true, createdAt: true, updatedAt: true, author: { select: publicAuthorSelect } } as const;
const summarySelect = {
  id: true, title: true, context: true, acceptedAnswerId: true, visibility: true, createdAt: true, updatedAt: true,
  author: { select: publicAuthorSelect },
  technologies: { select: { technology: { select: technologySelect } }, orderBy: { technology: { name: 'asc' } } },
  _count: { select: { answers: { where: { visibility: 'VISIBLE' } } } }
} as const satisfies Prisma.QuestionSelect;
const detailSelect = { ...summarySelect, authorId: true, expected: true, actual: true, attempts: true, code: true, codeLanguage: true, acceptedAnswer: { select: answerSelect } } as const satisfies Prisma.QuestionSelect;

type SummaryRow = Prisma.QuestionGetPayload<{ select: typeof summarySelect }>;
type DetailRow = Prisma.QuestionGetPayload<{ select: typeof detailSelect }>;
type AnswerRow = Prisma.AnswerGetPayload<{ select: typeof answerSelect }>;

const notFound = () => new ApiException(404, 'QUESTION_NOT_FOUND', 'Question introuvable.');
const answerNotFound = () => new ApiException(404, 'ANSWER_NOT_FOUND', 'Réponse introuvable.');
const notAuthor = () => new ApiException(403, 'NOT_AUTHOR', 'Seul l’auteur peut effectuer cette action.');

@Injectable()
export class QuestionsService {
  constructor(private readonly database: DatabaseService, private readonly technologies: TechnologiesService, private readonly limiter: RateLimiter) {}

  async list(query: QuestionListQueryDto): Promise<Page<QuestionSummaryDto>> {
    const words = (query.q ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 8);
    const where: Prisma.QuestionWhereInput = {
      visibility: 'VISIBLE',
      AND: words.map(word => {
        const contains = { contains: likeContains(word), mode: 'insensitive' as const };
        return { OR: [{ title: contains }, { context: contains }, { expected: contains }, { actual: contains }, { attempts: contains }, { author: { username: contains } }, { technologies: { some: { technology: { name: contains } } } }] };
      }),
      technologies: technologyFilter(query.technology),
      acceptedAnswerId: resolvedFilter(query.status)
    };
    return this.page(where, query, row => this.toSummary(row));
  }

  async listByAuthor(userId: string, query: PageQueryDto): Promise<Page<QuestionSummaryDto>> {
    await this.assertUserExists(userId);
    return this.page({ authorId: userId, visibility: 'VISIBLE' }, query, row => this.toSummary(row));
  }

  /** Questions de l'auteur connecté, y compris celles masquées par la modération (signalées par visibility). */
  listOwn(userId: string, query: OwnQuestionQueryDto): Promise<Page<OwnQuestionSummaryDto>> {
    const where: Prisma.QuestionWhereInput = { authorId: userId, acceptedAnswerId: resolvedFilter(query.status) };
    return this.page(where, query, row => ({ ...this.toSummary(row), visibility: row.visibility }));
  }

  async detail(id: string, viewer?: AuthenticatedUser): Promise<QuestionDetailDto> {
    const question = await this.database.prisma.question.findFirst({ where: { id, visibility: 'VISIBLE' }, select: detailSelect });
    if (!question) throw notFound();
    return this.toDetail(question, viewer);
  }

  async create(user: AuthenticatedUser, input: CreateQuestionDto): Promise<QuestionDetailDto> {
    this.limiter.consume(`question:${user.id}`, 10, HOUR);
    const content = { title: cleanText(input.title), context: cleanText(input.context), expected: cleanText(input.expected), actual: cleanText(input.actual), attempts: cleanText(input.attempts), ...codeFields(undefined, input) };
    assertBodyLength(content);
    await this.technologies.assertExist(input.technologyIds, 'technologyIds');
    const question = await this.database.prisma.question.create({
      data: { ...content, authorId: user.id, technologies: { create: input.technologyIds.map(technologyId => ({ technologyId })) } },
      select: detailSelect
    });
    return this.toDetail(question, user);
  }

  async update(user: AuthenticatedUser, id: string, input: UpdateQuestionDto): Promise<QuestionDetailDto> {
    const current = await this.database.prisma.question.findFirst({ where: { id, visibility: 'VISIBLE' }, select: { authorId: true, context: true, expected: true, actual: true, attempts: true, code: true, codeLanguage: true } });
    if (!current) throw notFound();
    if (current.authorId !== user.id) throw notAuthor();
    const changes = {
      title: input.title === undefined ? undefined : cleanText(input.title),
      context: input.context === undefined ? undefined : cleanText(input.context),
      expected: input.expected === undefined ? undefined : cleanText(input.expected),
      actual: input.actual === undefined ? undefined : cleanText(input.actual),
      attempts: input.attempts === undefined ? undefined : cleanText(input.attempts),
      ...codeFields(current, input)
    };
    assertBodyLength({ context: changes.context ?? current.context, expected: changes.expected ?? current.expected, actual: changes.actual ?? current.actual, attempts: changes.attempts ?? current.attempts });
    if (input.technologyIds) await this.technologies.assertExist(input.technologyIds, 'technologyIds');
    await this.database.prisma.$transaction(async tx => {
      await tx.question.update({ where: { id }, data: changes });
      if (input.technologyIds) {
        await tx.questionTechnology.deleteMany({ where: { questionId: id } });
        await tx.questionTechnology.createMany({ data: input.technologyIds.map(technologyId => ({ questionId: id, technologyId })) });
      }
    });
    return this.detail(id, user);
  }

  async answers(questionId: string, query: PageQueryDto): Promise<Page<AnswerDto>> {
    const question = await this.database.prisma.question.findFirst({ where: { id: questionId, visibility: 'VISIBLE' }, select: { acceptedAnswerId: true } });
    if (!question) throw notFound();
    const { page, pageSize, skip, take } = pageWindow(query);
    const where: Prisma.AnswerWhereInput = { questionId, visibility: 'VISIBLE' };
    const [total, rows] = await this.database.prisma.$transaction([
      this.database.prisma.answer.count({ where }),
      this.database.prisma.answer.findMany({ where, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], skip, take, select: answerSelect })
    ]);
    return { data: rows.map(row => toAnswer(row, question.acceptedAnswerId)), meta: { page, pageSize, total } };
  }

  /** Réponses visibles d'un membre, uniquement sur des questions visibles. */
  async answersByAuthor(userId: string, query: PageQueryDto): Promise<Page<AnswerWithQuestionDto>> {
    await this.assertUserExists(userId);
    const { page, pageSize, skip, take } = pageWindow(query);
    const where: Prisma.AnswerWhereInput = { authorId: userId, visibility: 'VISIBLE', question: { visibility: 'VISIBLE' } };
    const [total, rows] = await this.database.prisma.$transaction([
      this.database.prisma.answer.count({ where }),
      this.database.prisma.answer.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip, take, select: { ...answerSelect, question: { select: { title: true, acceptedAnswerId: true } } } })
    ]);
    return { data: rows.map(row => ({ ...toAnswer(row, row.question.acceptedAnswerId), questionTitle: row.question.title })), meta: { page, pageSize, total } };
  }

  async createAnswer(user: AuthenticatedUser, questionId: string, input: CreateAnswerDto): Promise<AnswerDto> {
    this.limiter.consume(`answer:${user.id}`, 30, HOUR);
    const question = await this.database.prisma.question.findFirst({ where: { id: questionId, visibility: 'VISIBLE' }, select: { id: true } });
    if (!question) throw notFound();
    const answer = await this.database.prisma.answer.create({ data: { questionId, authorId: user.id, body: cleanText(input.body), ...codeFields(undefined, input) }, select: answerSelect });
    return toAnswer(answer, null);
  }

  async updateAnswer(user: AuthenticatedUser, answerId: string, input: UpdateAnswerDto): Promise<AnswerDto> {
    const answer = await this.database.prisma.answer.findFirst({ where: { id: answerId, visibility: 'VISIBLE', question: { visibility: 'VISIBLE' } }, select: { authorId: true, code: true, codeLanguage: true, question: { select: { acceptedAnswerId: true } } } });
    if (!answer) throw answerNotFound();
    if (answer.authorId !== user.id) throw notAuthor();
    const updated = await this.database.prisma.answer.update({
      where: { id: answerId },
      data: { body: input.body === undefined ? undefined : cleanText(input.body), ...codeFields(answer, input) },
      select: answerSelect
    });
    return toAnswer(updated, answer.question.acceptedAnswerId);
  }

  /**
   * Choix de la solution. La ligne de la question est verrouillée pendant la transaction : deux acceptations simultanées,
   * ou une acceptation concurrente d'un masquage, s'exécutent l'une après l'autre et laissent une seule solution valide.
   */
  async accept(user: AuthenticatedUser, questionId: string, answerId: string): Promise<QuestionDetailDto> {
    await this.database.prisma.$transaction(async tx => {
      await this.lockOwnQuestion(tx, user, questionId);
      const answer = await tx.answer.findUnique({ where: { id: answerId }, select: { questionId: true, visibility: true } });
      if (!answer || answer.questionId !== questionId || answer.visibility !== 'VISIBLE') {
        throw new ApiException(400, 'ANSWER_NOT_ELIGIBLE', 'Cette réponse ne peut pas être acceptée pour cette question.', { fieldErrors: { answerId: ['Réponse inconnue, masquée ou d’une autre question.'] } });
      }
      await tx.question.update({ where: { id: questionId }, data: { acceptedAnswerId: answerId } });
    });
    return this.detail(questionId, user);
  }

  async unaccept(user: AuthenticatedUser, questionId: string): Promise<QuestionDetailDto> {
    await this.database.prisma.$transaction(async tx => {
      await this.lockOwnQuestion(tx, user, questionId);
      await tx.question.update({ where: { id: questionId }, data: { acceptedAnswerId: null } });
    });
    return this.detail(questionId, user);
  }

  private async lockOwnQuestion(tx: Prisma.TransactionClient, user: AuthenticatedUser, questionId: string): Promise<void> {
    const [question] = await tx.$queryRaw<{ authorId: string; visibility: string }[]>`SELECT "authorId", visibility::text AS visibility FROM "Question" WHERE id = ${questionId}::uuid FOR UPDATE`;
    if (!question || question.visibility !== 'VISIBLE') throw notFound();
    if (question.authorId !== user.id) throw notAuthor();
  }

  private async page<T>(where: Prisma.QuestionWhereInput, query: PageQueryDto, map: (row: SummaryRow) => T): Promise<Page<T>> {
    const { page, pageSize, skip, take } = pageWindow(query);
    const [total, rows] = await this.database.prisma.$transaction([
      this.database.prisma.question.count({ where }),
      this.database.prisma.question.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip, take, select: summarySelect })
    ]);
    return { data: rows.map(map), meta: { page, pageSize, total } };
  }

  private async assertUserExists(userId: string): Promise<void> {
    if (!await this.database.prisma.user.findUnique({ where: { id: userId }, select: { id: true } })) throw new ApiException(404, 'USER_NOT_FOUND', 'Profil introuvable.');
  }

  private toSummary(row: SummaryRow): QuestionSummaryDto {
    return {
      id: row.id, title: row.title, excerpt: excerptOf(row.context), author: toPublicAuthor(row.author), technologies: row.technologies.map(t => t.technology),
      resolved: row.acceptedAnswerId !== null, answerCount: row._count.answers, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString()
    };
  }

  private toDetail(row: DetailRow, viewer?: AuthenticatedUser): QuestionDetailDto {
    return {
      ...this.toSummary(row), context: row.context, expected: row.expected, actual: row.actual, attempts: row.attempts, code: row.code, codeLanguage: row.codeLanguage,
      acceptedAnswerId: row.acceptedAnswerId, acceptedAnswer: row.acceptedAnswer ? toAnswer(row.acceptedAnswer, row.acceptedAnswerId) : null,
      viewerIsAuthor: viewer?.id === row.authorId
    };
  }
}

function resolvedFilter(status: 'all' | 'resolved' | 'open' | undefined) {
  return status === 'resolved' ? { not: null } : status === 'open' ? null : undefined;
}

function toAnswer(row: AnswerRow, acceptedAnswerId: string | null): AnswerDto {
  return { id: row.id, questionId: row.questionId, author: toPublicAuthor(row.author), body: row.body, code: row.code, codeLanguage: row.codeLanguage, accepted: row.id === acceptedAnswerId, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

/**
 * Extrait de code et son langage. Un champ absent reste inchangé ; sans code, le langage est effacé
 * (contrainte CHECK en base). Le code est conservé tel quel, indentation comprise.
 */
function codeFields(current: { code: string | null; codeLanguage: string | null } | undefined, input: { code?: string | null; codeLanguage?: string | null }): { code?: string | null; codeLanguage?: string | null } {
  const code = input.code === undefined ? current?.code ?? null : input.code?.trim() ? input.code : null;
  const language = input.codeLanguage === undefined ? current?.codeLanguage ?? null : input.codeLanguage?.trim() || null;
  if (current && input.code === undefined && input.codeLanguage === undefined) return {};
  return { code, codeLanguage: code === null ? null : language };
}

function assertBodyLength(content: { context: string; expected: string; actual: string; attempts: string }): void {
  const total = content.context.length + content.expected.length + content.actual.length + content.attempts.length;
  if (total > QUESTION_BODY_MAX) throw new ApiException(400, 'VALIDATION_ERROR', 'Certaines données sont invalides.', { fieldErrors: { context: [`Les quatre rubriques dépassent ${QUESTION_BODY_MAX} caractères au total.`] } });
}
