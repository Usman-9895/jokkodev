import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import type { Client } from 'pg';
import { createTestDatabase, sqlClient, type TestDatabase } from './support/database';
import { startApp, type TestApp } from './support/app';
import { Browser } from './support/browser';
import { registerAdmin, registerMember, seedCatalogue } from './support/fixtures';

let database: TestDatabase;
let server: TestApp;
let sql: Client;
let tech: Map<string, string>;
let visitor: Browser;
let counter = 0;

const SECRET_MESSAGE = 'Message privé : je suis disponible le soir et le week-end.';

before(async () => {
  database = await createTestDatabase();
  server = await startApp(database.url);
  sql = await sqlClient(database);
  tech = await seedCatalogue(sql);
  visitor = new Browser(server.api);
});
after(async () => {
  await sql?.end();
  await server?.close();
  await database?.drop();
});

async function scenario(recruitmentStatus = 'OPEN') {
  counter += 1;
  const [owner, candidate] = await Promise.all([registerMember(server.api, `resp_${counter}`), registerMember(server.api, `cand_${counter}`)]);
  const { body: project } = await owner.browser.post('/projects', { title: `Projet de candidature ${counter}`, objective: 'Construire un outil de suivi des cotisations pour une tontine.', technologyIds: [tech.get('react')], recruitmentStatus });
  return { owner, candidate, project };
}
async function membership(projectId: string, userId: string): Promise<number> {
  return (await sql.query('SELECT count(*)::int AS n FROM "ProjectMember" WHERE "projectId" = $1 AND "userId" = $2', [projectId, userId])).rows[0].n;
}

describe('parcours candidat et responsable', () => {
  test('candidature, suivi des deux côtés, acceptation et nouveau membre visible', async () => {
    const { owner, candidate, project } = await scenario();
    assert.equal((await visitor.post(`/projects/${project.id}/applications`, { message: SECRET_MESSAGE })).status, 401);
    const created = await candidate.browser.post(`/projects/${project.id}/applications`, { message: SECRET_MESSAGE });
    assert.equal(created.status, 201);
    assert.equal(created.body.status, 'PENDING');
    assert.equal(created.body.viewerRole, 'APPLICANT');
    assert.deepEqual((await candidate.browser.get(`/projects/${project.id}`)).body.viewerApplication, { id: created.body.id, status: 'PENDING' });
    const received = await owner.browser.get(`/projects/${project.id}/applications?status=PENDING`);
    assert.equal(received.body.data[0].message, SECRET_MESSAGE);
    assert.equal(received.body.data[0].viewerRole, 'OWNER');
    assert.equal((await candidate.browser.get('/users/me/applications')).body.data[0].project.title, project.title);
    const accepted = await owner.browser.patch(`/applications/${created.body.id}`, { status: 'ACCEPTED' });
    assert.equal(accepted.status, 200);
    assert.equal(accepted.body.status, 'ACCEPTED');
    assert.ok(accepted.body.decidedAt);
    const members = (await visitor.get(`/projects/${project.id}/members`)).body.data.map((m: { id: string }) => m.id);
    assert.deepEqual(members, [owner.id, candidate.id]);
    assert.equal((await candidate.browser.get(`/projects/${project.id}`)).body.viewerRole, 'MEMBER');
    assert.equal((await candidate.browser.get(`/applications/${created.body.id}`)).body.status, 'ACCEPTED');
  });

  test('le message reste privé : absent des vues publiques et refusé aux tiers', async () => {
    const { owner, candidate, project } = await scenario();
    const { body: application } = await candidate.browser.post(`/projects/${project.id}/applications`, { message: SECRET_MESSAGE });
    const third = await registerMember(server.api, `tiers_${counter}`);
    const admin = await registerAdmin(server.api, sql, `admin_cand_${counter}`);
    for (const path of [`/projects/${project.id}`, `/projects/${project.id}/members`, '/projects', `/users/${candidate.id}/projects`]) {
      assert.doesNotMatch(JSON.stringify((await visitor.get(path)).body), /Message privé/);
    }
    assert.equal((await third.browser.get(`/applications/${application.id}`)).status, 404);
    assert.equal((await admin.browser.get(`/applications/${application.id}`)).status, 404);
    assert.equal((await third.browser.get(`/projects/${project.id}/applications`)).body.code, 'NOT_OWNER');
    assert.equal((await third.browser.patch(`/applications/${application.id}`, { status: 'ACCEPTED' })).status, 404);
    assert.equal((await owner.browser.get(`/applications/${application.id}`)).body.message, SECRET_MESSAGE);
  });
});

describe('règles de candidature', () => {
  test('doubles envois simultanés : une seule demande', async () => {
    const { candidate, project } = await scenario();
    const results = await Promise.all([1, 2, 3].map(() => candidate.browser.post(`/projects/${project.id}/applications`, { message: SECRET_MESSAGE })));
    assert.deepEqual(results.map(r => r.status).sort(), [201, 409, 409]);
    assert.ok(results.filter(r => r.status === 409).every(r => r.body.code === 'APPLICATION_EXISTS'));
    assert.equal((await sql.query('SELECT count(*)::int AS n FROM "Application" WHERE "projectId" = $1', [project.id])).rows[0].n, 1);
  });

  test('propre projet, membre existant, recrutement fermé, projet masqué et nouvelle demande après refus', async () => {
    const { owner, candidate, project } = await scenario();
    assert.equal((await owner.browser.post(`/projects/${project.id}/applications`, { message: SECRET_MESSAGE })).body.code, 'OWN_PROJECT');
    const { body: application } = await candidate.browser.post(`/projects/${project.id}/applications`, { message: SECRET_MESSAGE });
    await owner.browser.patch(`/applications/${application.id}`, { status: 'REJECTED' });
    assert.equal((await candidate.browser.post(`/projects/${project.id}/applications`, { message: SECRET_MESSAGE })).body.code, 'APPLICATION_EXISTS');
    const member = await registerMember(server.api, `deja_membre_${counter}`);
    await sql.query('INSERT INTO "ProjectMember"("projectId", "userId") VALUES ($1, $2)', [project.id, member.id]);
    assert.equal((await member.browser.post(`/projects/${project.id}/applications`, { message: SECRET_MESSAGE })).body.code, 'ALREADY_MEMBER');
    const closed = await scenario('CLOSED');
    assert.equal((await closed.candidate.browser.post(`/projects/${closed.project.id}/applications`, { message: SECRET_MESSAGE })).body.code, 'RECRUITMENT_CLOSED');
    const hidden = await scenario();
    await sql.query(`UPDATE "Project" SET visibility = 'HIDDEN' WHERE id = $1`, [hidden.project.id]);
    assert.equal((await hidden.candidate.browser.post(`/projects/${hidden.project.id}/applications`, { message: SECRET_MESSAGE })).status, 404);
    assert.equal((await candidate.browser.post(`/projects/${project.id}/applications`, { message: 'trop court' })).status, 400);
  });

  test('fermeture du recrutement : nouvelles demandes bloquées, demandes en attente traitables', async () => {
    const { owner, candidate, project } = await scenario();
    const { body: application } = await candidate.browser.post(`/projects/${project.id}/applications`, { message: SECRET_MESSAGE });
    await owner.browser.patch(`/projects/${project.id}`, { recruitmentStatus: 'CLOSED' });
    const late = await registerMember(server.api, `tardif_${counter}`);
    assert.equal((await late.browser.post(`/projects/${project.id}/applications`, { message: SECRET_MESSAGE })).body.code, 'RECRUITMENT_CLOSED');
    assert.equal((await candidate.browser.get(`/applications/${application.id}`)).body.status, 'PENDING');
    assert.equal((await owner.browser.patch(`/applications/${application.id}`, { status: 'ACCEPTED' })).body.status, 'ACCEPTED');
    assert.equal(await membership(project.id, candidate.id), 1);
  });

  test('candidatures concurrentes d’une fermeture : jamais d’erreur ni d’état incohérent', async () => {
    for (let round = 0; round < 5; round++) {
      const { owner, candidate, project } = await scenario();
      const [applied, closed] = await Promise.all([
        candidate.browser.post(`/projects/${project.id}/applications`, { message: SECRET_MESSAGE }),
        owner.browser.patch(`/projects/${project.id}`, { recruitmentStatus: 'CLOSED' })
      ]);
      assert.equal(closed.status, 200);
      assert.ok(applied.status === 201 || applied.body.code === 'RECRUITMENT_CLOSED', JSON.stringify(applied.body));
    }
  });
});

describe('transitions', () => {
  test('chaque partie n’a que ses décisions ; un état terminal ne change plus', async () => {
    const { owner, candidate, project } = await scenario();
    const { body: application } = await candidate.browser.post(`/projects/${project.id}/applications`, { message: SECRET_MESSAGE });
    assert.equal((await candidate.browser.patch(`/applications/${application.id}`, { status: 'ACCEPTED' })).body.code, 'TRANSITION_FORBIDDEN');
    assert.equal((await owner.browser.patch(`/applications/${application.id}`, { status: 'WITHDRAWN' })).body.code, 'TRANSITION_FORBIDDEN');
    assert.equal((await owner.browser.patch(`/applications/${application.id}`, { status: 'PENDING' })).status, 400);
    assert.equal((await candidate.browser.patch(`/applications/${application.id}`, { status: 'WITHDRAWN' })).body.status, 'WITHDRAWN');
    assert.equal((await candidate.browser.patch(`/applications/${application.id}`, { status: 'WITHDRAWN' })).status, 200);
    const late = await owner.browser.patch(`/applications/${application.id}`, { status: 'ACCEPTED' });
    assert.equal(late.status, 409);
    assert.equal(late.body.code, 'INVALID_TRANSITION');
    assert.equal(await membership(project.id, candidate.id), 0);
  });

  test('acceptations répétées et décisions simultanées : une seule issue, une seule adhésion', async () => {
    const twice = await scenario();
    const { body: first } = await twice.candidate.browser.post(`/projects/${twice.project.id}/applications`, { message: SECRET_MESSAGE });
    const repeated = await Promise.all([1, 2, 3].map(() => twice.owner.browser.patch(`/applications/${first.id}`, { status: 'ACCEPTED' })));
    assert.ok(repeated.every(r => r.status === 200 && r.body.status === 'ACCEPTED'));
    assert.equal(await membership(twice.project.id, twice.candidate.id), 1);
    for (let round = 0; round < 5; round++) {
      const { owner, candidate, project } = await scenario();
      const { body: application } = await candidate.browser.post(`/projects/${project.id}/applications`, { message: SECRET_MESSAGE });
      const results = await Promise.all([
        owner.browser.patch(`/applications/${application.id}`, { status: 'ACCEPTED' }),
        owner.browser.patch(`/applications/${application.id}`, { status: 'REJECTED' }),
        candidate.browser.patch(`/applications/${application.id}`, { status: 'WITHDRAWN' })
      ]);
      assert.equal(results.filter(r => r.status === 200).length, 1);
      assert.ok(results.filter(r => r.status !== 200).every(r => r.body.code === 'INVALID_TRANSITION'));
      const final = (await candidate.browser.get(`/applications/${application.id}`)).body.status;
      assert.equal(await membership(project.id, candidate.id), final === 'ACCEPTED' ? 1 : 0);
    }
  });

  test('projet masqué : statut minimal pour le candidat, décisions bloquées', async () => {
    const { owner, candidate, project } = await scenario();
    const { body: application } = await candidate.browser.post(`/projects/${project.id}/applications`, { message: SECRET_MESSAGE });
    await sql.query(`UPDATE "Project" SET visibility = 'HIDDEN' WHERE id = $1`, [project.id]);
    const tracked = (await candidate.browser.get('/users/me/applications')).body.data[0];
    assert.deepEqual(tracked.project, { id: project.id, available: false, title: null, recruitmentStatus: null, owner: null });
    assert.equal((await owner.browser.patch(`/applications/${application.id}`, { status: 'ACCEPTED' })).status, 404);
    assert.equal((await owner.browser.get(`/projects/${project.id}/applications`)).status, 404);
    assert.equal((await candidate.browser.patch(`/applications/${application.id}`, { status: 'WITHDRAWN' })).body.status, 'WITHDRAWN');
  });
});
