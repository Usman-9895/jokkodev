import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import type { Client } from 'pg';
import { POINTS_PER_ACCEPTED_ANSWER as P } from '../src/modules/reputation/reputation.service';
import { createTestDatabase, sqlClient, type TestDatabase } from './support/database';
import { startApp, type TestApp } from './support/app';
import { Browser } from './support/browser';
import { registerAdmin, registerMember, seedCatalogue, type Member } from './support/fixtures';

let database: TestDatabase;
let server: TestApp;
let sql: Client;
let tech: Map<string, string>;
let visitor: Browser;
let admin: Member;
let counter = 0;

before(async () => {
  database = await createTestDatabase();
  server = await startApp(database.url);
  sql = await sqlClient(database);
  tech = await seedCatalogue(sql);
  visitor = new Browser(server.api);
  admin = await registerAdmin(server.api, sql, 'admin_teranga');
});
after(async () => {
  await sql?.end();
  await server?.close();
  await database?.drop();
});

async function setup(helpers = 1) {
  counter += 1;
  const asker = await registerMember(server.api, `demandeur_${counter}`);
  const others = await Promise.all(Array.from({ length: helpers }, (_, i) => registerMember(server.api, `aidant_${counter}_${i}`)));
  const { body: question } = await asker.browser.post('/questions', { title: `Question Teranga numéro ${counter}`, context: 'Contexte.', expected: 'Attendu.', actual: 'Obtenu.', attempts: 'Essais.', technologyIds: [tech.get('go')] });
  const answers = await Promise.all(others.map(async (m, i) => (await m.browser.post(`/questions/${question.id}/answers`, { body: `Réponse utile numéro ${i + 1}.` })).body.id as string));
  return { asker, others, questionId: question.id as string, answers };
}
async function points(member: Member): Promise<number> { return (await visitor.get(`/users/${member.id}`)).body.terangaPoints; }
async function events(questionId: string): Promise<number> { return (await sql.query('SELECT count(*)::int AS n FROM "ReputationEvent" WHERE "questionId" = $1', [questionId])).rows[0].n; }

describe('attribution', () => {
  test('réponse acceptée par l’auteur de la question : points visibles sur le profil', async () => {
    const { asker, others: [helper], questionId, answers: [answer] } = await setup();
    assert.equal(await points(helper), 0);
    await asker.browser.put(`/questions/${questionId}/accepted-answer`, { answerId: answer });
    assert.equal(await points(helper), P);
    assert.equal((await helper.browser.get('/users/me')).body.terangaPoints, P);
    assert.equal(await points(asker), 0);
  });

  test('autoacceptation : aucun point', async () => {
    const { asker, questionId } = await setup(0);
    const { body: own } = await asker.browser.post(`/questions/${questionId}/answers`, { body: 'Je réponds à ma propre question.' });
    await asker.browser.put(`/questions/${questionId}/accepted-answer`, { answerId: own.id });
    assert.equal(await points(asker), 0);
    assert.equal(await events(questionId), 0);
  });

  test('acceptation répétée ou simultanée : une seule attribution', async () => {
    const { asker, others: [helper], questionId, answers: [answer] } = await setup();
    await Promise.all([1, 2, 3, 4].map(() => asker.browser.put(`/questions/${questionId}/accepted-answer`, { answerId: answer })));
    await asker.browser.put(`/questions/${questionId}/accepted-answer`, { answerId: answer });
    assert.equal(await points(helper), P);
    assert.equal(await events(questionId), 1);
  });
});

describe('compensation', () => {
  test('changement de solution : retrait exact chez l’ancien, attribution au nouveau', async () => {
    const { asker, others: [first, second], questionId, answers } = await setup(2);
    await asker.browser.put(`/questions/${questionId}/accepted-answer`, { answerId: answers[0] });
    await asker.browser.put(`/questions/${questionId}/accepted-answer`, { answerId: answers[1] });
    assert.deepEqual([await points(first), await points(second)], [0, P]);
    const { rows } = await sql.query('SELECT delta, reason::text AS reason FROM "ReputationEvent" WHERE "questionId" = $1 ORDER BY "createdAt", sequence', [questionId]);
    assert.deepEqual(rows.map(r => [r.delta, r.reason]).sort(), [[-P, 'ACCEPTANCE_WITHDRAWN'], [P, 'ANSWER_ACCEPTED'], [P, 'ANSWER_ACCEPTED']].sort());
  });

  test('accepter, retirer, réaccepter : score attendu sans perte ni cumul', async () => {
    const { asker, others: [helper], questionId, answers: [answer] } = await setup();
    await asker.browser.put(`/questions/${questionId}/accepted-answer`, { answerId: answer });
    await asker.browser.delete(`/questions/${questionId}/accepted-answer`);
    assert.equal(await points(helper), 0);
    await asker.browser.put(`/questions/${questionId}/accepted-answer`, { answerId: answer });
    assert.equal(await points(helper), P);
    assert.equal(await events(questionId), 3);
  });

  test('masquage de la solution ou de la question : points neutralisés', async () => {
    const answerCase = await setup();
    await answerCase.asker.browser.put(`/questions/${answerCase.questionId}/accepted-answer`, { answerId: answerCase.answers[0] });
    await admin.browser.post('/admin/moderation-actions', { decision: 'HIDE_CONTENT', targetType: 'ANSWER', targetId: answerCase.answers[0], reason: 'Réponse masquée pour le test.' });
    assert.equal(await points(answerCase.others[0]), 0);
    const questionCase = await setup();
    await questionCase.asker.browser.put(`/questions/${questionCase.questionId}/accepted-answer`, { answerId: questionCase.answers[0] });
    const { body: report } = await questionCase.others[0].browser.post('/reports', { targetType: 'QUESTION', targetId: questionCase.questionId, reason: 'Question à masquer pour le test.' });
    await admin.browser.post(`/admin/reports/${report.id}/resolve`, { decision: 'HIDE_CONTENT', reason: 'Question masquée pour le test.' });
    assert.equal(await points(questionCase.others[0]), 0);
  });

  test('masquage concurrent d’une acceptation : score cohérent avec la solution finale', async () => {
    for (let round = 0; round < 5; round++) {
      const { asker, others: [helper], questionId, answers: [answer] } = await setup();
      await Promise.all([
        asker.browser.put(`/questions/${questionId}/accepted-answer`, { answerId: answer }),
        admin.browser.post('/admin/moderation-actions', { decision: 'HIDE_CONTENT', targetType: 'ANSWER', targetId: answer, reason: 'Masquage concurrent pour le test.' })
      ]);
      const { rows } = await sql.query('SELECT "acceptedAnswerId" FROM "Question" WHERE id = $1', [questionId]);
      assert.equal(await points(helper), rows[0].acceptedAnswerId === answer ? P : 0);
    }
  });
});

describe('intégrité', () => {
  test('échec du registre : aucun changement partiel de solution', async () => {
    const { asker, others: [helper], questionId, answers: [answer] } = await setup();
    await sql.query(`CREATE FUNCTION fail_reputation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'échec simulé'; END $$`);
    await sql.query('CREATE TRIGGER fail_reputation BEFORE INSERT ON "ReputationEvent" FOR EACH ROW EXECUTE FUNCTION fail_reputation()');
    try {
      assert.equal((await asker.browser.put(`/questions/${questionId}/accepted-answer`, { answerId: answer })).status, 500);
    } finally {
      await sql.query('DROP TRIGGER fail_reputation ON "ReputationEvent"');
      await sql.query('DROP FUNCTION fail_reputation()');
    }
    assert.equal((await visitor.get(`/questions/${questionId}`)).body.acceptedAnswerId, null);
    assert.equal(await points(helper), 0);
  });

  test('la base refuse un double mouvement et un sens incohérent', async () => {
    const { asker, questionId, answers: [answer] } = await setup();
    await asker.browser.put(`/questions/${questionId}/accepted-answer`, { answerId: answer });
    const { rows: [event] } = await sql.query('SELECT "userId", sequence FROM "ReputationEvent" WHERE "answerId" = $1', [answer]);
    const insert = `INSERT INTO "ReputationEvent"(id, "userId", "questionId", "answerId", delta, reason, sequence) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)`;
    await assert.rejects(sql.query(insert, [event.userId, questionId, answer, P, 'ANSWER_ACCEPTED', event.sequence]), { code: '23505' });
    await assert.rejects(sql.query(insert, [event.userId, questionId, answer, -P, 'ANSWER_ACCEPTED', event.sequence + 1]), { code: '23514' });
  });

  test('aucune route ne permet de modifier son score', async () => {
    const member = await registerMember(server.api, `tricheur_${counter}`);
    assert.equal((await member.browser.patch('/users/me', { terangaPoints: 1000 })).status, 400);
    assert.equal(await points(member), 0);
  });
});
