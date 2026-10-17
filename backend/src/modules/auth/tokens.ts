import { createHash, randomBytes } from 'node:crypto';

const TOKEN_FORMAT = /^[A-Za-z0-9_-]{43}$/;

/** Jeton opaque de 32 octets aléatoires ; seule son empreinte SHA-256 est conservée en base. */
export function newToken(): { token: string; hash: Uint8Array<ArrayBuffer> } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(createHash('sha256').update(token).digest());
}

export function isTokenFormat(value: unknown): value is string {
  return typeof value === 'string' && TOKEN_FORMAT.test(value);
}
