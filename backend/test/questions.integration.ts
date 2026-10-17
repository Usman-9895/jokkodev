import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import type { Client } from 'pg';
import { createTestDatabase, sqlClient, type TestDatabase } from './support/database';
import { startApp, type TestApp } from './support/app';
import { Browser } from './support/browser';
import { registerMember, seedCatalogue, type Member } from './support/fixtures';

let database: TestDatabase;
let server: TestApp;
let sql: Client;
let awa: Member, moussa: Member, fatou: Member;
let tech: Map<string, string>;
let visitor: Browser;

const question = (title: string, technologies: string[], extra: Record<string, unknown> = {}) => ({
  title, context: 'Une API NestJS répond 500 lors de la connexion.', expected: 'Une réponse 200.', actual: 'Une erreur 500 sans détail.', attempts: 'Relecture des logs et du schéma.',
  technologyIds: technologies.map(slug => tech.get(slug)), ...extra
});

before(async () => {
  database = await createTestDatabase();
  server = await startApp(database.url);
  sql = await sqlClient(database);
  tech = await seedCatalogue(sql);
  [awa, moussa, fatou] = await Promise.all([registerMember(server.api, 'awa_help'), registerMember(server.api, 'moussa_help'), registerMember(server.api, 'fatou_help')]);
  visitor = new Browser(server.api);
});
after(async () => {
  await sql?.end();
  await server?.close();
  await database?.drop();
});

describe('publication et modification', () => {
  test('création par un membre, état initial non résolu, visiteur refusé', async () => {
    assert.equal((await visitor.post('/questions', question('Erreur 500 à la connexion', ['nestjs']))).status, 401);
    const created = await awa.browser.post('/questions', question('Erreur 500 à la connexion', ['nestjs', 'postgresql'], { code: 'await prisma.user.findMany()' }));
    assert.equal(created.status, 201);
    assert.equal(created.body.resolved, false);
    assert.equal(created.body.acceptedAnswerId, null);
    assert.equal(created.body.viewerIsAuthor, true);
    assert.equal(created.body.author.username, 'awa_help');
    assert.deepEqual(created.body.technologies.map((t: { slug: string }) => t.slug), ['nestjs', 'postgresql']);
    const read = await visitor.get(`/questions/${created.body.id}`);
    assert.equal(read.body.viewerIsAuthor, false);
    assert.equal(read.body.code, 'await prisma.user.findMany()');
  });

  test('validation : titre, rubriques, technologies et longueur cumulée', async () => {
    for (const [body, field] of [
      [question('Court', ['nestjs']), 'title'],
      [question('Titre suffisamment long', []), 'technologyIds'],
      [question('Titre suffisamment long', ['go', 'rust', 'java', 'php', 'dart', 'swift']), 'technologyIds'],
      [question('Titre suffisamment long', ['go', 'go']), 'technologyIds'],
      [question('Titre suffisamment long', ['go'], { technologyIds: ['00000000-0000-4000-8000-000000000000'] }), 'technologyIds'],
      [question('Titre suffisamment long', ['go'], { context: '   ' }), 'context'],
      [question('Titre suffisamment long', ['go'], { context: 'x'.repeat(10_000), expected: 'y'.repeat(10_001) }), 'context'],
      [question('Titre suffisamment long', ['go'], { authorId: fatou.id }), 'authorId']
    ] as const) {
      const response = await awa.browser.post('/questions', body);
      assert.equal(response.status, 400, JSON.stringify(response.body));
      assert.ok(field in response.body.fieldErrors, `${field} ${JSON.stringify(response.body.fieldErrors)}`);
    }
  });

  test('seul l’auteur modifie sa question ; l’auteur ne change pas', async () => {
    const { body } = await awa.browser.post('/questions', question('Question à modifier proprement', ['go']));
    const foreign = await moussa.browser.patch(`/questions/${body.id}`, { title: 'Titre détourné par un tiers' });
    assert.equal(foreign.status, 403);
    assert.equal(foreign.body.code, 'NOT_AUTHOR');
    assert.equal((await awa.browser.patch(`/questions/${body.id}`, { authorId: moussa.id })).status, 400);
    const updated = await awa.browser.patch(`/questions/${body.id}`, { title: 'Question modifiée par son auteur', technologyIds: [tech.get('rust')], code: null });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.title, 'Question modifiée par son auteur');
    assert.deepEqual(updated.body.technologies.map((t: { slug: string }) => t.slug), ['rust']);
    assert.equal((await visitor.get('/questions/pas-un-identifiant')).body.code, 'QUESTION_NOT_FOUND');
  });
});

describe('réponses et solution acceptée', () => {
  test('acceptation, remplacement, retrait et répétition gardent un état cohérent', async () => {
    const { body: q } = await awa.browser.post('/questions', question('Comment accepter une solution', ['typescript']));
    const first = (await moussa.browser.post(`/questions/${q.id}/answers`, { body: 'Vérifier la variable DATABASE_URL.' })).body;
    const own = await awa.browser.post(`/questions/${q.id}/answers`, { body: 'Le problème venait de la migration.', code: 'pnpm db:migrate:deploy' });
    assert.equal(own.status, 201);
    assert.equal((await moussa.browser.put(`/questions/${q.id}/accepted-answer`, { answerId: first.id })).body.code, 'NOT_AUTHOR');
    const accepted = await awa.browser.put(`/questions/${q.id}/accepted-answer`, { answerId: first.id });
    assert.equal(accepted.status, 200);
    assert.equal(accepted.body.resolved, true);
    assert.equal(accepted.body.acceptedAnswer.id, first.id);
    assert.equal((await awa.browser.put(`/questions/${q.id}/accepted-answer`, { answerId: first.id })).body.acceptedAnswerId, first.id);
    const replaced = await awa.browser.put(`/questions/${q.id}/accepted-answer`, { answerId: own.body.id });
    assert.equal(replaced.body.acceptedAnswerId, own.body.id);
    const answers = await visitor.get(`/questions/${q.id}/answers`);
    assert.deepEqual(answers.body.data.map((a: { accepted: boolean }) => a.accepted), [false, true]);
    assert.deepEqual(answers.body.meta, { page: 1, pageSize: 20, total: 2 });
    const removed = await awa.browser.delete(`/questions/${q.id}/accepted-answer`);
    assert.deepEqual([removed.body.resolved, removed.body.acceptedAnswerId, removed.body.acceptedAnswer], [false, null, null]);
  });

  test('solution d’une autre question ou masquée refusée', async () => {
    const { body: q1 } = await awa.browser.post('/questions', question('Première question de test', ['go']));
    const { body: q2 } = await moussa.browser.post('/questions', question('Seconde question de test', ['go']));
    const foreign = (await fatou.browser.post(`/questions/${q2.id}/answers`, { body: 'Réponse à la seconde question.' })).body;
    const rejected = await awa.browser.put(`/questions/${q1.id}/accepted-answer`, { answerId: foreign.id });
    assert.equal(rejected.status, 400);
    assert.equal(rejected.body.code, 'ANSWER_NOT_ELIGIBLE');
    const hidden = (await fatou.browser.post(`/questions/${q1.id}/answers`, { body: 'Réponse bientôt masquée.' })).body;
    await sql.query(`UPDATE "Answer" SET visibility = 'HIDDEN' WHERE id = $1`, [hidden.id]);
    assert.equal((await awa.browser.put(`/questions/${q1.id}/accepted-answer`, { answerId: hidden.id })).body.code, 'ANSWER_NOT_ELIGIBLE');
  });

  test('acceptations concurrentes : une seule solution valide', async () => {
    const { body: q } = await awa.browser.post('/questions', question('Question disputée en parallèle', ['python']));
    const ids = await Promise.all([moussa, fatou, moussa, fatou].map(async (m, i) => (await m.browser.post(`/questions/${q.id}/answers`, { body: `Proposition numéro ${i + 1} détaillée.` })).body.id as string));
    const results = await Promise.all(ids.map(answerId => awa.browser.put(`/questions/${q.id}/accepted-answer`, { answerId })));
    assert.ok(results.every(r => r.status === 200));
    const final = (await visitor.get(`/questions/${q.id}`)).body;
    assert.ok(ids.includes(final.acceptedAnswerId));
    const accepted = (await visitor.get(`/questions/${q.id}/answers`)).body.data.filter((a: { accepted: boolean }) => a.accepted);
    assert.equal(accepted.length, 1);
  });

  test('seul l’auteur modifie sa réponse, sans changer de question', async () => {
    const { body: q } = await awa.browser.post('/questions', question('Question pour modifier une réponse', ['php']));
    const { body: a } = await moussa.browser.post(`/questions/${q.id}/answers`, { body: 'Réponse initiale détaillée.' });
    assert.equal((await awa.browser.patch(`/answers/${a.id}`, { body: 'Réécriture par un tiers.' })).status, 403);
    assert.equal((await moussa.browser.patch(`/answers/${a.id}`, { questionId: q.id })).status, 400);
    const updated = await moussa.browser.patch(`/answers/${a.id}`, { body: 'Réponse corrigée par son auteur.' });
    assert.equal(updated.body.body, 'Réponse corrigée par son auteur.');
    assert.equal((await moussa.browser.post(`/questions/${q.id}/answers`, { body: 'court' })).status, 400);
  });
});

describe('recherche, filtres et visibilité', () => {
  test('recherche, filtres combinés, pagination et résultat vide', async () => {
    const author = await registerMember(server.api, 'auteur_recherche');
    const a = (await author.browser.post('/questions', question('Kotlin coroutine bloquée sur Android', ['kotlin', 'android']))).body;
    await author.browser.post('/questions', question('Kotlin Flow ne se termine pas', ['kotlin']));
    await author.browser.post('/questions', question('Flutter état perdu au retour', ['flutter']));
    const answer = (await moussa.browser.post(`/questions/${a.id}/answers`, { body: 'Utiliser Dispatchers.IO pour l’appel.' })).body;
    await author.browser.put(`/questions/${a.id}/accepted-answer`, { answerId: answer.id });
    const kotlin = await visitor.get('/questions?technology=kotlin');
    assert.equal(kotlin.body.meta.total, 2);
    assert.equal((await visitor.get('/questions?technology=Kotlin&status=resolved')).body.data[0].id, a.id);
    assert.equal((await visitor.get('/questions?technology=kotlin&status=open')).body.meta.total, 1);
    assert.equal((await visitor.get('/questions?q=coroutine%20ANDROID')).body.data[0].id, a.id);
    assert.equal((await visitor.get('/questions?q=coroutine%20flutter')).body.meta.total, 0);
    const paged = await visitor.get('/questions?technology=kotlin&pageSize=1&page=2');
    assert.deepEqual(paged.body.meta, { page: 2, pageSize: 1, total: 2 });
    assert.equal(paged.body.data.length, 1);
    assert.equal((await visitor.get('/questions?pageSize=51')).status, 400);
    assert.equal((await visitor.get('/questions?status=peut-etre')).status, 400);
    assert.equal((await visitor.get("/questions?q=%27%3B%20DROP%20TABLE%20%22Question%22%3B--")).body.meta.total, 0);
    assert.equal((await visitor.get('/questions?q=%25')).body.meta.total, 0);
  });

  test('recherche par pseudonyme ou technologie et filtre par nom affiché, comme le frontend', async () => {
    const author = await registerMember(server.api, 'auteur_rust');
    const { body } = await author.browser.post('/questions', question('Emprunt mutable refusé par le compilateur', ['rust']));
    assert.equal((await visitor.get('/questions?q=auteur_rust')).body.data[0].id, body.id);
    assert.equal((await visitor.get('/questions?q=compilateur%20Rust')).body.data[0].id, body.id);
    assert.equal((await visitor.get('/questions?technology=RUST')).body.data[0].id, body.id);
    assert.equal((await visitor.get('/questions?technology=inconnue')).body.meta.total, 0);
  });

  test('langage de l’extrait de code conservé, effacé avec le code', async () => {
    const coder = await registerMember(server.api, 'auteur_code');
    const { body } = await coder.browser.post('/questions', question('Question avec un extrait TypeScript', ['typescript'], { code: 'const a: number = 1;', codeLanguage: 'TypeScript' }));
    assert.equal(body.codeLanguage, 'TypeScript');
    assert.equal((await coder.browser.patch(`/questions/${body.id}`, { title: 'Titre modifié sans toucher au code' })).body.codeLanguage, 'TypeScript');
    const cleared = await coder.browser.patch(`/questions/${body.id}`, { code: null });
    assert.deepEqual([cleared.body.code, cleared.body.codeLanguage], [null, null]);
    const withoutCode = await coder.browser.post('/questions', question('Langage sans aucun extrait de code', ['go'], { codeLanguage: 'Go' }));
    assert.equal(withoutCode.body.codeLanguage, null);
    assert.equal((await coder.browser.post('/questions', question('Langage avec balise interdite', ['go'], { code: 'x', codeLanguage: '<script>' }))).status, 400);
    const { body: answer } = await moussa.browser.post(`/questions/${body.id}/answers`, { body: 'Réponse avec un extrait Python.', code: 'print(1)', codeLanguage: 'Python' });
    assert.equal(answer.codeLanguage, 'Python');
  });

  test('contenu avec balises conservé tel quel, jamais transformé en HTML', async () => {
    const payload = '<script>alert(1)</script><img src=x onerror=alert(2)>';
    const { body } = await awa.browser.post('/questions', question('Question avec balises HTML', ['html'], { context: payload, code: payload }));
    const read = await fetch(`${server.api}/questions/${body.id}`);
    assert.match(read.headers.get('content-type') ?? '', /^application\/json/);
    const json = await read.json();
    assert.equal(json.context, payload);
    assert.equal(json.code, payload);
  });

  test('question masquée : inaccessible avec ses réponses, y compris par lien direct et profil', async () => {
    const { body: q } = await fatou.browser.post('/questions', question('Question qui sera masquée', ['sql']));
    const { body: a } = await moussa.browser.post(`/questions/${q.id}/answers`, { body: 'Réponse sur une question masquée.' });
    await sql.query(`UPDATE "Question" SET visibility = 'HIDDEN' WHERE id = $1`, [q.id]);
    assert.equal((await visitor.get(`/questions/${q.id}`)).status, 404);
    assert.equal((await visitor.get(`/questions/${q.id}/answers`)).status, 404);
    assert.equal((await moussa.browser.post(`/questions/${q.id}/answers`, { body: 'Nouvelle réponse refusée.' })).status, 404);
    assert.equal((await fatou.browser.patch(`/questions/${q.id}`, { title: 'Modification après masquage' })).status, 404);
    assert.equal((await moussa.browser.patch(`/answers/${a.id}`, { body: 'Modification refusée ici.' })).status, 404);
    assert.ok(!(await visitor.get('/questions?technology=sql')).body.data.some((x: { id: string }) => x.id === q.id));
    assert.ok(!(await visitor.get(`/users/${moussa.id}/answers?pageSize=50`)).body.data.some((x: { id: string }) => x.id === a.id));
    assert.ok(!(await visitor.get(`/users/${fatou.id}/questions`)).body.data.some((x: { id: string }) => x.id === q.id));
    const own = (await fatou.browser.get('/users/me/questions')).body.data.find((x: { id: string }) => x.id === q.id);
    assert.equal(own.visibility, 'HIDDEN');
  });

  test('contributions publiques d’un profil', async () => {
    const member = await registerMember(server.api, 'contributeur');
    const { body: q } = await member.browser.post('/questions', question('Question du contributeur', ['docker']));
    await member.browser.post(`/questions/${q.id}/answers`, { body: 'Auto-réponse du contributeur.' });
    assert.equal((await visitor.get(`/users/${member.id}/questions`)).body.meta.total, 1);
    const answers = (await visitor.get(`/users/${member.id}/answers`)).body;
    assert.equal(answers.data[0].questionTitle, 'Question du contributeur');
    assert.equal((await member.browser.get('/users/me/questions?status=resolved')).body.meta.total, 0);
    assert.equal((await visitor.get('/users/00000000-0000-4000-8000-000000000000/questions')).status, 404);
    assert.equal((await visitor.get('/users/me/questions')).status, 401);
  });
});
