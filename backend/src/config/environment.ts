import { randomBytes } from 'node:crypto';

export type MailTransport = 'smtp' | 'file';
export interface MailEnvironment { transport: MailTransport; from: string; fileDir: string; smtp?: { host: string; port: number; secure: boolean; user?: string; password?: string } }
export interface Environment {
  nodeEnv: 'development' | 'test' | 'production';
  host: string;
  port: number;
  databaseUrl: string;
  corsOrigins: string[];
  appOrigin: string;
  sessionCookieSecure: boolean;
  csrfSecret: string;
  trustProxy: boolean | number | string[];
  mail: MailEnvironment;
}

// Secret de développement unique par processus : les jetons CSRF émis deviennent invalides au redémarrage, ce qui est acceptable hors production.
const developmentCsrfSecret = randomBytes(32).toString('hex');

export function validateEnvironment(env: NodeJS.ProcessEnv): Environment {
  const errors: string[] = [];
  const nodeEnv = env.NODE_ENV ?? 'development';
  if (!['development', 'test', 'production'].includes(nodeEnv)) errors.push('NODE_ENV');
  const production = nodeEnv === 'production';
  const rawPort = env.PORT ?? '3001';
  const port = Number(rawPort);
  if (!/^\d+$/.test(rawPort) || !Number.isInteger(port) || port < 1 || port > 65535) errors.push('PORT');
  const host = env.HOST ?? '127.0.0.1';
  if (!host || /\s/.test(host)) errors.push('HOST');
  const databaseUrl = env.DATABASE_URL ?? '';
  try { const url = new URL(databaseUrl); if (!['postgresql:', 'postgres:'].includes(url.protocol) || !url.hostname || url.pathname.length < 2) errors.push('DATABASE_URL'); } catch { errors.push('DATABASE_URL'); }
  const corsOrigins = (env.CORS_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  for (const origin of corsOrigins) { if (!isOrigin(origin)) errors.push('CORS_ORIGINS'); }

  const appOrigin = env.APP_ORIGIN || (production ? '' : 'http://localhost:3000');
  if (!isOrigin(appOrigin) || (production && !appOrigin.startsWith('https://'))) errors.push('APP_ORIGIN');

  const rawSecure = env.SESSION_COOKIE_SECURE || (production ? 'true' : 'false');
  if (!['true', 'false'].includes(rawSecure) || (production && rawSecure !== 'true')) errors.push('SESSION_COOKIE_SECURE');

  const csrfSecret = env.CSRF_SECRET || (production ? '' : developmentCsrfSecret);
  if (csrfSecret.length < 32) errors.push('CSRF_SECRET');

  const trustProxy = parseTrustProxy(env.TRUST_PROXY || '');
  if (trustProxy === undefined) errors.push('TRUST_PROXY');

  const transport = (env.MAIL_TRANSPORT || (production ? 'smtp' : 'file')) as MailTransport;
  if (!['smtp', 'file'].includes(transport) || (production && transport !== 'smtp')) errors.push('MAIL_TRANSPORT');
  const from = env.MAIL_FROM || (production ? '' : 'JokkoDev <no-reply@localhost>');
  if (!from || /[\r\n]/.test(from)) errors.push('MAIL_FROM');
  let smtp: MailEnvironment['smtp'];
  if (transport === 'smtp') {
    const smtpPort = Number(env.SMTP_PORT || '587');
    if (!env.SMTP_HOST || /\s/.test(env.SMTP_HOST)) errors.push('SMTP_HOST');
    if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) errors.push('SMTP_PORT');
    smtp = { host: env.SMTP_HOST ?? '', port: smtpPort, secure: smtpPort === 465, user: env.SMTP_USER || undefined, password: env.SMTP_PASSWORD || undefined };
  }

  if (errors.length) throw new Error(`Configuration invalide : ${[...new Set(errors)].join(', ')}.`);
  return {
    nodeEnv: nodeEnv as Environment['nodeEnv'], host, port, databaseUrl, corsOrigins, appOrigin,
    sessionCookieSecure: rawSecure === 'true', csrfSecret, trustProxy: trustProxy as Environment['trustProxy'],
    mail: { transport, from, fileDir: env.MAIL_FILE_DIR || '.cache/mail', smtp }
  };
}

function isOrigin(value: string): boolean {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && url.origin === value; } catch { return false; }
}

// Vide ou false : aucun relais de confiance. Un entier : nombre de relais. Sinon une liste d'adresses ou de sous-réseaux, jamais true.
function parseTrustProxy(value: string): Environment['trustProxy'] | undefined {
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === 'false') return false;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const list = trimmed.split(',').map(s => s.trim()).filter(Boolean);
  if (list.length === 0 || list.some(item => !/^[0-9a-fA-F:.]+(\/\d{1,3})?$/.test(item))) return undefined;
  return list;
}
