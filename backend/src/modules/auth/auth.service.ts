import { Inject, Injectable } from '@nestjs/common';
import { ENVIRONMENT } from '../../config/config.module';
import type { Environment } from '../../config/environment';
import { DatabaseService } from '../../database/database.service';
import type { AuthenticatedUser } from '../../common/auth/auth-context';
import { isUniqueViolation } from '../../common/auth/prisma-errors';
import { ApiException } from '../../common/http/api-exception';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service';
import { MailService } from '../mail/mail.service';
import { passwordResetMail, verificationMail } from '../mail/templates';
import { normalizeEmail, usernameKey } from '../users/identity';
import { AccountTokensService } from './account-tokens.service';
import { EMAIL_VERIFICATION_TTL_MS, PASSWORD_RESET_TTL_MS } from './auth.constants';
import type { CurrentUserDto, ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from './dto/auth.dto';
import { PasswordService } from './passwords.service';
import { SessionsService } from './sessions.service';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const userSelect = { id: true, username: true, email: true, role: true, status: true, emailVerifiedAt: true, passwordHash: true } as const;

export function toCurrentUser(user: AuthenticatedUser): CurrentUserDto {
  return { id: user.id, username: user.username, email: user.email, role: user.role, emailVerified: user.emailVerifiedAt !== null };
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(ENVIRONMENT) private readonly env: Environment,
    private readonly database: DatabaseService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionsService,
    private readonly accountTokens: AccountTokensService,
    private readonly limiter: RateLimiter,
    private readonly mail: MailService
  ) {}

  async register(input: RegisterDto, ip: string): Promise<{ user: AuthenticatedUser; sessionToken: string }> {
    this.limiter.consume(`register:ip:${ip}`, 20, HOUR);
    const email = normalizeEmail(input.email);
    const key = usernameKey(input.username);
    await this.assertAvailable(email, key);
    const passwordHash = await this.passwords.hash(input.password);
    try {
      const { user, sessionToken } = await this.database.prisma.$transaction(async tx => {
        const user = await tx.user.create({ data: { email, username: input.username, usernameKey: key, passwordHash, profile: { create: {} } }, select: userSelect });
        return { user, sessionToken: await this.sessions.create(user.id, tx) };
      });
      await this.sendVerification(user);
      return { user, sessionToken };
    } catch (error) {
      // Inscription concurrente avec le même email ou pseudonyme : la contrainte d'unicité tranche.
      if (isUniqueViolation(error)) await this.assertAvailable(email, key);
      throw error;
    }
  }

  async login(input: LoginDto, ip: string): Promise<{ user: AuthenticatedUser; sessionToken: string }> {
    const email = normalizeEmail(input.email);
    this.limiter.consume(`login:ip:${ip}`, 30, 15 * MINUTE);
    const accountKey = `login:account:${email}:${ip}`;
    this.limiter.consume(accountKey, 5, 15 * MINUTE);
    const user = await this.database.prisma.user.findUnique({ where: { email }, select: userSelect });
    if (!await this.passwords.verify(user?.passwordHash, input.password) || !user) throw new ApiException(401, 'INVALID_CREDENTIALS', 'Email ou mot de passe incorrect.');
    this.limiter.reset(accountKey);
    if (user.status !== 'ACTIVE') throw new ApiException(403, 'ACCOUNT_SUSPENDED', 'Ce compte est suspendu.');
    if (this.passwords.needsRehash(user.passwordHash)) await this.database.prisma.user.update({ where: { id: user.id }, data: { passwordHash: await this.passwords.hash(input.password) } });
    return { user, sessionToken: await this.sessions.create(user.id) };
  }

  async logout(sessionId: string | undefined): Promise<void> {
    if (sessionId) await this.sessions.revoke(sessionId);
  }

  /** Réponse identique que le compte existe ou non ; l'email part en arrière-plan. */
  async forgotPassword(input: ForgotPasswordDto, ip: string): Promise<void> {
    const email = normalizeEmail(input.email);
    this.limiter.consume(`forgot:ip:${ip}`, 10, HOUR);
    this.limiter.consume(`mail:${email}`, 3, HOUR);
    const user = await this.database.prisma.user.findUnique({ where: { email }, select: { id: true, username: true, email: true, status: true } });
    if (!user || user.status !== 'ACTIVE') return;
    const token = await this.accountTokens.issue(user.id, 'PASSWORD_RESET', PASSWORD_RESET_TTL_MS);
    this.mail.sendInBackground(passwordResetMail(user.email, user.username, this.link('/nouveau-mot-de-passe', token)), 'password_reset');
  }

  /** Change le mot de passe, confirme l'email (sa possession est prouvée) et ferme toutes les sessions du compte. */
  async resetPassword(input: ResetPasswordDto, ip: string): Promise<void> {
    this.limiter.consume(`reset:ip:${ip}`, 20, HOUR);
    const passwordHash = await this.passwords.hash(input.password);
    const done = await this.database.prisma.$transaction(async tx => {
      const userId = await this.accountTokens.consume(input.token, 'PASSWORD_RESET', tx);
      if (!userId) return false;
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { emailVerifiedAt: true } });
      await tx.user.update({ where: { id: userId }, data: { passwordHash, emailVerifiedAt: user.emailVerifiedAt ?? new Date() } });
      await this.sessions.revokeAll(userId, tx);
      return true;
    });
    if (!done) throw new ApiException(400, 'TOKEN_INVALID', 'Ce lien est invalide, expiré ou déjà utilisé.');
  }

  async verifyEmail(token: string, ip: string): Promise<void> {
    this.limiter.consume(`verify:ip:${ip}`, 20, HOUR);
    const done = await this.database.prisma.$transaction(async tx => {
      const userId = await this.accountTokens.consume(token, 'EMAIL_VERIFICATION', tx);
      if (!userId) return false;
      await tx.user.updateMany({ where: { id: userId, emailVerifiedAt: null }, data: { emailVerifiedAt: new Date() } });
      return true;
    });
    if (!done) throw new ApiException(400, 'TOKEN_INVALID', 'Ce lien est invalide, expiré ou déjà utilisé.');
  }

  async resendVerification(user: AuthenticatedUser): Promise<void> {
    if (user.emailVerifiedAt) return;
    this.limiter.consume(`mail:${user.email}`, 3, HOUR);
    await this.sendVerification(user);
  }

  private async sendVerification(user: Pick<AuthenticatedUser, 'id' | 'email' | 'username'>): Promise<void> {
    const token = await this.accountTokens.issue(user.id, 'EMAIL_VERIFICATION', EMAIL_VERIFICATION_TTL_MS);
    this.mail.sendInBackground(verificationMail(user.email, user.username, this.link('/verification-email', token)), 'email_verification');
  }

  private link(path: string, token: string): string {
    return `${this.env.appOrigin}${path}?token=${token}`;
  }

  private async assertAvailable(email: string, key: string): Promise<void> {
    const [byEmail, byUsername] = await Promise.all([
      this.database.prisma.user.findUnique({ where: { email }, select: { id: true } }),
      this.database.prisma.user.findUnique({ where: { usernameKey: key }, select: { id: true } })
    ]);
    if (byEmail) throw new ApiException(409, 'EMAIL_TAKEN', 'Un compte utilise déjà cette adresse email.', { fieldErrors: { email: ['Adresse déjà utilisée.'] } });
    if (byUsername) throw new ApiException(409, 'USERNAME_TAKEN', 'Ce pseudonyme est déjà pris.', { fieldErrors: { username: ['Pseudonyme déjà pris.'] } });
  }
}
