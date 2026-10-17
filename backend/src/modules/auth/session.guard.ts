import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ENVIRONMENT } from '../../config/config.module';
import type { Environment } from '../../config/environment';
import { PUBLIC_ROUTE, REQUIRED_ROLE } from '../../common/auth/decorators';
import { ApiException } from '../../common/http/api-exception';
import type { Role } from '../../generated/prisma/client';
import { cookieNames } from './auth.constants';
import { SessionsService } from './sessions.service';

// Garde globale : toute route exige une session active sauf @Public(). Le statut du compte est relu à chaque requête,
// une suspension prend donc effet immédiatement, y compris sur une session déjà ouverte.
@Injectable()
export class SessionGuard implements CanActivate {
  private readonly sessionCookie: string;

  constructor(private readonly reflector: Reflector, private readonly sessions: SessionsService, @Inject(ENVIRONMENT) env: Environment) {
    this.sessionCookie = cookieNames(env.sessionCookieSecure).session;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const targets = [context.getHandler(), context.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, targets) ?? false;
    const token = request.cookies?.[this.sessionCookie];
    if (token) {
      try { request.auth = await this.sessions.resolve(token); }
      catch (error) { if (!isPublic) throw error; }
    }
    if (!request.auth) {
      if (isPublic) return true;
      throw new ApiException(401, 'UNAUTHORIZED', 'Authentification requise.');
    }
    const role = this.reflector.getAllAndOverride<Role | undefined>(REQUIRED_ROLE, targets);
    if (role && request.auth.user.role !== role) throw new ApiException(403, 'FORBIDDEN', 'Accès refusé.');
    return true;
  }
}
