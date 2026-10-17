import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';
import type { Role } from '../../generated/prisma/client';
import type { AuthenticatedUser } from './auth-context';

export const PUBLIC_ROUTE = 'jokkodev:public';
export const REQUIRED_ROLE = 'jokkodev:role';

/** Route accessible sans session. La session éventuelle reste lue pour personnaliser la réponse. */
export const Public = () => SetMetadata(PUBLIC_ROUTE, true);
/** Restreint la route à un rôle ; vérifié en plus de la session active. */
export const Roles = (role: Role) => SetMetadata(REQUIRED_ROLE, role);

/** Utilisateur de la session courante ; undefined sur une route publique consultée sans session. */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthenticatedUser | undefined => context.switchToHttp().getRequest<Request>().auth?.user);
