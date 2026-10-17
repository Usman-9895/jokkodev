import type { NextFunction, Request, Response } from 'express';

// Lecture minimale de l'en-tête Cookie : premier nom retenu, valeurs non décodables ignorées.
export function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const part of (header ?? '').split(';')) {
    const index = part.indexOf('=');
    if (index < 1) continue;
    const name = part.slice(0, index).trim();
    if (!name || name in cookies) continue;
    try { cookies[name] = decodeURIComponent(part.slice(index + 1).trim()); } catch { /* valeur ignorée */ }
  }
  return cookies;
}

export function cookieMiddleware(request: Request, _response: Response, next: NextFunction): void {
  request.cookies = parseCookies(request.headers.cookie);
  next();
}
