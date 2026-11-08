import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { isIP } from 'node:net';

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
  trustProxy: false | string[];
  mail: MailEnvironment;
  avatarDir?: string;
  notificationEventsEnabled?: boolean;
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

  if(env.NOTIFICATION_EVENTS_ENABLED!==undefined&&!['0','1'].includes(env.NOTIFICATION_EVENTS_ENABLED))errors.push('NOTIFICATION_EVENTS_ENABLED');
  const avatarDir = env.AVATAR_STORAGE_DIR || undefined;
  if (avatarDir && !path.isAbsolute(avatarDir)) errors.push('AVATAR_STORAGE_DIR');
  if (production && avatarDir) {
    const releaseRoot=path.basename(process.cwd())==='backend'?path.dirname(process.cwd()):process.cwd();
    const relative=path.relative(releaseRoot,path.resolve(avatarDir));
    if (!relative || !relative.startsWith('..'+path.sep) && relative!=='..' && !path.isAbsolute(relative)) errors.push('AVATAR_STORAGE_DIR');
  }
  if (errors.length) throw new Error(`Configuration invalide : ${[...new Set(errors)].join(', ')}.`);
  return {
    nodeEnv: nodeEnv as Environment['nodeEnv'], host, port, databaseUrl, corsOrigins, appOrigin,
    sessionCookieSecure: rawSecure === 'true', csrfSecret, trustProxy: trustProxy as Environment['trustProxy'],
    avatarDir, notificationEventsEnabled:env.NOTIFICATION_EVENTS_ENABLED==='1',
    mail: { transport, from, fileDir: env.MAIL_FILE_DIR || '.cache/mail', smtp }
  };
}

function isOrigin(value: string): boolean {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && url.origin === value; } catch { return false; }
}

// Direct: socket address only. Relay: exact, independently verified peer IPs, never hop counts or broad ranges.
function parseTrustProxy(value: string): Environment['trustProxy'] | undefined {
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === 'false') return false;
  const list = trimmed.split(',').map(s => s.trim()).filter(Boolean);
  if (list.length === 0 || list.some(item => !isIP(item) || ['0.0.0.0','::'].includes(item))) return undefined;
  return list;
}
