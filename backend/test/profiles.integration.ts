import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import type { Client } from 'pg';
import { technologies } from '../src/database/seed';
import { createTestDatabase, sqlClient, type TestDatabase } from './support/database';
import { startApp, type TestApp } from './support/app';
import { Browser } from './support/browser';
import { registerMember, seedCatalogue, type Member } from './support/fixtures';

let database: TestDatabase;
let server: TestApp;
let sql: Client;
let awa: Member;
let catalogue: Map<string, string>;

before(async () => {
  database = await createTestDatabase();
  server = await startApp(database.url);
  sql = await sqlClient(database);
  catalogue = await seedCatalogue(sql);
  awa = await registerMember(server.api, 'awa_profil');
});
after(async () => {
  await sql?.end();
  await server?.close();
  await database?.drop();
});

describe('catalogue des technologies', () => {
  test('tri stable par nom, filtrable, jokers non interprétés', async () => {
    const all = await new Browser(server.api).get('/technologies');
    assert.equal(all.status, 200);
    assert.equal(all.body.data.length, technologies.length);
    assert.deepEqual((await new Browser(server.api).get('/technologies')).body, all.body);
    const script = await new Browser(server.api).get('/technologies?q=SCRIPT');
    assert.deepEqual(script.body.data.map((t: { slug: string }) => t.slug).sort(), ['javascript', 'typescript']);
    assert.equal((await new Browser(server.api).get('/technologies?q=_')).body.data.length, 0);
    assert.equal((await new Browser(server.api).get('/technologies?q=%25')).body.data.length, 0);
    assert.equal((await new Browser(server.api).get('/technologies?limit=3')).body.data.length, 3);
    assert.equal((await new Browser(server.api).get('/technologies?limit=abc')).status, 400);
  });
});

describe('profil', () => {
  test('modification par le titulaire puis lecture publique sans donnée privée', async () => {
    const skillIds = [catalogue.get('typescript'), catalogue.get('nestjs')];
    const update = await awa.browser.patch('/users/me', { bio: '  Développeuse backend à Dakar.  ', countryCode: 'SN', links: ['https://github.com/awa-dev'], skillIds });
    assert.equal(update.status, 200);
    assert.equal(update.body.bio, 'Développeuse backend à Dakar.');
    assert.equal(update.body.email, awa.email);
    assert.deepEqual(update.body.skills.map((s: { slug: string }) => s.slug), ['nestjs', 'typescript']);
    const visitor = new Browser(server.api);
    for (const reference of [awa.id, 'AWA_PROFIL']) {
      const profile = await visitor.get(`/users/${reference}`);
      assert.equal(profile.status, 200);
      assert.equal(profile.body.username, 'awa_profil');
      assert.equal(profile.body.countryCode, 'SN');
      assert.deepEqual(profile.body.links, ['https://github.com/awa-dev']);
      assert.doesNotMatch(JSON.stringify(profile.body), /@example\.test|passwordHash|emailVerified|role/);
    }
    const cleared = await awa.browser.patch('/users/me', { bio: null, countryCode: null, links: [], skillIds: [] });
    assert.deepEqual([cleared.body.bio, cleared.body.countryCode, cleared.body.links, cleared.body.skills], [null, null, [], []]);
  });

  test('champs protégés et valeurs invalides refusés', async () => {
    const browser = awa.browser;
    const forbidden = await browser.patch('/users/me', { role: 'ADMIN', status: 'ACTIVE', email: 'autre@example.test' });
    assert.equal(forbidden.status, 400);
    assert.deepEqual(Object.keys(forbidden.body.fieldErrors).sort(), ['email', 'role', 'status']);
    for (const [body, field] of [
      [{ links: ['javascript:alert(1)'] }, 'links'],
      [{ links: ['http://example.com'] }, 'links'],
      [{ links: ['https://user:pass@example.com'] }, 'links'],
      [{ links: ['https://a.example', 'https://b.example', 'https://c.example', 'https://d.example'] }, 'links'],
      [{ countryCode: 'sn' }, 'countryCode'],
      [{ countryCode: 'XX' }, 'countryCode'],
      [{ bio: 'x'.repeat(501) }, 'bio'],
      [{ username: 'a b' }, 'username'],
      [{ skillIds: [catalogue.get('go'), catalogue.get('go')] }, 'skillIds'],
      [{ skillIds: [...catalogue.values()].slice(0, 16) }, 'skillIds'],
      [{ skillIds: ['00000000-0000-4000-8000-000000000000'] }, 'skillIds']
    ] as const) {
      const response = await browser.patch('/users/me', body);
      assert.equal(response.status, 400, JSON.stringify(body));
      assert.ok(field in response.body.fieldErrors, JSON.stringify(response.body));
    }
    assert.equal((await browser.patch('/users/me', { bio: 'avant\u0000apres' })).status, 400);
  });

  test('pseudonyme déjà pris refusé, changement de pseudonyme effectif', async () => {
    const moussa = await registerMember(server.api, 'moussa_profil');
    const taken = await moussa.browser.patch('/users/me', { username: 'Awa_Profil' });
    assert.equal(taken.status, 409);
    assert.equal(taken.body.code, 'USERNAME_TAKEN');
    assert.equal((await moussa.browser.patch('/users/me', { username: 'Moussa_Dev' })).body.username, 'Moussa_Dev');
    assert.equal((await new Browser(server.api).get('/users/moussa_dev')).body.id, moussa.id);
  });

  test('compteurs publics limités aux contenus visibles', async () => {
    const insert = `INSERT INTO "Question"(id, "authorId", title, context, expected, actual, attempts, visibility, "updatedAt") VALUES (gen_random_uuid(), $1, 'Question de profil', 'c', 'e', 'a', 't', $2, now()) RETURNING id`;
    const visible = (await sql.query(insert, [awa.id, 'VISIBLE'])).rows[0].id;
    await sql.query(insert, [awa.id, 'HIDDEN']);
    const hiddenQuestion = (await sql.query(insert, [awa.id, 'HIDDEN'])).rows[0].id;
    const answer = `INSERT INTO "Answer"(id, "questionId", "authorId", body, visibility, "updatedAt") VALUES (gen_random_uuid(), $1, $2, 'Réponse', $3, now())`;
    await sql.query(answer, [visible, awa.id, 'VISIBLE']);
    await sql.query(answer, [visible, awa.id, 'HIDDEN']);
    await sql.query(answer, [hiddenQuestion, awa.id, 'VISIBLE']);
    const stats = (await new Browser(server.api).get(`/users/${awa.id}`)).body.stats;
    assert.deepEqual(stats, { questions: 1, answers: 1, projects: 0 });
  });

  test('profil inconnu ou référence invalide : 404 ; espace personnel sans session : 401', async () => {
    assert.equal((await new Browser(server.api).get('/users/00000000-0000-4000-8000-000000000000')).body.code, 'USER_NOT_FOUND');
    assert.equal((await new Browser(server.api).get('/users/a.b')).status, 404);
    assert.equal((await new Browser(server.api).get('/users/me')).status, 401);
    assert.equal((await new Browser(server.api).patch('/users/me', { bio: 'x' })).status, 401);
  });
});
