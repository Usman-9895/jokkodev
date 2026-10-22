import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import type { Client } from 'pg';
import { createTestDatabase, sqlClient, type TestDatabase } from './support/database';
import { startApp, type TestApp } from './support/app';
import { Browser } from './support/browser';
import { PASSWORD, registerAdmin, registerMember, seedCatalogue, type Member } from './support/fixtures';

let database: TestDatabase;
let server: TestApp;
let sql: Client;
let tech: Map<string, string>;
let visitor: Browser;
let admin: Member, reporter: Member;
let counter = 0;

const REASON = 'Contenu hors sujet et agressif envers un membre.';

before(async () => {
  database = await createTestDatabase();
  server = await startApp(database.url);
  sql = await sqlClient(database);
  tech = await seedCatalogue(sql);
  visitor = new Browser(server.api);
  [admin, reporter] = await Promise.all([registerAdmin(server.api, sql, 'admin_mod'), registerMember(server.api, 'declarant')]);
});
after(async () => {
  await sql?.end();
  await server?.close();
  await database?.drop();
});

async function author(): Promise<Member> { counter += 1; return registerMember(server.api, `auteur_mod_${counter}`); }
async function questionBy(member: Member): Promise<string> {
  const { body } = await member.browser.post('/questions', { title: `Question à modérer ${counter}`, context: 'Contexte du problème signalé.', expected: 'Attendu.', actual: 'Obtenu.', attempts: 'Essais.', technologyIds: [tech.get('go')] });
  return body.id;
}
async function report(targetType: string, targetId: string, by = reporter) {
  return by.browser.post('/reports', { targetType, targetId, reason: REASON });
}

describe('signalement par un membre', () => {
  test('création, contenu toujours visible, doublon ouvert refusé', async () => {
    const owner = await author();
    const questionId = await questionBy(owner);
    assert.equal((await visitor.post('/reports', { targetType: 'QUESTION', targetId: questionId, reason: REASON })).status, 401);
    const created = await report('QUESTION', questionId);
    assert.equal(created.status, 201);
    assert.deepEqual([created.body.status, created.body.targetType, created.body.targetId], ['OPEN', 'QUESTION', questionId]);
    assert.equal((await visitor.get(`/questions/${questionId}`)).status, 200);
    const again = await report('QUESTION', questionId);
    assert.equal(again.status, 409);
    assert.equal(again.body.code, 'REPORT_ALREADY_OPEN');
    assert.doesNotMatch(JSON.stringify((await visitor.get(`/questions/${questionId}`)).body), /hors sujet|declarant/);
  });

  test('envois simultanés : un seul signalement ouvert', async () => {
    const questionId = await questionBy(await author());
    const member = await registerMember(server.api, `simultane_${counter}`);
    const results = await Promise.all([1, 2, 3].map(() => report('QUESTION', questionId, member)));
    assert.deepEqual(results.map(r => r.status).sort(), [201, 409, 409]);
  });

  test('cible inexistante, masquée ou mal formée refusée', async () => {
    assert.equal((await report('PROJECT', '00000000-0000-4000-8000-000000000000')).body.code, 'TARGET_NOT_FOUND');
    const questionId = await questionBy(await author());
    await sql.query(`UPDATE "Question" SET visibility = 'HIDDEN' WHERE id = $1`, [questionId]);
    assert.equal((await report('QUESTION', questionId)).status, 404);
    assert.equal((await reporter.browser.post('/reports', { targetType: 'USER', targetId: reporter.id, reason: REASON })).status, 400);
    assert.equal((await reporter.browser.post('/reports', { targetType: 'QUESTION', targetId: questionId, reason: 'court' })).status, 400);
  });
});

describe('interdiction de signaler son propre contenu', () => {
  for (const role of ['MEMBER', 'ADMIN'] as const) test(role+' cannot self-report any target, even with a previous open report', async () => {
    const owner = role === 'ADMIN' ? admin : await author();
    const questionId = await questionBy(owner);
    const answer = await owner.browser.post('/questions/'+questionId+'/answers', { body: 'Réponse de son propre auteur pour la règle de signalement.' });
    assert.equal(answer.status, 201);
    const project = await owner.browser.post('/projects', { title: 'Projet pour refus auto signalement '+role, objective: 'Un projet jetable pour vérifier que seul un tiers peut signaler le contenu.', technologyIds: [tech.get('go')] });
    assert.equal(project.status, 201);
    for (const [type, id, column] of [['QUESTION', questionId, 'questionId'], ['ANSWER', answer.body.id, 'answerId'], ['PROJECT', project.body.id, 'projectId']]) {
      const before = (await sql.query('SELECT count(*)::int n FROM "Report" WHERE "'+column+'"=$1', [id])).rows[0].n;
      const response = await report(type, id, owner);
      assert.equal(response.status, 403);
      assert.equal(response.body.code, 'SELF_REPORT_FORBIDDEN');
      assert.equal((await sql.query('SELECT count(*)::int n FROM "Report" WHERE "'+column+'"=$1', [id])).rows[0].n, before);
    }
    // Existing reports are preserved, including historical self-reports.
    await sql.query('INSERT INTO "Report"(id,"reporterId","questionId",reason) VALUES(gen_random_uuid(),$1,$2,$3)', [owner.id, questionId, REASON]);
    assert.equal((await report('QUESTION', questionId, owner)).body.code, 'SELF_REPORT_FORBIDDEN');
    assert.equal((await sql.query('SELECT count(*)::int n FROM "Report" WHERE "reporterId"=$1 AND "questionId"=$2', [owner.id, questionId])).rows[0].n, 1);
  });
  test('question author can report another author’s answer; answer author cannot', async () => {
    const owner=await author(), responder=await author();
    const questionId=await questionBy(owner);
    const answer=await responder.browser.post('/questions/'+questionId+'/answers',{body:'Une réponse dont l’auteur diffère de celui de la question.'});
    assert.equal(answer.status,201);
    assert.equal((await report('ANSWER',answer.body.id,owner)).status,201);
    assert.equal((await report('ANSWER',answer.body.id,responder)).body.code,'SELF_REPORT_FORBIDDEN');
    assert.equal((await report('ANSWER',answer.body.id,owner)).body.code,'REPORT_ALREADY_OPEN');
    await sql.query('UPDATE "Answer" SET visibility=$1 WHERE id=$2',['HIDDEN',answer.body.id]);
    assert.equal((await report('ANSWER',answer.body.id,owner)).body.code,'TARGET_NOT_FOUND');
  });
});

describe('administration réservée', () => {
  test('un membre ou un visiteur est refusé sur toutes les routes admin', async () => {
    const id = '00000000-0000-4000-8000-000000000000';
    const routes: [string, string, unknown?][] = [
      ['GET', '/admin/reports'], ['GET', `/admin/reports/${id}`], ['POST', `/admin/reports/${id}/resolve`, { decision: 'NO_ACTION', reason: REASON }],
      ['POST', '/admin/moderation-actions', { decision: 'HIDE_CONTENT', targetType: 'QUESTION', targetId: id, reason: REASON }], ['GET', '/admin/moderation-actions']
    ];
    for (const [method, path, body] of routes) {
      const asMember = method === 'GET' ? await reporter.browser.get(path) : await reporter.browser.post(path, body);
      assert.equal(asMember.status, 403, path);
      const asVisitor = method === 'GET' ? await visitor.get(path) : await visitor.post(path, body);
      assert.equal(asVisitor.status, 401, path);
    }
  });
});

describe('traitement des signalements', () => {
  test('clôture sans action : contenu inchangé, décision tracée, second traitement refusé', async () => {
    const owner = await author();
    const questionId = await questionBy(owner);
    const { body: created } = await report('QUESTION', questionId);
    const list = await admin.browser.get('/admin/reports?status=OPEN');
    const item = list.body.data.find((r: { id: string }) => r.id === created.id);
    assert.equal(item.reason, REASON);
    assert.equal(item.reporter.username, 'declarant');
    assert.equal(item.target.author.id, owner.id);
    const resolved = await admin.browser.post(`/admin/reports/${created.id}/resolve`, { decision: 'NO_ACTION', reason: 'Signalement examiné, aucun abus constaté.' });
    assert.equal(resolved.status, 200);
    assert.deepEqual([resolved.body.status, resolved.body.decision, resolved.body.closedBy.id], ['CLOSED', 'NO_ACTION', admin.id]);
    assert.equal(resolved.body.history[0].decision, 'NO_ACTION');
    assert.equal((await visitor.get(`/questions/${questionId}`)).status, 200);
    assert.equal((await admin.browser.post(`/admin/reports/${created.id}/resolve`, { decision: 'HIDE_CONTENT', reason: REASON })).body.code, 'REPORT_ALREADY_CLOSED');
    assert.equal((await report('QUESTION', questionId)).status, 201);
  });

  test('masquer la solution acceptée rend la question non résolue et retire la réponse des vues publiques', async () => {
    const owner = await author();
    const helper = await author();
    const questionId = await questionBy(owner);
    const { body: answer } = await helper.browser.post(`/questions/${questionId}/answers`, { body: 'Réponse acceptée puis masquée.' });
    await owner.browser.put(`/questions/${questionId}/accepted-answer`, { answerId: answer.id });
    const { body: created } = await report('ANSWER', answer.id);
    const resolved = await admin.browser.post(`/admin/reports/${created.id}/resolve`, { decision: 'HIDE_CONTENT', reason: 'Réponse contenant un lien malveillant.' });
    assert.equal(resolved.body.target.visibility, 'HIDDEN');
    const question = (await visitor.get(`/questions/${questionId}`)).body;
    assert.deepEqual([question.resolved, question.acceptedAnswerId, question.answerCount], [false, null, 0]);
    assert.equal((await visitor.get(`/questions/${questionId}/answers`)).body.meta.total, 0);
    assert.equal((await visitor.get(`/users/${helper.id}`)).body.stats.answers, 0);
    assert.equal((await visitor.get(`/questions?status=resolved&q=${encodeURIComponent(`modérer ${counter}`)}`)).body.meta.total, 0);
  });

  test('masquage concurrent d’une acceptation : une réponse masquée ne reste jamais solution', async () => {
    for (let round = 0; round < 5; round++) {
      const owner = await author();
      const helper = await author();
      const questionId = await questionBy(owner);
      const { body: answer } = await helper.browser.post(`/questions/${questionId}/answers`, { body: 'Réponse disputée entre acceptation et masquage.' });
      await Promise.all([
        owner.browser.put(`/questions/${questionId}/accepted-answer`, { answerId: answer.id }),
        admin.browser.post('/admin/moderation-actions', { decision: 'HIDE_CONTENT', targetType: 'ANSWER', targetId: answer.id, reason: 'Masquage concurrent pour le test.' })
      ]);
      const { rows } = await sql.query('SELECT q."acceptedAnswerId", a.visibility::text AS visibility FROM "Question" q JOIN "Answer" a ON a.id = $2 WHERE q.id = $1', [questionId, answer.id]);
      assert.equal(rows[0].visibility, 'HIDDEN');
      assert.equal(rows[0].acceptedAnswerId, null);
    }
  });

  test('suspension : session ouverte coupée, connexion refusée, contenus toujours visibles', async () => {
    const owner = await author();
    const { body: project } = await owner.browser.post('/projects', { title: 'Projet dont l’auteur sera suspendu', objective: 'Objectif détaillé du projet à signaler pour test.', technologyIds: [tech.get('go')] });
    const { body: created } = await report('PROJECT', project.id);
    const resolved = await admin.browser.post(`/admin/reports/${created.id}/resolve`, { decision: 'SUSPEND_ACCOUNT', reason: 'Spam répété malgré plusieurs avertissements.' });
    assert.equal(resolved.status, 200);
    assert.equal(resolved.body.target.author.status, 'SUSPENDED');
    assert.deepEqual(resolved.body.history[0].target, { type: 'USER', id: owner.id });
    assert.equal((await owner.browser.get('/auth/me')).status, 401);
    assert.equal((await owner.browser.post('/questions', { title: 'Publication après suspension' })).status, 401);
    assert.equal((await new Browser(server.api).post('/auth/login', { email: owner.email, password: PASSWORD })).body.code, 'ACCOUNT_SUSPENDED');
    assert.equal((await visitor.get(`/projects/${project.id}`)).status, 200);
  });

  test('décisions simultanées de deux administrateurs : une seule décision', async () => {
    const second = await registerAdmin(server.api, sql, `admin_bis_${counter}`);
    const questionId = await questionBy(await author());
    const { body: created } = await report('QUESTION', questionId);
    const results = await Promise.all([
      admin.browser.post(`/admin/reports/${created.id}/resolve`, { decision: 'HIDE_CONTENT', reason: 'Décision du premier administrateur.' }),
      second.browser.post(`/admin/reports/${created.id}/resolve`, { decision: 'NO_ACTION', reason: 'Décision du second administrateur.' })
    ]);
    assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
    assert.equal((await sql.query('SELECT count(*)::int AS n FROM "ModerationAction" WHERE "reportId" = $1', [created.id])).rows[0].n, 1);
    const winner = results.find(r => r.status === 200)?.body.decision;
    assert.equal((await visitor.get(`/questions/${questionId}`)).status, winner === 'HIDE_CONTENT' ? 404 : 200);
  });

  test('détail : contexte, signalements ouverts sur la cible et historique', async () => {
    const questionId = await questionBy(await author());
    const other = await registerMember(server.api, `second_declarant_${counter}`);
    const { body: first } = await report('QUESTION', questionId);
    await report('QUESTION', questionId, other);
    const detail = await admin.browser.get(`/admin/reports/${first.id}`);
    assert.equal(detail.body.openReportsOnTarget, 2);
    assert.equal(detail.body.target.excerpt, 'Contexte du problème signalé.');
    assert.equal((await admin.browser.get('/admin/reports/00000000-0000-4000-8000-000000000000')).body.code, 'REPORT_NOT_FOUND');
  });
});

describe('actions directes', () => {
  test('masquer un projet bloque candidatures et exposition ; action répétée refusée', async () => {
    const owner = await author();
    const candidate = await author();
    const { body: project } = await owner.browser.post('/projects', { title: 'Projet masqué par action directe', objective: 'Objectif détaillé du projet masqué directement.', technologyIds: [tech.get('go')] });
    const hidden = await admin.browser.post('/admin/moderation-actions', { decision: 'HIDE_CONTENT', targetType: 'PROJECT', targetId: project.id, reason: 'Projet frauduleux signalé par email.' });
    assert.equal(hidden.status, 201);
    assert.deepEqual(hidden.body.target, { type: 'PROJECT', id: project.id });
    assert.equal((await visitor.get(`/projects/${project.id}`)).status, 404);
    assert.equal((await candidate.browser.post(`/projects/${project.id}/applications`, { message: 'Je souhaite rejoindre ce projet masqué.' })).status, 404);
    assert.equal((await admin.browser.post('/admin/moderation-actions', { decision: 'HIDE_CONTENT', targetType: 'PROJECT', targetId: project.id, reason: REASON })).body.code, 'ALREADY_HIDDEN');
    const history = (await admin.browser.get('/admin/moderation-actions')).body.data;
    assert.equal(history[0].id, hidden.body.id);
  });

  test('suspension directe d’un compte ; cible incompatible et administrateur refusés', async () => {
    const target = await author();
    const suspended = await admin.browser.post('/admin/moderation-actions', { decision: 'SUSPEND_ACCOUNT', targetType: 'USER', targetId: target.id, reason: 'Usurpation d’identité confirmée.' });
    assert.equal(suspended.status, 201);
    assert.equal((await target.browser.get('/auth/me')).status, 401);
    assert.equal((await admin.browser.post('/admin/moderation-actions', { decision: 'SUSPEND_ACCOUNT', targetType: 'USER', targetId: target.id, reason: REASON })).body.code, 'ALREADY_SUSPENDED');
    assert.equal((await admin.browser.post('/admin/moderation-actions', { decision: 'SUSPEND_ACCOUNT', targetType: 'QUESTION', targetId: target.id, reason: REASON })).status, 400);
    assert.equal((await admin.browser.post('/admin/moderation-actions', { decision: 'SUSPEND_ACCOUNT', targetType: 'USER', targetId: admin.id, reason: REASON })).body.code, 'CANNOT_SUSPEND_ADMIN');
  });
});
