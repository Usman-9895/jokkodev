import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import type { Client } from 'pg';
import { createTestDatabase, sqlClient, type TestDatabase } from './support/database';
import { startApp, type TestApp } from './support/app';
import { registerMember, seedCatalogue, type Member } from './support/fixtures';
let database: TestDatabase, server: TestApp, sql: Client, member: Member;
let technology: string;
before(async () => {
  database = await createTestDatabase(); sql = await sqlClient(database);
  technology = (await seedCatalogue(sql)).get('nestjs')!;
  server = await startApp(database.url); member = await registerMember(server.api, 'search_owner');
  for (const index of [1, 2, 3]) {
    const question = await member.browser.post('/questions', { title: `Sécurité littérale %_ numéro ${index}`, context: 'alpha beta gamma delta epsilon zeta eta theta', expected: 'Attendu normal.', actual: 'Actuel normal.', attempts: 'Essai normal.', technologyIds: [technology] });
    assert.equal(question.status, 201);
    const project = await member.browser.post('/projects', { title: `Sécurité littérale %_ numéro ${index}`, objective: 'alpha beta gamma delta epsilon zeta eta theta objectif.', technologyIds: [technology], recruitmentStatus: index === 3 ? 'CLOSED' : 'OPEN' });
    assert.equal(project.status, 201);
  }
});
after(async () => { await sql?.end(); await server?.close(); await database?.drop(); });
async function list(route: string, params: Record<string, string>) {
  const response = await member.browser.get(`${route}?${new URLSearchParams(params)}`);
  assert.equal(response.status, 200, JSON.stringify(response.body)); return response.body;
}
for (const route of ['/questions', '/projects']) {
  test(`${route}: all words, accents/case, author and technology`, async () => {
    for (const q of ['  SECURITE  ', 'se\u0301curite\u0301', 'search_owner NestJS', 'alpha beta gamma delta epsilon zeta eta theta']) assert.equal((await list(route, { q })).meta.total, 3, q);
    assert.equal((await list(route, { q: 'alpha beta gamma delta epsilon zeta eta theta absent' })).meta.total, 0);
    assert.equal((await list(route, { q: 'NestJS absent' })).meta.total, 0);
  });
  test(`${route}: literal wildcard characters and atypical input`, async () => {
    assert.equal((await list(route, { q: '%_' })).meta.total, 3);
    for (const q of ['%absent', '_absent', '\\', "'; DROP TABLE dummy; --", '😀']) assert.equal((await list(route, { q })).meta.total, 0, q);
    assert.equal((await list(route, { q: '   ' })).meta.total, 3);
    const nul = await member.browser.get(`${route}?q=%00`); assert.equal(nul.status, 400);
  });
  test(`${route}: combined filters, global total and stable pagination`, async () => {
    const params = { q: 'securite NestJS', technology: '  NESTJS ', status: 'open', pageSize: '1' };
    const first = await list(route, { ...params, page: '1' }), second = await list(route, { ...params, page: '2' });
    assert.equal(first.meta.total, route === '/questions' ? 3 : 2); assert.equal(second.meta.total, first.meta.total);
    assert.equal(first.data.length, 1); assert.equal(second.data.length, 1); assert.notEqual(first.data[0].id, second.data[0].id);
    assert.equal((await list(route, { ...params, page: '50' })).data.length, 0);
    assert.equal((await list(route, { ...params, technology: 'unknown' })).meta.total, 0);
    const closed = await list(route, { ...params, status: route === '/questions' ? 'resolved' : 'closed' }); assert.equal(closed.meta.total, route === '/questions' ? 0 : 1);
    for (const suffix of ['page=0', 'pageSize=51', 'status=INVALID']) assert.equal((await member.browser.get(`${route}?${suffix}`)).status, 400);
  });
}
