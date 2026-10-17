import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type { Prisma } from '../../generated/prisma/client';

/** Barème Teranga Points proposé : points pour une réponse acceptée par l'auteur d'une autre personne. À valider par l'équipe. */
export const POINTS_PER_ACCEPTED_ANSWER = 10;

/**
 * Règle : l'auteur d'une réponse détient POINTS_PER_ACCEPTED_ANSWER points pour une question si et seulement si cette
 * réponse est la solution actuelle, que la question et la réponse sont visibles, et que la réponse n'est pas de l'auteur
 * de la question. Après chaque changement, le registre est complété par le mouvement exact qui fait correspondre la somme
 * à cette règle. Répéter une acceptation n'écrit donc rien ; un cycle accepter, retirer, réaccepter revient au même score.
 *
 * Doit être appelé dans la transaction qui modifie la solution ou la visibilité, après le verrou de la question.
 */
@Injectable()
export class ReputationService {
  constructor(private readonly database: DatabaseService) {}

  async syncQuestion(tx: Prisma.TransactionClient, questionId: string): Promise<void> {
    const question = await tx.question.findUnique({
      where: { id: questionId },
      select: { authorId: true, visibility: true, acceptedAnswerId: true, acceptedAnswer: { select: { authorId: true, visibility: true } } }
    });
    if (!question) return;
    const desired = new Map<string, { userId: string; points: number }>();
    const accepted = question.acceptedAnswer;
    if (question.acceptedAnswerId && accepted && question.visibility === 'VISIBLE' && accepted.visibility === 'VISIBLE' && accepted.authorId !== question.authorId) {
      desired.set(question.acceptedAnswerId, { userId: accepted.authorId, points: POINTS_PER_ACCEPTED_ANSWER });
    }
    const ledger = await tx.reputationEvent.groupBy({ by: ['answerId', 'userId'], where: { questionId }, _sum: { delta: true }, _max: { sequence: true }, orderBy: { answerId: 'asc' } });
    const answers = new Set([...desired.keys(), ...ledger.map(row => row.answerId)]);
    for (const answerId of answers) {
      const current = ledger.find(row => row.answerId === answerId);
      const target = desired.get(answerId);
      const delta = (target?.points ?? 0) - (current?._sum.delta ?? 0);
      if (delta === 0) continue;
      const userId = target?.userId ?? current?.userId;
      if (!userId) continue;
      await tx.reputationEvent.create({ data: { userId, questionId, answerId, delta, reason: delta > 0 ? 'ANSWER_ACCEPTED' : 'ACCEPTANCE_WITHDRAWN', sequence: (current?._max.sequence ?? 0) + 1 } });
    }
  }

  async score(userId: string): Promise<number> {
    const { _sum } = await this.database.prisma.reputationEvent.aggregate({ where: { userId }, _sum: { delta: true } });
    return _sum.delta ?? 0;
  }
}
