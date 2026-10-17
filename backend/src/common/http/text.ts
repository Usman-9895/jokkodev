import type { NextFunction, Request, Response } from 'express';
import { ApiException } from './api-exception';

/** Motif LIKE littéral : %, _ et \ saisis par l'utilisateur ne sont pas des jokers. */
export function likeContains(text: string): string {
  return text.replace(/[\\%_]/g, char => `\\${char}`);
}

/** Texte libre stocké : NFC, sans espaces de bord, fins de ligne normalisées. */
export function cleanText(text: string): string {
  return text.normalize('NFC').replace(/\r\n?/g, '\n').trim();
}

export function optionalText(text: string | null | undefined): string | null | undefined {
  if (text === undefined || text === null) return text;
  const cleaned = cleanText(text);
  return cleaned === '' ? null : cleaned;
}

function containsNul(value: unknown, depth = 0): boolean {
  if (typeof value === 'string') return value.includes('\u0000');
  if (depth > 20 || value === null || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, item]) => key.includes('\u0000') || containsNul(item, depth + 1));
}

/** PostgreSQL refuse le caractère NUL dans un texte : la requête est rejetée en 400 avant d'atteindre la base. */
export function rejectNulCharacters(request: Request, _response: Response, next: NextFunction): void {
  next(containsNul(request.body) || containsNul(request.query) || request.url.includes('%00') ? new ApiException(400, 'BAD_REQUEST', 'Requête invalide.') : undefined);
}
