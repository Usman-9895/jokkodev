import { createHash, randomBytes } from 'node:crypto';
import type { CookieOptions, NextFunction, Request, RequestHandler, Response } from 'express';
import { doubleCsrf } from 'csrf-csrf';
import type { Environment } from '../../config/environment';
import { ApiException } from '../../common/http/api-exception';
import { cookieNames } from './auth.constants';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export interface Csrf {
  /** Contrôle Origin puis jeton signé, sur toute méthode non sûre, connexion comprise. */
  middleware: RequestHandler[];
  /** Jeton lié à la session courante ou, à défaut, à une pré-session anonyme créée au besoin. */
  issue(request: Request, response: Response, options?: { renew?: boolean }): string;
}

export function createCsrf(env: Environment): Csrf {
  const names = cookieNames(env.sessionCookieSecure);
  const baseCookie: CookieOptions = { httpOnly: true, secure: env.sessionCookieSecure, sameSite: 'lax', path: '/' };
  const allowedOrigins = new Set([env.appOrigin, ...env.corsOrigins]);

  const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
    getSecret: () => env.csrfSecret,
    // Le jeton est lié à l'empreinte de la session (ou de la pré-session) : il ne peut pas être rejoué pour un autre navigateur.
    getSessionIdentifier: request => {
      const session = request.cookies?.[names.session] ?? request.cookies?.[names.preSession];
      return session ? createHash('sha256').update(session).digest('base64url') : '';
    },
    cookieName: names.csrf,
    cookieOptions: baseCookie,
    getCsrfTokenFromRequest: request => request.headers['x-csrf-token']
  });

  const originCheck: RequestHandler = (request, _response, next) => {
    if (SAFE_METHODS.has(request.method)) return next();
    const origin = request.headers.origin;
    const allowed = origin !== undefined ? allowedOrigins.has(origin) : request.headers['sec-fetch-site'] === 'same-origin';
    next(allowed ? undefined : new ApiException(403, 'CSRF_ORIGIN_REJECTED', 'Origine de la requête refusée.'));
  };
  const tokenCheck: RequestHandler = (request, response, next: NextFunction) => {
    doubleCsrfProtection(request, response, error => next(error ? new ApiException(403, 'CSRF_TOKEN_INVALID', 'Jeton de sécurité absent ou expiré. Rechargez la page.') : undefined));
  };

  return {
    middleware: [originCheck, tokenCheck],
    issue(request, response, options = {}) {
      request.cookies ??= {};
      if (!request.cookies[names.session] && !request.cookies[names.preSession]) {
        const preSession = randomBytes(32).toString('base64url');
        response.cookie(names.preSession, preSession, baseCookie);
        request.cookies[names.preSession] = preSession;
      }
      return generateCsrfToken(request, response, { overwrite: options.renew ?? false });
    }
  };
}
