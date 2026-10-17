import 'reflect-metadata';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { validateEnvironment } from '../../src/config/environment';
import { configureApp } from '../../src/setup';

export const APP_ORIGIN = 'http://localhost:3000';

export interface TestApp { app: INestApplication; api: string; mailDir: string; close(): Promise<void> }

/** Application complète sur un port libre, emails écrits dans un dossier temporaire. */
export async function startApp(databaseUrl: string, module: unknown = AppModule): Promise<TestApp> {
  const mailDir = await mkdtemp(join(tmpdir(), 'jokkodev-mail-'));
  Object.assign(process.env, { NODE_ENV: 'test', DATABASE_URL: databaseUrl, APP_ORIGIN, MAIL_TRANSPORT: 'file', MAIL_FILE_DIR: mailDir, CSRF_SECRET: 'test-secret-'.padEnd(48, 'x'), SESSION_COOKIE_SECURE: 'false', TRUST_PROXY: '127.0.0.1' });
  const app = await NestFactory.create(module as never, { logger: false, bodyParser: false });
  configureApp(app, validateEnvironment(process.env));
  await app.listen(0, '127.0.0.1');
  return { app, api: `${await app.getUrl()}/api/v1`, mailDir, async close() { await app.close(); await rm(mailDir, { recursive: true, force: true }); } };
}

/** Dernier email adressé à `to` dont l'objet correspond ; attend l'envoi en arrière-plan. */
export async function lastMail(mailDir: string, to: string, subject: RegExp = /./, after = 0): Promise<{ subject: string; text: string }> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const files = (await readdir(mailDir).catch(() => [] as string[])).sort().reverse();
    for (const file of files.filter(f => Number(f.split('-')[0]) >= after)) {
      const message = JSON.parse(await readFile(join(mailDir, file), 'utf8')) as { to: { address: string }[]; subject: string; text: string };
      if (message.to.some(r => r.address === to) && subject.test(message.subject)) return message;
    }
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error('Aucun email reçu.');
}

export function tokenFrom(text: string): string {
  const match = /token=([A-Za-z0-9_-]{43})/.exec(text);
  if (!match) throw new Error('Lien sans jeton.');
  return match[1];
}

export async function mailCount(mailDir: string): Promise<number> {
  return (await readdir(mailDir).catch(() => [])).length;
}
