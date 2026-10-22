import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type { Prisma, ReputationReason } from '../../generated/prisma/client';

/** Barème de travail du lot 19, uniquement côté serveur. */
export const POINTS_PER_ACCEPTED_ANSWER = 10;
// Same two-key advisory lock in every schema: rebuild excludes normal reputation mutations.
// Acquire BEFORE any question row lock. Rebuild never locks reports or users.
const LOCK_NAMESPACE = 1949387571;
const LOCK_ID = 19;

@Injectable()
export class ReputationService {
  constructor(private readonly database: DatabaseService) {}

  async lockMutation(tx: Prisma.TransactionClient): Promise<void> {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock_shared(${LOCK_NAMESPACE}::int, ${LOCK_ID}::int)::text`;
  }

  /** Caller holds the mutation/rebuild gate and the question FOR UPDATE lock. */
  async syncQuestion(tx: Prisma.TransactionClient, questionId: string, reason: ReputationReason = 'ACCEPTANCE_WITHDRAWN'): Promise<number> {
    const question = await tx.question.findUnique({ where: { id: questionId }, select: {
      authorId: true, visibility: true, deletedAt: true, acceptedAnswerId: true,
      acceptedAnswer: { select: { questionId: true, authorId: true, visibility: true } }
    } });
    if (!question) return 0;
    const accepted = question.acceptedAnswer;
    const desired = new Map<string, { answerId: string; userId: string; points: number }>();
    const key = (answer: string, user: string) => answer + ':' + user;
    if (!question.deletedAt && question.visibility === 'VISIBLE' && question.acceptedAnswerId && accepted && accepted.questionId === questionId && accepted.visibility === 'VISIBLE' && accepted.authorId !== question.authorId) {
      desired.set(key(question.acceptedAnswerId, accepted.authorId), { answerId: question.acceptedAnswerId, userId: accepted.authorId, points: POINTS_PER_ACCEPTED_ANSWER });
    }
    const rows = await tx.reputationEvent.groupBy({ by: ['answerId', 'userId'], where: { questionId }, _sum: { delta: true }, _max: { sequence: true }, orderBy: [{ answerId: 'asc' }, { userId: 'asc' }] });
    const movements = new Map(rows.map(r => [key(r.answerId,r.userId), { answerId:r.answerId, userId:r.userId, points:r._sum.delta ?? 0 }]));
    const sequences = new Map<string,number>();
    for (const r of rows) sequences.set(r.answerId, Math.max(sequences.get(r.answerId) ?? 0, r._max.sequence ?? 0));
    let written = 0;
    const changes = [...new Set([...movements.keys(), ...desired.keys()])].map(k => {
      const current = movements.get(k), target = desired.get(k), contribution = target ?? current!;
      const delta = (target?.points ?? 0) - (current?.points ?? 0);
      return {contribution,delta};
    }).sort((a,b)=>a.delta-b.delta);
    // Compensations precede new awards, all inside the same transaction.
    for (const {contribution,delta} of changes) {
      if (!delta) continue;
      const sequence = (sequences.get(contribution.answerId) ?? 0) + 1;
      await tx.reputationEvent.create({ data: { questionId, answerId:contribution.answerId, userId:contribution.userId, delta, sequence,
        reason:reason === 'RECONCILIATION' ? reason : delta > 0 ? 'ANSWER_ACCEPTED' : reason } });
      sequences.set(contribution.answerId, sequence); written++;
    }
    return written;
  }

  async score(userId: string): Promise<number> {
    const result = await this.database.prisma.reputationEvent.aggregate({ where: { userId }, _sum: { delta: true } });
    return result._sum.delta ?? 0;
  }

  /** Explicit offline maintenance; one atomic run, no rewritten historical event. */
  async rebuild(): Promise<{ questions: number; eventsWritten: number }> {
    return this.database.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(${LOCK_NAMESPACE}::int, ${LOCK_ID}::int)::text`;
      const questions = await tx.question.findMany({ where: { OR: [{ acceptedAnswerId: { not: null } }, { reputation: { some: {} } }] }, select: { id:true }, orderBy:{id:'asc'} });
      let eventsWritten = 0;
      for (const {id} of questions) {
        await tx.$queryRaw`SELECT id FROM "Question" WHERE id=${id}::uuid FOR UPDATE`;
        eventsWritten += await this.syncQuestion(tx,id,'RECONCILIATION');
      }
      return { questions:questions.length, eventsWritten };
    }, {timeout:120000, maxWait:10000});
  }
}
