import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type { AccountTokenPurpose, Prisma } from '../../generated/prisma/client';
import { hashToken, isTokenFormat, newToken } from './tokens';

type Db = Prisma.TransactionClient;

@Injectable()
export class AccountTokensService {
  constructor(private readonly database: DatabaseService) {}

  /** Émet un jeton à usage unique et invalide les jetons précédents de même usage : seul le dernier lien envoyé reste valable. */
  async issue(userId: string, purpose: AccountTokenPurpose, ttlMs: number): Promise<string> {
    const { token, hash } = newToken();
    await this.database.prisma.$transaction([
      this.database.prisma.accountToken.updateMany({ where: { userId, purpose, consumedAt: null }, data: { consumedAt: new Date() } }),
      this.database.prisma.accountToken.create({ data: { tokenHash: hash, userId, purpose, expiresAt: new Date(Date.now() + ttlMs) } })
    ]);
    return token;
  }

  /** Consommation atomique : deux requêtes concurrentes avec le même jeton ne peuvent réussir toutes les deux. */
  async consume(token: string, purpose: AccountTokenPurpose, db: Db): Promise<string | undefined> {
    if (!isTokenFormat(token)) return undefined;
    const record = await db.accountToken.findUnique({ where: { tokenHash: hashToken(token) }, select: { id: true, userId: true, purpose: true } });
    if (!record || record.purpose !== purpose) return undefined;
    const { count } = await db.accountToken.updateMany({ where: { id: record.id, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } });
    return count === 1 ? record.userId : undefined;
  }
}
