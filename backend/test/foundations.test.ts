import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { Controller, Post, Body, Module, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { IsEmail } from 'class-validator';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/setup';
import { validateEnvironment } from '../src/config/environment';
import { DatabaseService } from '../src/database/database.service';
import { HealthController } from '../src/health/health.controller';

class Input { @IsEmail() email!: string; }
@Controller('test-only')
class TestController {
  @Post() create(@Body() input: Input) { return input; }
  @Post('failure') failure() { throw new Error('SQL password=secret'); }
}
@Module({ imports: [AppModule], controllers: [TestController] })
class TestModule {}
let app: INestApplication;
let origin: string;
before(async () => {
  process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/unavailable';
  app = await NestFactory.create(TestModule, { logger: false, bodyParser: false });
  configureApp(app, validateEnvironment({ NODE_ENV: 'test', DATABASE_URL: process.env.DATABASE_URL }));
  await app.listen(0, '127.0.0.1');
  origin = `${await app.getUrl()}/api/v1`;
});
after(async () => { await app?.close(); });
test('configuration invalide sans fuite de valeur', () => {
  assert.throws(() => validateEnvironment({ DATABASE_URL: 'password-secret', PORT: 'oops' }), { message: 'Configuration invalide : PORT, DATABASE_URL.' });
  assert.throws(() => validateEnvironment({ DATABASE_URL: 'postgresql://x:y@localhost/test', CORS_ORIGINS: '*' }));
});
test('liveness HTTP indépendante de PostgreSQL et en-têtes', async () => {
  const response = await fetch(`${origin}/health/live`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
  assert.match(response.headers.get('x-request-id') ?? '', /^[a-f0-9-]{36}$/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
});
test('readiness HTTP 503 si PostgreSQL indisponible', async () => {
  const response = await fetch(`${origin}/health/ready`);
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.code, 'SERVICE_UNAVAILABLE');
  assert.deepEqual(body.fieldErrors, {});
  assert.equal(body.requestId, response.headers.get('x-request-id'));
  assert.doesNotMatch(JSON.stringify(body), /postgres|password|stack|SELECT/i);
});
test('readiness logique positive avec dépendance contrôlée (pas une base réelle)', async () => {
  const database = new DatabaseService();
  database.ping = async () => {};
  assert.deepEqual(await new HealthController(database).ready(), { status: 'ok' });
});
test('validation stricte, champs supplémentaires refusés', async () => {
  const response = await fetch(`${origin}/test-only`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'invalide', role: 'admin' }) });
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.code, 'VALIDATION_ERROR');
  assert.deepEqual(Object.keys(body.fieldErrors).sort(), ['email', 'role']);
});
test('JSON invalide, corps surdimensionné, route inconnue et exception nettoyés', async () => {
  for (const [path, payload, status, code] of [
    ['/test-only', '{', 400, 'BAD_REQUEST'],
    ['/test-only', JSON.stringify({ text: 'x'.repeat(70000) }), 413, 'PAYLOAD_TOO_LARGE'],
    ['/test-only/failure', '{}', 500, 'INTERNAL_ERROR'],
    ['/unknown', '{}', 404, 'NOT_FOUND']
  ] as const) {
    const response = await fetch(`${origin}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload });
    assert.equal(response.status, status);
    const body = await response.json();
    assert.equal(body.code, code);
    assert.doesNotMatch(JSON.stringify(body), /secret|stack|SQL/);
  }
});
