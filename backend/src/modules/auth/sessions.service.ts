import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type { Prisma } from '../../generated/prisma/client';
import type { AuthContext } from '../../common/auth/auth-context';
import { SESSION_ABSOLUTE_MS, SESSION_IDLE_MS, SESSION_TOUCH_MS } from './auth.constants';
import { hashToken, isTokenFormat, newToken } from './tokens';
import { ApiException } from '../../common/http/api-exception';

type Db = Prisma.TransactionClient;

@Injectable()
export class SessionsService {
  constructor(private readonly database: DatabaseService) {}

  async create(userId: string, db: Db = this.database.prisma): Promise<string> {
    if(db===this.database.prisma)return this.database.prisma.$transaction(tx=>this.create(userId,tx));
    await db.$queryRaw`SELECT id FROM "User" WHERE id=${userId}::uuid FOR UPDATE`;
    const user=await db.user.findUnique({where:{id:userId},select:{status:true}});
    if(!user||user.status!=='ACTIVE')throw new ApiException(401,'UNAUTHORIZED','Compte indisponible.');
    // A successful login, not an authenticated page view, starts a new inactivity observation.
    await db.user.update({where:{id:userId},data:{lastLoginAt:new Date()}});
    await db.inactivityNotice.updateMany({where:{userId,state:{not:'CANCELLED'}},data:{state:'CANCELLED'}});
    const { token, hash } = newToken();
    await db.session.create({ data: { tokenHash: hash, userId, expiresAt: new Date(Date.now() + SESSION_ABSOLUTE_MS) } });
    return token;
  }

  /** Session active d'un compte actif, ou undefined. Une session expirée, révoquée, inactive ou suspendue n'ouvre aucun droit. */
  async resolve(token: string): Promise<AuthContext | undefined> {
    if (!isTokenFormat(token)) return undefined;
    return this.database.prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT id FROM "Session" WHERE "tokenHash"=${hashToken(token)} FOR UPDATE`;
    const now = Date.now();
    const session = await tx.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: { select: { id: true, avatarKey: true, username: true, email: true, role: true, status: true, emailVerifiedAt: true } } } });
    if (!session || session.revokedAt || session.expiresAt.getTime() <= now || session.lastSeenAt.getTime() <= now - SESSION_IDLE_MS) return undefined;
    if (session.user.status !== 'ACTIVE') return undefined;
    if (session.lastSeenAt.getTime() <= now - SESSION_TOUCH_MS) await tx.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date(now) } });
    return { user: session.user, sessionId: session.id };
    });
  }

  async revoke(sessionId: string): Promise<void> {
    await this.database.prisma.session.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  async revokeAll(userId: string, db: Db = this.database.prisma): Promise<void> {
    await db.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }
}
