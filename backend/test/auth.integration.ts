import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { after, before, describe, test } from 'node:test';
import type { Client } from 'pg';
import { createTestDatabase, sqlClient, type TestDatabase } from './support/database';
import { lastMail, mailCount, startApp, tokenFrom, type TestApp } from './support/app';
import { Browser } from './support/browser';

let database: TestDatabase;
let server: TestApp;
let sql: Client;
let counter = 0;

before(async () => {
  database = await createTestDatabase();
  server = await startApp(database.url);
  sql = await sqlClient(database);
});
after(async () => {
  await sql?.end();
  await server?.close();
  await database?.drop();
});

const password = 'mot de passe solide 2026';
function identity() { counter += 1; return { email: `membre${counter}@example.test`, username: `membre_${counter}` }; }
async function register(browser = new Browser(server.api)) {
  const id = identity();
  const response = await browser.post('/auth/register', { ...id, password });
  assert.equal(response.status, 201);
  return { browser, ...id, id: response.body.user.id as string };
}

describe('inscription et session', () => {
  test('crée un MEMBER, ouvre une session conforme et n’expose aucune donnée sensible', async () => {
    const browser = new Browser(server.api);
    const id = identity();
    const response = await browser.post('/auth/register', { email: `  ${id.email.toUpperCase()}`.trim(), username: id.username, password });
    assert.equal(response.status, 201);
    assert.deepEqual(Object.keys(response.body.user).sort(), ['email', 'emailVerified', 'id', 'photoUrl', 'role', 'username']);
    assert.equal(response.body.user.photoUrl, null);
    assert.equal(response.body.user.email, id.email);
    assert.equal(response.body.user.role, 'MEMBER');
    assert.equal(response.body.user.emailVerified, false);
    assert.doesNotMatch(JSON.stringify(response.body), /passwordHash|argon2/);
    const cookie = response.headers.getSetCookie().find(c => c.startsWith('jokkodev_session='));
    assert.ok(cookie);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
    assert.match(cookie, /Path=\//);
    assert.doesNotMatch(cookie, /Domain=/i);
    const token = browser.cookies.get('jokkodev_session') ?? '';
    const { rows } = await sql.query('SELECT "tokenHash" FROM "Session" WHERE "userId" = $1', [response.body.user.id]);
    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0].tokenHash, createHash('sha256').update(token).digest());
    const me = await browser.get('/auth/me');
    assert.equal(me.status, 200);
    assert.equal(me.body.username, id.username);
  });

  test('rôle imposé, email ou pseudonyme déjà pris refusés', async () => {
    const existing = await register();
    const browser = new Browser(server.api);
    assert.equal((await browser.post('/auth/register', { ...identity(), password, role: 'ADMIN' })).body.code, 'VALIDATION_ERROR');
    assert.equal((await browser.post('/auth/register', { email: existing.email.toUpperCase(), username: 'autre_pseudo', password })).body.code, 'EMAIL_TAKEN');
    const taken = await browser.post('/auth/register', { email: 'libre@example.test', username: existing.username.toUpperCase(), password });
    assert.equal(taken.status, 409);
    assert.equal(taken.body.code, 'USERNAME_TAKEN');
    assert.deepEqual(taken.body.fieldErrors, { username: ['Pseudonyme déjà pris.'] });
    const short = await browser.post('/auth/register', { ...identity(), password: 'court' });
    assert.deepEqual(short.body.fieldErrors, { password: ['Texte trop court.'] });
  });

  test('vérification de l’email à usage unique', async () => {
    const { browser, email } = await register();
    const token = tokenFrom((await lastMail(server.mailDir, email, /Confirme/)).text);
    assert.equal((await browser.post('/auth/verify-email', { token })).status, 204);
    assert.equal((await browser.get('/auth/me')).body.emailVerified, true);
    assert.equal((await browser.post('/auth/verify-email', { token })).body.code, 'TOKEN_INVALID');
    assert.equal((await browser.post('/auth/resend-verification')).status, 202);
  });
});

describe('connexion et déconnexion', () => {
  test('identifiants invalides, puis connexion et révocation à la déconnexion', async () => {
    const { email } = await register();
    const browser = new Browser(server.api);
    const wrong = await browser.post('/auth/login', { email, password: 'mauvais mot de passe' });
    assert.equal(wrong.status, 401);
    assert.equal(wrong.body.code, 'INVALID_CREDENTIALS');
    const unknown = await browser.post('/auth/login', { email: 'inconnu@example.test', password });
    assert.deepEqual([unknown.status, unknown.body.code, unknown.body.message], [wrong.status, wrong.body.code, wrong.body.message]);
    const login = await browser.post('/auth/login', { email: email.toUpperCase(), password });
    assert.equal(login.status, 200);
    const stolen = browser.cookies.get('jokkodev_session') ?? '';
    assert.equal((await browser.post('/auth/logout')).status, 204);
    assert.equal(browser.cookies.has('jokkodev_session'), false);
    const replay = new Browser(server.api);
    replay.cookies.set('jokkodev_session', stolen);
    assert.equal((await replay.get('/auth/me')).status, 401);
  });

  test('une nouvelle connexion remplace la session précédente du navigateur', async () => {
    const { browser, email } = await register();
    const before = browser.cookies.get('jokkodev_session');
    assert.equal((await browser.post('/auth/login', { email, password })).status, 200);
    assert.notEqual(browser.cookies.get('jokkodev_session'), before);
    const old = new Browser(server.api);
    old.cookies.set('jokkodev_session', before ?? '');
    assert.equal((await old.get('/auth/me')).status, 401);
  });

  test('session expirée ou inactive refusée', async () => {
    const expired = await register();
    await sql.query(`UPDATE "Session" SET "expiresAt" = now() - interval '1 second', "createdAt" = now() - interval '8 days' WHERE "userId" = $1`, [expired.id]);
    assert.equal((await expired.browser.get('/auth/me')).status, 401);
    const idle = await register();
    await sql.query(`UPDATE "Session" SET "lastSeenAt" = now() - interval '25 hours' WHERE "userId" = $1`, [idle.id]);
    assert.equal((await idle.browser.get('/auth/me')).status, 401);
  });

  test('compte suspendu : session ouverte inutilisable et connexion refusée', async () => {
    const member = await register();
    await sql.query(`UPDATE "User" SET status = 'SUSPENDED' WHERE id = $1`, [member.id]);
    assert.equal((await member.browser.get('/auth/me')).status, 401);
    const login = await new Browser(server.api).post('/auth/login', { email: member.email, password });
    assert.equal(login.status, 403);
    assert.equal(login.body.code, 'ACCOUNT_SUSPENDED');
  });

  test('limitation des tentatives par compte et IP', async () => {
    const { email } = await register();
    const browser = new Browser(server.api);
    for (let i = 0; i < 5; i++) assert.equal((await browser.post('/auth/login', { email, password: 'mauvais mot de passe' })).status, 401);
    const limited = await browser.post('/auth/login', { email, password });
    assert.equal(limited.status, 429);
    assert.equal(limited.body.code, 'RATE_LIMITED');
    assert.ok(Number(limited.headers.get('retry-after')) > 0);
  });
});

describe('récupération d’accès', () => {
  test('réponse neutre : même résultat pour un email inconnu, aucun email envoyé', async () => {
    const browser = new Browser(server.api);
    const before = await mailCount(server.mailDir);
    const unknown = await browser.post('/auth/forgot-password', { email: 'absent@example.test' });
    const { email } = await register();
    const known = await browser.post('/auth/forgot-password', { email });
    assert.deepEqual([unknown.status, unknown.body], [202, undefined]);
    assert.deepEqual([known.status, known.body], [202, undefined]);
    assert.match((await lastMail(server.mailDir, email, /Réinitialisation/)).subject, /Réinitialisation/);
    assert.equal(await mailCount(server.mailDir), before + 2);
  });

  test('réinitialisation : sessions révoquées, jeton à usage unique, ancien mot de passe refusé', async () => {
    const member = await register();
    const other = new Browser(server.api);
    assert.equal((await other.post('/auth/login', { email: member.email, password })).status, 200);
    await new Browser(server.api).post('/auth/forgot-password', { email: member.email });
    const token = tokenFrom((await lastMail(server.mailDir, member.email, /Réinitialisation/)).text);
    const anonymous = new Browser(server.api);
    const newPassword = 'nouveau mot de passe 2026';
    const [first, second] = await Promise.all([
      anonymous.post('/auth/reset-password', { token, password: newPassword }),
      new Browser(server.api).post('/auth/reset-password', { token, password: 'autre mot de passe 2026' })
    ]);
    assert.deepEqual([first.status, second.status].sort(), [204, 400]);
    const winner = first.status === 204 ? newPassword : 'autre mot de passe 2026';
    assert.equal((await member.browser.get('/auth/me')).status, 401);
    assert.equal((await other.get('/auth/me')).status, 401);
    assert.equal((await anonymous.post('/auth/login', { email: member.email, password })).status, 401);
    const login = await anonymous.post('/auth/login', { email: member.email, password: winner });
    assert.equal(login.status, 200);
    assert.equal(login.body.user.emailVerified, true);
    assert.equal((await anonymous.post('/auth/reset-password', { token, password: newPassword })).body.code, 'TOKEN_INVALID');
  });

  test('jeton expiré ou remplacé par une nouvelle demande refusé', async () => {
    const member = await register();
    const browser = new Browser(server.api);
    await browser.post('/auth/forgot-password', { email: member.email });
    const first = tokenFrom((await lastMail(server.mailDir, member.email, /Réinitialisation/)).text);
    await new Promise(resolve => setTimeout(resolve, 5));
    const secondRequestedAt = Date.now();
    await browser.post('/auth/forgot-password', { email: member.email });
    const second = tokenFrom((await lastMail(server.mailDir, member.email, /Réinitialisation/, secondRequestedAt)).text);
    assert.notEqual(first, second);
    assert.equal((await browser.post('/auth/reset-password', { token: first, password: 'nouveau mot de passe 2026' })).body.code, 'TOKEN_INVALID');
    await sql.query(`UPDATE "AccountToken" SET "expiresAt" = now() - interval '1 second', "createdAt" = now() - interval '1 hour' WHERE "userId" = $1 AND "consumedAt" IS NULL`, [member.id]);
    assert.equal((await browser.post('/auth/reset-password', { token: second, password: 'nouveau mot de passe 2026' })).body.code, 'TOKEN_INVALID');
  });
});
