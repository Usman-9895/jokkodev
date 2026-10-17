import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type { Prisma } from '../../generated/prisma/client';
import type { AuthContext } from '../../common/auth/auth-context';
import { SESSION_ABSOLUTE_MS, SESSION_IDLE_MS, SESSION_TOUCH_MS } from './auth.constants';
import { hashToken, isTokenFormat, newToken } from './tokens';

type Db = Prisma.TransactionClient;

@Injectable()
export class SessionsService {
  constructor(private readonly database: DatabaseService) {}

  async create(userId: string, db: Db = this.database.prisma): Promise<string> {
    const { token, hash } = newToken();
    await db.session.create({ data: { tokenHash: hash, userId, expiresAt: new Date(Date.now() + SESSION_ABSOLUTE_MS) } });
    return token;
  }

  /** Session active d'un compte actif, ou undefined. Une session expirée, révoquée, inactive ou suspendue n'ouvre aucun droit. */
  async resolve(token: string): Promise<AuthContext | undefined> {
    if (!isTokenFormat(token)) return undefined;
    const now = Date.now();
    const session = await this.database.prisma.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: { select: { id: true, username: true, email: true, role: true, status: true, emailVerifiedAt: true } } } });
    if (!session || session.revokedAt || session.expiresAt.getTime() <= now || session.lastSeenAt.getTime() <= now - SESSION_IDLE_MS) return undefined;
    if (session.user.status !== 'ACTIVE') return undefined;
    if (session.lastSeenAt.getTime() <= now - SESSION_TOUCH_MS) await this.database.prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date(now) } });
    return { user: session.user, sessionId: session.id };
  }

  async revoke(sessionId: string): Promise<void> {
    await this.database.prisma.session.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  async revokeAll(userId: string, db: Db = this.database.prisma): Promise<void> {
    await db.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }
}
