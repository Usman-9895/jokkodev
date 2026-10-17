import type { AccountStatus, Role } from '../../generated/prisma/client';

export interface AuthenticatedUser { id: string; username: string; email: string; role: Role; status: AccountStatus; emailVerifiedAt: Date | null }
export interface AuthContext { user: AuthenticatedUser; sessionId: string }

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request { auth?: AuthContext }
  }
}
