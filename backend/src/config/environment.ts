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
  questionImageDir?: string;
  notificationEventsEnabled?: boolean;
  google?: {clientId:string;clientSecret:string;redirectUri:string};
  github?: {clientId:string;clientSecret:string;redirectUri:string};
  githubDiagnosticsEnabled?: boolean;
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
  const questionImageDir = env.QUESTION_IMAGE_STORAGE_DIR || undefined;
  if (questionImageDir && (!path.isAbsolute(questionImageDir) || path.resolve(questionImageDir) === path.parse(path.resolve(questionImageDir)).root || avatarDir && path.resolve(avatarDir) === path.resolve(questionImageDir))) errors.push('QUESTION_IMAGE_STORAGE_DIR');
  if (production && questionImageDir) {
    const releaseRoot = path.basename(process.cwd()) === 'backend' ? path.dirname(process.cwd()) : process.cwd();
    const relative = path.relative(releaseRoot, path.resolve(questionImageDir));
    if (!relative || !relative.startsWith('..'+path.sep) && relative !== '..' && !path.isAbsolute(relative)) errors.push('QUESTION_IMAGE_STORAGE_DIR');
  }
  let google:Environment['google'];
  if(env.GOOGLE_AUTH_ENABLED!==undefined&&!['0','1'].includes(env.GOOGLE_AUTH_ENABLED))errors.push('GOOGLE_AUTH_ENABLED');
  if(env.GOOGLE_AUTH_ENABLED==='1'){
    if(!env.GOOGLE_CLIENT_ID?.endsWith('.apps.googleusercontent.com')||/\s/.test(env.GOOGLE_CLIENT_ID))errors.push('GOOGLE_CLIENT_ID');
    if(!env.GOOGLE_CLIENT_SECRET||/[\r\n]/.test(env.GOOGLE_CLIENT_SECRET))errors.push('GOOGLE_CLIENT_SECRET');
    if(env.GOOGLE_REDIRECT_URI!==appOrigin+'/api/v1/auth/google/callback')errors.push('GOOGLE_REDIRECT_URI');
    google={clientId:env.GOOGLE_CLIENT_ID??'',clientSecret:env.GOOGLE_CLIENT_SECRET??'',redirectUri:env.GOOGLE_REDIRECT_URI??''};
  }
  let github:Environment['github'];
  if(env.GITHUB_AUTH_DIAGNOSTICS_ENABLED!==undefined&&!['0','1'].includes(env.GITHUB_AUTH_DIAGNOSTICS_ENABLED))errors.push('GITHUB_AUTH_DIAGNOSTICS_ENABLED');
  if(env.GITHUB_AUTH_ENABLED!==undefined&&!['0','1'].includes(env.GITHUB_AUTH_ENABLED))errors.push('GITHUB_AUTH_ENABLED');
  if(env.GITHUB_AUTH_ENABLED==='1'){
    if(!env.GITHUB_CLIENT_ID||!/^[A-Za-z0-9_.-]{5,200}$/.test(env.GITHUB_CLIENT_ID))errors.push('GITHUB_CLIENT_ID');
    if(!env.GITHUB_CLIENT_SECRET||/[\r\n]/.test(env.GITHUB_CLIENT_SECRET))errors.push('GITHUB_CLIENT_SECRET');
    if(env.GITHUB_REDIRECT_URI!==appOrigin+'/api/v1/auth/github/callback')errors.push('GITHUB_REDIRECT_URI');
    github={clientId:env.GITHUB_CLIENT_ID??'',clientSecret:env.GITHUB_CLIENT_SECRET??'',redirectUri:env.GITHUB_REDIRECT_URI??''};
  }
  if (errors.length) throw new Error(`Configuration invalide : ${[...new Set(errors)].join(', ')}.`);
  return {
    nodeEnv: nodeEnv as Environment['nodeEnv'], host, port, databaseUrl, corsOrigins, appOrigin,
    sessionCookieSecure: rawSecure === 'true', csrfSecret, trustProxy: trustProxy as Environment['trustProxy'],
    avatarDir, questionImageDir, notificationEventsEnabled:env.NOTIFICATION_EVENTS_ENABLED==='1',
    mail: { transport, from, fileDir: env.MAIL_FILE_DIR || '.cache/mail', smtp },google,github,githubDiagnosticsEnabled:env.GITHUB_AUTH_DIAGNOSTICS_ENABLED==='1'
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
