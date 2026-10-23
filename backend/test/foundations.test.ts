import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { Body, Controller, Module, Post } from '@nestjs/common';
import { IsEmail } from 'class-validator';
import { AppModule } from '../src/app.module';
import { validateEnvironment } from '../src/config/environment';
import { DatabaseService } from '../src/database/database.service';
import { HealthController } from '../src/health/health.controller';
import { Public } from '../src/common/auth/decorators';
import { parseCookies } from '../src/common/http/cookies';
import { startApp, type TestApp } from './support/app';
import { Browser } from './support/browser';

class Input { @IsEmail() email!: string; }
@Public()
@Controller('test-only')
class TestController {
  @Post() create(@Body() input: Input) { return input; }
  @Post('failure') failure() { throw new Error('SQL password=secret'); }
}
@Module({ imports: [AppModule], controllers: [TestController] })
class TestModule {}

// Aucune base nécessaire : PostgreSQL est volontairement injoignable.
let server: TestApp;
let origin: string;
before(async () => {
  server = await startApp('postgresql://test:test@127.0.0.1:1/unavailable', TestModule);
  origin = server.api;
});
after(async () => { await server?.close(); });

test('configuration invalide sans fuite de valeur', () => {
  assert.throws(() => validateEnvironment({ DATABASE_URL: 'password-secret', PORT: 'oops' }), { message: 'Configuration invalide : PORT, DATABASE_URL.' });
  assert.throws(() => validateEnvironment({ DATABASE_URL: 'postgresql://x:y@localhost/test', CORS_ORIGINS: '*' }));
  assert.throws(() => validateEnvironment({ DATABASE_URL: 'postgresql://x:y@localhost/test', TRUST_PROXY: 'true' }), { message: 'Configuration invalide : TRUST_PROXY.' });
});
test('production : secrets, HTTPS et SMTP obligatoires', () => {
  assert.throws(() => validateEnvironment({ NODE_ENV: 'production', DATABASE_URL: 'postgresql://x:y@localhost/test' }), { message: 'Configuration invalide : APP_ORIGIN, CSRF_SECRET, MAIL_FROM, SMTP_HOST.' });
  assert.throws(() => validateEnvironment({ NODE_ENV: 'production', DATABASE_URL: 'postgresql://x:y@localhost/test', APP_ORIGIN: 'https://jokkodev.example', CSRF_SECRET: 'x'.repeat(32), MAIL_FROM: 'a@b.c', SMTP_HOST: 'smtp.example', SESSION_COOKIE_SECURE: 'false' }), { message: 'Configuration invalide : SESSION_COOKIE_SECURE.' });
  const env = validateEnvironment({ NODE_ENV: 'production', DATABASE_URL: 'postgresql://x:y@localhost/test', APP_ORIGIN: 'https://jokkodev.example', CSRF_SECRET: 'x'.repeat(32), MAIL_FROM: 'a@b.c', SMTP_HOST: 'smtp.example', TRUST_PROXY: '127.0.0.1,::1' });
  assert.equal(env.sessionCookieSecure, true);
  assert.deepEqual(env.trustProxy, ['127.0.0.1','::1']);
});

test('proxy trust accepts exact peers only; direct mode ignores forwarding headers', () => {
  const base={DATABASE_URL:'postgresql://x:y@localhost/test'};
  for(const value of ['true','1','2','0','0.0.0.0/0','::/0','10.0.0.0/8','0.0.0.0','::','loopback','*'])assert.throws(()=>validateEnvironment({...base,TRUST_PROXY:value}),{message:'Configuration invalide : TRUST_PROXY.'});
  assert.equal(validateEnvironment(base).trustProxy,false);
  assert.equal(validateEnvironment({...base,TRUST_PROXY:'false'}).trustProxy,false);
  assert.deepEqual(validateEnvironment({...base,TRUST_PROXY:'127.0.0.1, ::1'}).trustProxy,['127.0.0.1','::1']);
});
test('lecture des cookies tolérante', () => {
  assert.deepEqual(parseCookies('a=1; b=%E0%A4%A; a=2; =x; c=d%20e'), { a: '1', c: 'd e' });
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
  const response = await new Browser(origin).post('/test-only', { email: 'invalide', role: 'admin' });
  assert.equal(response.status, 400);
  assert.equal(response.body.code, 'VALIDATION_ERROR');
  assert.deepEqual(response.body.fieldErrors, { email: ['Adresse email invalide.'], role: ['Champ non autorisé.'] });
});
test('JSON invalide, corps surdimensionné, route inconnue et exception nettoyés', async () => {
  const browser = new Browser(origin);
  const csrfToken = await browser.csrf();
  const cookie = [...browser.cookies].map(([name, value]) => `${name}=${value}`).join('; ');
  for (const [path, payload, status, code] of [
    ['/test-only', '{', 400, 'BAD_REQUEST'],
    ['/test-only', JSON.stringify({ text: 'x'.repeat(70000) }), 413, 'PAYLOAD_TOO_LARGE'],
    ['/test-only/failure', '{}', 500, 'INTERNAL_ERROR'],
    ['/unknown', '{}', 404, 'NOT_FOUND']
  ] as const) {
    const response = await fetch(`${origin}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000', Cookie: cookie, 'X-CSRF-Token': csrfToken }, body: payload });
    assert.equal(response.status, status);
    const body = await response.json();
    assert.equal(body.code, code);
    assert.doesNotMatch(JSON.stringify(body), /secret|stack|SQL/);
  }
});
test('CSRF : origine étrangère, origine absente et jeton manquant refusés', async () => {
  const foreign = new Browser(origin, 'https://evil.example');
  await foreign.csrf();
  assert.equal((await foreign.post('/test-only', { email: 'a@b.co' })).body.code, 'CSRF_ORIGIN_REJECTED');
  const noOrigin = new Browser(origin, null);
  await noOrigin.csrf();
  assert.equal((await noOrigin.post('/test-only', { email: 'a@b.co' })).status, 403);
  const browser = new Browser(origin);
  await browser.csrf();
  const missing = await browser.mutate('POST', '/test-only', { email: 'a@b.co' }, { 'X-CSRF-Token': '' });
  assert.equal(missing.status, 403);
  assert.equal(missing.body.code, 'CSRF_TOKEN_INVALID');
  const stolen = await new Browser(origin).mutate('POST', '/test-only', { email: 'a@b.co' }, { 'X-CSRF-Token': browser.csrfToken ?? '' });
  assert.equal(stolen.body.code, 'CSRF_TOKEN_INVALID');
  assert.equal((await browser.post('/test-only', { email: 'a@b.co' })).status, 201);
});
test('route protégée sans session : 401', async () => {
  const response = await new Browser(origin).get('/auth/me');
  assert.equal(response.status, 401);
  assert.equal(response.body.code, 'UNAUTHORIZED');
});
