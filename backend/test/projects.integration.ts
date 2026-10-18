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
let owner: Member, other: Member;
let tech: Map<string, string>;
let visitor: Browser;

const project = (title: string, technologies: string[], extra: Record<string, unknown> = {}) => ({
  title, objective: 'Construire une application de covoiturage pour les étudiants de Dakar.', technologyIds: technologies.map(slug => tech.get(slug)), availability: 'Cinq heures par semaine', ...extra
});

before(async () => {
  database = await createTestDatabase();
  server = await startApp(database.url);
  sql = await sqlClient(database);
  tech = await seedCatalogue(sql);
  [owner, other] = await Promise.all([registerMember(server.api, 'resp_projet'), registerMember(server.api, 'autre_projet')]);
  visitor = new Browser(server.api);
});
after(async () => {
  await sql?.end();
  await server?.close();
  await database?.drop();
});

describe('publication', () => {
  test('le responsable est la session et devient membre une seule fois', async () => {
    assert.equal((await visitor.post('/projects', project('Projet sans session', ['react']))).status, 401);
    assert.equal((await owner.browser.post('/projects', project('Projet avec responsable imposé', ['react'], { ownerId: other.id }))).status, 400);
    const created = await owner.browser.post('/projects', project('Application de covoiturage', ['react', 'nestjs']));
    assert.equal(created.status, 201);
    assert.equal(created.body.owner.id, owner.id);
    assert.equal(created.body.recruitmentStatus, 'OPEN');
    assert.equal(created.body.viewerRole, 'OWNER');
    assert.equal(created.body.memberCount, 1);
    assert.deepEqual(created.body.members.map((m: { id: string; isOwner: boolean }) => [m.id, m.isOwner]), [[owner.id, true]]);
    assert.equal((await visitor.get(`/projects/${created.body.id}`)).body.viewerRole, null);
    const closed = await owner.browser.post('/projects', project('Projet créé déjà fermé', ['go'], { recruitmentStatus: 'CLOSED' }));
    assert.equal(closed.body.recruitmentStatus, 'CLOSED');
  });

  test('échec de l’adhésion : aucun projet partiellement créé', async () => {
    await sql.query(`CREATE FUNCTION fail_member() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'échec simulé'; END $$`);
    await sql.query(`CREATE TRIGGER fail_member BEFORE INSERT ON "ProjectMember" FOR EACH ROW EXECUTE FUNCTION fail_member()`);
    try {
      const response = await owner.browser.post('/projects', project('Projet dont l’adhésion échoue', ['go']));
      assert.equal(response.status, 500);
      assert.doesNotMatch(JSON.stringify(response.body), /simulé|trigger/);
      assert.equal((await sql.query(`SELECT count(*)::int AS n FROM "Project" WHERE title = 'Projet dont l’adhésion échoue'`)).rows[0].n, 0);
    } finally {
      await sql.query('DROP TRIGGER fail_member ON "ProjectMember"');
      await sql.query('DROP FUNCTION fail_member()');
    }
  });

  test('validation des champs', async () => {
    for (const [body, field] of [
      [project('Court', ['go']), 'title'],
      [project('Titre de projet valide', ['go'], { objective: 'Trop court' }), 'objective'],
      [project('Titre de projet valide', []), 'technologyIds'],
      [project('Titre de projet valide', ['go'], { availability: 'x'.repeat(301) }), 'availability'],
      [project('Titre de projet valide', ['go'], { recruitmentStatus: 'PAUSED' }), 'recruitmentStatus']
    ] as const) {
      const response = await owner.browser.post('/projects', body);
      assert.equal(response.status, 400);
      assert.ok(field in response.body.fieldErrors, field);
    }
  });
});

describe('gestion et recrutement', () => {
  test('seul le responsable modifie le projet et son recrutement', async () => {
    const { body } = await owner.browser.post('/projects', project('Projet à gérer avec soin', ['python']));
    const foreign = await other.browser.patch(`/projects/${body.id}`, { recruitmentStatus: 'CLOSED' });
    assert.equal(foreign.status, 403);
    assert.equal(foreign.body.code, 'NOT_OWNER');
    const closed = await owner.browser.patch(`/projects/${body.id}`, { recruitmentStatus: 'CLOSED', availability: null, technologyIds: [tech.get('django')] });
    assert.equal(closed.body.recruitmentStatus, 'CLOSED');
    assert.equal(closed.body.availability, null);
    assert.deepEqual(closed.body.technologies.map((t: { slug: string }) => t.slug), ['django']);
    assert.equal((await owner.browser.patch(`/projects/${body.id}`, { recruitmentStatus: 'OPEN' })).body.recruitmentStatus, 'OPEN');
    assert.equal((await owner.browser.patch(`/projects/${body.id}`, { ownerId: other.id })).status, 400);
  });

  test('filtres combinés, membres publics et projet masqué', async () => {
    const lead = await registerMember(server.api, 'filtre_projet');
    const open = (await lead.browser.post('/projects', project('Plateforme agricole connectée', ['flutter']))).body;
    const closed = (await lead.browser.post('/projects', project('Plateforme agricole archivée', ['flutter'], { recruitmentStatus: 'CLOSED' }))).body;
    assert.equal((await visitor.get('/projects?technology=flutter')).body.meta.total, 2);
    const recruiting = await visitor.get('/projects?technology=flutter&status=open');
    assert.deepEqual(recruiting.body.data.map((p: { id: string }) => p.id), [open.id]);
    assert.equal((await visitor.get('/projects?q=archivée&technology=flutter')).body.data[0].id, closed.id);
    await sql.query(`INSERT INTO "ProjectMember"("projectId", "userId") VALUES ($1, $2)`, [open.id, other.id]);
    const members = (await visitor.get(`/projects/${open.id}/members`)).body;
    assert.deepEqual(members.data.map((m: { id: string; isOwner: boolean }) => [m.id, m.isOwner]), [[lead.id, true], [other.id, false]]);
    assert.doesNotMatch(JSON.stringify(members), /@example\.test|message/);
    assert.equal((await other.browser.get(`/projects/${open.id}`)).body.viewerRole, 'MEMBER');
    await sql.query(`UPDATE "Project" SET visibility = 'HIDDEN' WHERE id = $1`, [closed.id]);
    assert.equal((await visitor.get(`/projects/${closed.id}`)).status, 404);
    assert.equal((await visitor.get(`/projects/${closed.id}/members`)).status, 404);
    assert.equal((await lead.browser.patch(`/projects/${closed.id}`, { title: 'Modification après masquage' })).status, 404);
    assert.equal((await visitor.get('/projects?technology=flutter')).body.meta.total, 1);
    assert.equal((await visitor.get(`/users/${lead.id}/projects`)).body.meta.total, 1);
    const own = (await lead.browser.get('/users/me/projects')).body.data;
    assert.deepEqual(own.map((p: { id: string; visibility: string }) => [p.id, p.visibility]).sort(), [[closed.id, 'HIDDEN'], [open.id, 'VISIBLE']].sort());
  });

  test('projets créés et rejoints sur le profil, sans doublon', async () => {
    const member = await registerMember(server.api, 'membre_double');
    const mine = (await member.browser.post('/projects', project('Projet personnel du membre', ['rust']))).body;
    const joined = (await owner.browser.post('/projects', project('Projet rejoint par le membre', ['rust']))).body;
    await sql.query(`INSERT INTO "ProjectMember"("projectId", "userId") VALUES ($1, $2)`, [joined.id, member.id]);
    const ids = (await visitor.get(`/users/${member.id}/projects`)).body.data.map((p: { id: string }) => p.id);
    assert.deepEqual(ids.sort(), [mine.id, joined.id].sort());
    assert.deepEqual((await member.browser.get('/users/me/projects?role=OWNER')).body.data.map((p: { id: string }) => p.id), [mine.id]);
    assert.deepEqual((await member.browser.get('/users/me/projects?role=MEMBER')).body.data.map((p: { role: string }) => p.role), ['MEMBER']);
  });
});
