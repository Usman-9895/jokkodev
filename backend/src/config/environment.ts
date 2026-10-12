export interface Environment { nodeEnv: 'development' | 'test' | 'production'; host: string; port: number; databaseUrl: string; corsOrigins: string[] }
export function validateEnvironment(env: NodeJS.ProcessEnv): Environment {
  const errors: string[] = [];
  const nodeEnv = env.NODE_ENV ?? 'development';
  if (!['development', 'test', 'production'].includes(nodeEnv)) errors.push('NODE_ENV');
  const rawPort = env.PORT ?? '3001';
  const port = Number(rawPort);
  if (!/^\d+$/.test(rawPort) || !Number.isInteger(port) || port < 1 || port > 65535) errors.push('PORT');
  const host = env.HOST ?? '127.0.0.1';
  if (!host || /\s/.test(host)) errors.push('HOST');
  const databaseUrl = env.DATABASE_URL ?? '';
  try { const url = new URL(databaseUrl); if (!['postgresql:', 'postgres:'].includes(url.protocol) || !url.hostname || url.pathname.length < 2) errors.push('DATABASE_URL'); } catch { errors.push('DATABASE_URL'); }
  const corsOrigins = (env.CORS_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  for (const origin of corsOrigins) { try { const url = new URL(origin); if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) errors.push('CORS_ORIGINS'); } catch { errors.push('CORS_ORIGINS'); } }
  if (errors.length) throw new Error(`Configuration invalide : ${[...new Set(errors)].join(', ')}.`);
  return { nodeEnv: nodeEnv as Environment['nodeEnv'], host, port, databaseUrl, corsOrigins };
}
