import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, before, describe, test } from 'node:test';
import { type Client, DatabaseError } from 'pg';
import { createTestDatabase, sqlClient, type TestDatabase } from './support/database';

// Contraintes vérifiées directement en SQL : la base doit refuser les états invalides même sans passer par l'API.
let database: TestDatabase;
let db: Client;

async function sqlState(statement: string, params: unknown[] = []): Promise<string | undefined> {
  try { await db.query('SAVEPOINT t'); await db.query(statement, params); await db.query('RELEASE SAVEPOINT t'); return undefined; }
  catch (error) { await db.query('ROLLBACK TO SAVEPOINT t'); if (error instanceof DatabaseError) return error.code; throw error; }
}
const UNIQUE = '23505', CHECK = '23514', FOREIGN_KEY = '23503';

async function insertUser(name: string): Promise<string> {
  const { rows } = await db.query(`INSERT INTO "User"(id, email, username, "usernameKey", "passwordHash", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, 'hash', now()) RETURNING id`, [`${name.toLowerCase()}@example.test`, name, name.toLowerCase()]);
  return rows[0].id;
}
async function insertQuestion(authorId: string): Promise<string> {
  const { rows } = await db.query(`INSERT INTO "Question"(id, "authorId", title, context, expected, actual, attempts, "updatedAt") VALUES (gen_random_uuid(), $1, 'Titre de question', 'c', 'e', 'a', 't', now()) RETURNING id`, [authorId]);
  return rows[0].id;
}
async function insertAnswer(questionId: string, authorId: string): Promise<string> {
  const { rows } = await db.query(`INSERT INTO "Answer"(id, "questionId", "authorId", body, "updatedAt") VALUES (gen_random_uuid(), $1, $2, 'Réponse détaillée', now()) RETURNING id`, [questionId, authorId]);
  return rows[0].id;
}
async function insertProject(ownerId: string): Promise<string> {
  const { rows } = await db.query(`INSERT INTO "Project"(id, "ownerId", title, objective, "updatedAt") VALUES (gen_random_uuid(), $1, 'Projet de test', 'Objectif du projet de test', now()) RETURNING id`, [ownerId]);
  return rows[0].id;
}

let awa: string, moussa: string, admin: string;

before(async () => {
  database = await createTestDatabase();
  db = await sqlClient(database);
  await db.query('BEGIN');
  awa = await insertUser('Awa_Demo');
  moussa = await insertUser('Moussa_Demo');
  admin = await insertUser('Admin_Demo');
});
after(async () => {
  await db?.query('ROLLBACK').catch(() => undefined);
  await db?.end();
  await database?.drop();
});

describe('comptes', () => {
  test('email et pseudonyme uniques sans tenir compte de la casse', async () => {
    assert.equal(await sqlState(`INSERT INTO "User"(id, email, username, "usernameKey", "passwordHash", "updatedAt") VALUES (gen_random_uuid(), 'awa_demo@example.test', 'Autre', 'autre', 'h', now())`), UNIQUE);
    assert.equal(await sqlState(`INSERT INTO "User"(id, email, username, "usernameKey", "passwordHash", "updatedAt") VALUES (gen_random_uuid(), 'autre@example.test', 'AWA_DEMO', 'awa_demo', 'h', now())`), UNIQUE);
  });
  test('formes non normalisées refusées par la base', async () => {
    assert.equal(await sqlState(`INSERT INTO "User"(id, email, username, "usernameKey", "passwordHash", "updatedAt") VALUES (gen_random_uuid(), 'Majuscule@Example.test', 'Normal', 'normal', 'h', now())`), CHECK);
    assert.equal(await sqlState(`INSERT INTO "User"(id, email, username, "usernameKey", "passwordHash", "updatedAt") VALUES (gen_random_uuid(), 'x@example.test', 'Normal', 'Normal', 'h', now())`), CHECK);
  });
  test('profil limité à trois liens et à un code pays ISO', async () => {
    assert.equal(await sqlState(`INSERT INTO "Profile"("userId", links, "updatedAt") VALUES ($1, ARRAY['https://a.test','https://b.test','https://c.test','https://d.test'], now())`, [awa]), CHECK);
    assert.equal(await sqlState(`INSERT INTO "Profile"("userId", "countryCode", "updatedAt") VALUES ($1, 'sn', now())`, [awa]), CHECK);
    assert.equal(await sqlState(`INSERT INTO "Profile"("userId", "countryCode", links, "updatedAt") VALUES ($1, 'SN', ARRAY['https://a.test'], now())`, [awa]), undefined);
  });
  test('empreinte de session unique', async () => {
    const hash = randomBytes(32);
    const insert = `INSERT INTO "Session"(id, "tokenHash", "userId", "expiresAt") VALUES (gen_random_uuid(), $1, $2, now() + interval '7 days')`;
    assert.equal(await sqlState(insert, [hash, awa]), undefined);
    assert.equal(await sqlState(insert, [hash, moussa]), UNIQUE);
  });
  test('suppression d’un compte ayant publié bloquée', async () => {
    await insertQuestion(moussa);
    assert.equal(await sqlState(`DELETE FROM "User" WHERE id = $1`, [moussa]), FOREIGN_KEY);
  });
});

describe('JokkoHelp', () => {
  test('la solution acceptée appartient à sa question', async () => {
    const question = await insertQuestion(awa);
    const other = await insertQuestion(moussa);
    const own = await insertAnswer(question, moussa);
    const foreign = await insertAnswer(other, awa);
    assert.equal(await sqlState(`UPDATE "Question" SET "acceptedAnswerId" = $1 WHERE id = $2`, [foreign, question]), FOREIGN_KEY);
    assert.equal(await sqlState(`UPDATE "Question" SET "acceptedAnswerId" = $1 WHERE id = $2`, [own, question]), undefined);
    assert.equal(await sqlState(`UPDATE "Question" SET "acceptedAnswerId" = NULL WHERE id = $1`, [question]), undefined);
  });
  test('technologie inexistante et doublon de technologie refusés', async () => {
    const question = await insertQuestion(awa);
    const { rows } = await db.query(`INSERT INTO "Technology"(id, name, slug) VALUES (gen_random_uuid(), 'TestTech', 'testtech') RETURNING id`);
    const link = `INSERT INTO "QuestionTechnology"("questionId", "technologyId") VALUES ($1, $2)`;
    assert.equal(await sqlState(link, [question, rows[0].id]), undefined);
    assert.equal(await sqlState(link, [question, rows[0].id]), UNIQUE);
    assert.equal(await sqlState(link, [question, '00000000-0000-0000-0000-000000000000']), FOREIGN_KEY);
  });
});

describe('JokkoProjects', () => {
  test('une candidature par membre et projet, même après refus', async () => {
    const project = await insertProject(awa);
    await db.query(`INSERT INTO "Application"(id, "projectId", "applicantId", message, status, "decidedAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, 'Je souhaite rejoindre ce projet.', 'REJECTED', now(), now())`, [project, moussa]);
    assert.equal(await sqlState(`INSERT INTO "Application"(id, "projectId", "applicantId", message, "updatedAt") VALUES (gen_random_uuid(), $1, $2, 'Nouvelle tentative de candidature.', now())`, [project, moussa]), UNIQUE);
  });
  test('date de décision cohérente avec l’état', async () => {
    const project = await insertProject(awa);
    assert.equal(await sqlState(`INSERT INTO "Application"(id, "projectId", "applicantId", message, status, "updatedAt") VALUES (gen_random_uuid(), $1, $2, 'Message de candidature.', 'ACCEPTED', now())`, [project, moussa]), CHECK);
    assert.equal(await sqlState(`INSERT INTO "Application"(id, "projectId", "applicantId", message, status, "decidedAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, 'Message de candidature.', 'PENDING', now(), now())`, [project, moussa]), CHECK);
  });
  test('une adhésion par membre et projet', async () => {
    const project = await insertProject(awa);
    const join = `INSERT INTO "ProjectMember"("projectId", "userId") VALUES ($1, $2)`;
    assert.equal(await sqlState(join, [project, moussa]), undefined);
    assert.equal(await sqlState(join, [project, moussa]), UNIQUE);
  });
});

describe('signalements et modération', () => {
  const report = `INSERT INTO "Report"(id, "reporterId", "questionId", "answerId", "projectId", reason) VALUES (gen_random_uuid(), $1, $2, $3, $4, 'Motif de signalement suffisant.')`;
  test('exactement une cible existante', async () => {
    const question = await insertQuestion(awa);
    const project = await insertProject(awa);
    assert.equal(await sqlState(report, [moussa, null, null, null]), CHECK);
    assert.equal(await sqlState(report, [moussa, question, null, project]), CHECK);
    assert.equal(await sqlState(report, [moussa, '00000000-0000-0000-0000-000000000000', null, null]), FOREIGN_KEY);
  });
  test('un seul signalement ouvert par déclarant et cible', async () => {
    const question = await insertQuestion(awa);
    const { rows } = await db.query(`${report} RETURNING id`, [moussa, question, null, null]);
    assert.equal(await sqlState(report, [moussa, question, null, null]), UNIQUE);
    assert.equal(await sqlState(report, [admin, question, null, null]), undefined);
    await db.query(`UPDATE "Report" SET status = 'CLOSED', decision = 'NO_ACTION', "closedById" = $2, "closedAt" = now() WHERE id = $1`, [rows[0].id, admin]);
    assert.equal(await sqlState(report, [moussa, question, null, null]), undefined);
  });
  test('clôture incomplète refusée', async () => {
    const question = await insertQuestion(awa);
    const { rows } = await db.query(`${report} RETURNING id`, [moussa, question, null, null]);
    assert.equal(await sqlState(`UPDATE "Report" SET status = 'CLOSED' WHERE id = $1`, [rows[0].id]), CHECK);
  });
  test('action de modération : une cible cohérente avec la décision', async () => {
    const question = await insertQuestion(awa);
    const action = `INSERT INTO "ModerationAction"(id, "adminId", decision, reason, "questionId", "targetUserId") VALUES (gen_random_uuid(), $1, $2, 'Motif de modération suffisant.', $3, $4)`;
    assert.equal(await sqlState(action, [admin, 'HIDE_CONTENT', question, null]), undefined);
    assert.equal(await sqlState(action, [admin, 'SUSPEND_ACCOUNT', question, null]), CHECK);
    assert.equal(await sqlState(action, [admin, 'HIDE_CONTENT', question, awa]), CHECK);
    assert.equal(await sqlState(action, [admin, 'SUSPEND_ACCOUNT', null, awa]), undefined);
  });
});
