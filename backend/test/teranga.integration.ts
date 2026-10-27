import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import { after, before, describe, test } from 'node:test';
import type { Client } from 'pg';
import { POINTS_PER_ACCEPTED_ANSWER as P } from '../src/modules/reputation/reputation.service';
import { createTestDatabase, sqlClient, type TestDatabase } from './support/database';
import { startApp, type TestApp } from './support/app';
import { Browser } from './support/browser';
import { registerAdmin, registerMember, seedCatalogue, type Member } from './support/fixtures';
import { createPrismaClient, type DatabaseService } from '../src/database/database.service';
import { ReputationService } from '../src/modules/reputation/reputation.service';

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

async function withReputation<T>(run:(service:ReputationService)=>Promise<T>) {
  const prisma=createPrismaClient(database.url);
  try {return await run(new ReputationService({prisma} as DatabaseService));} finally {await prisma.$disconnect();}
}

describe('adaptation au socle actuel',()=>{
  test('migration sur contributions préexistantes conserve photos, contacts et suppression logique',async()=>{
    const schema='upgrade_'+randomBytes(6).toString('hex');
    await sql.query(`CREATE SCHEMA "${schema}"`);
    const url=new URL(database.url);url.searchParams.set('schema',schema);
    const target={schema,url:url.href,drop:async()=>{}};
    const upgrade=await sqlClient(target);
    let prisma:ReturnType<typeof createPrismaClient>|undefined;
    try{
      const dir=join(__dirname,'..','..','prisma','migrations');
      const migrations=(await readdir(dir,{withFileTypes:true})).filter(d=>d.isDirectory()).map(d=>d.name).sort();
      const current='20261022160000_teranga_points';
      for(const name of migrations.filter(n=>n<current))await upgrade.query(await readFile(join(dir,name,'migration.sql'),'utf8'));
      const users=(await upgrade.query(`INSERT INTO "User"(id,email,username,"usernameKey","passwordHash","updatedAt") VALUES(gen_random_uuid(),'upgrade_owner@example.test','upgrade_owner','upgrade_owner','not-a-login-hash',now()),(gen_random_uuid(),'upgrade_helper@example.test','upgrade_helper','upgrade_helper','not-a-login-hash',now()) RETURNING id,username`)).rows;
      const owner=users.find(u=>u.username==='upgrade_owner').id,helper=users.find(u=>u.username==='upgrade_helper').id;
      await upgrade.query('UPDATE "User" SET "avatarKey"=$2 WHERE id=$1',[helper,'jd-'+'a'.repeat(32)+'.jpg']);
      await upgrade.query(`INSERT INTO "Profile"("userId","collaborationContact","collaborationContactEnabled","updatedAt") VALUES($1,'https://example.test/private-upgrade',true,now())`,[helper]);
      const q=(await upgrade.query(`INSERT INTO "Question"(id,"authorId",title,context,expected,actual,attempts,"updatedAt") VALUES(gen_random_uuid(),$1,'Question avant le registre','Contexte','Attendu','Obtenu','Essais',now()) RETURNING id`,[owner])).rows[0].id;
      const a=(await upgrade.query(`INSERT INTO "Answer"(id,"questionId","authorId",body,"updatedAt") VALUES(gen_random_uuid(),$1,$2,'Solution antérieure au registre',now()) RETURNING id`,[q,helper])).rows[0].id;
      await upgrade.query('UPDATE "Question" SET "acceptedAnswerId"=$2 WHERE id=$1',[q,a]);
      const deleted=(await upgrade.query(`INSERT INTO "Question"(id,"authorId",title,context,expected,actual,attempts,"deletedAt","updatedAt") VALUES(gen_random_uuid(),$1,'Question supprimée avant le registre','Contexte','Attendu','Obtenu','Essais',now(),now()) RETURNING id`,[owner])).rows[0].id;
      await upgrade.query(await readFile(join(dir,current,'migration.sql'),'utf8'));
      // The current Prisma client requires the complete additive schema, not a database frozen at lot 19.
      // Keep the pre-reputation fixture, then verify later migrations preserve its data too.
      for(const name of migrations.filter(n=>n>current))await upgrade.query(await readFile(join(dir,name,'migration.sql'),'utf8'));
      prisma=createPrismaClient(url.href);const service=new ReputationService({prisma} as DatabaseService);
      assert.equal(await service.score(helper),0);assert.equal((await service.rebuild()).eventsWritten,1);assert.equal(await service.score(helper),P);assert.equal((await service.rebuild()).eventsWritten,0);
      assert.equal((await prisma.question.findUniqueOrThrow({where:{id:q}})).acceptedAnswerId,a);
      assert.ok((await prisma.question.findUniqueOrThrow({where:{id:deleted}})).deletedAt);
      assert.equal((await prisma.user.findUniqueOrThrow({where:{id:helper}})).avatarKey,'jd-'+'a'.repeat(32)+'.jpg');
      const legacy=await prisma.user.findUniqueOrThrow({where:{id:helper}});
      assert.equal(legacy.lastLoginAt,null);assert.ok(legacy.retentionObservedAt);
      assert.equal((await prisma.profile.findUniqueOrThrow({where:{userId:helper}})).collaborationContact,'https://example.test/private-upgrade');
    }finally{await prisma?.$disconnect();await upgrade.end();await sql.query(`DROP SCHEMA "${schema}" CASCADE`);}
  });
  test('suppression logique compense sans effacer les mouvements ni les réponses',async()=>{
    const {asker,others:[helper],questionId,answers:[answer]}=await setup();
    assert.equal((await asker.browser.put(`/questions/${questionId}/accepted-answer`,{answerId:answer})).status,200);
    assert.equal((await asker.browser.delete(`/questions/${questionId}`)).status,204);
    assert.equal(await points(helper),0);assert.equal(await events(questionId),2);
    assert.equal((await sql.query('SELECT reason FROM "ReputationEvent" WHERE "questionId"=$1 ORDER BY sequence DESC',[questionId])).rows[0].reason,'QUESTION_DELETED');
    assert.equal((await sql.query('SELECT count(*)::int n FROM "Answer" WHERE id=$1',[answer])).rows[0].n,1);
    assert.equal((await asker.browser.delete(`/questions/${questionId}`)).status,204);assert.equal(await events(questionId),2);
  });

  test('la suspension ne pénalise pas une contribution éligible',async()=>{
    const {asker,others:[helper],questionId,answers:[answer]}=await setup();
    await asker.browser.put(`/questions/${questionId}/accepted-answer`,{answerId:answer});
    assert.equal((await admin.browser.post('/admin/moderation-actions',{decision:'SUSPEND_ACCOUNT',targetType:'USER',targetId:helper.id,reason:'Compte fictif suspendu pour la recette.'})).status,201);
    assert.equal(await points(helper),P);assert.equal(await events(questionId),1);
  });

  test('reconstruction des solutions antérieures, compensation exacte et rejeu sans écriture',async()=>{
    const {others:[helper],questionId,answers:[answer]}=await setup();
    // Simulate a solution accepted before installation of the ledger.
    await sql.query('UPDATE "Question" SET "acceptedAnswerId"=$2 WHERE id=$1',[questionId,answer]);
    assert.equal(await points(helper),0);
    await withReputation(service=>service.rebuild());assert.equal(await points(helper),P);
    const history=(await sql.query('SELECT id,delta,reason,sequence FROM "ReputationEvent" WHERE "questionId"=$1 ORDER BY sequence',[questionId])).rows;
    // A deliberately inconsistent append, not a rewrite of history.
    await sql.query('INSERT INTO "ReputationEvent"(id,"userId","questionId","answerId",delta,reason,sequence) VALUES(gen_random_uuid(),$1,$2,$3,7,\'ANSWER_ACCEPTED\',2)',[helper.id,questionId,answer]);
    assert.equal(await points(helper),P+7);
    const repair=await withReputation(service=>service.rebuild());assert.equal(repair.eventsWritten,1);assert.equal(await points(helper),P);
    const after=(await sql.query('SELECT id,delta,reason,sequence FROM "ReputationEvent" WHERE "questionId"=$1 ORDER BY sequence',[questionId])).rows;
    assert.deepEqual(after[0],history[0]);assert.equal(after.at(-1).delta,-7);assert.equal(after.at(-1).reason,'RECONCILIATION');
    assert.equal((await withReputation(service=>service.rebuild())).eventsWritten,0);
    const sum=(await sql.query('SELECT sum(delta)::int n FROM "ReputationEvent" WHERE "userId"=$1',[helper.id])).rows[0].n;
    assert.equal(await points(helper),sum);assert.equal((await helper.browser.get('/users/me')).body.terangaPoints,sum);
  });

  test('une solution antérieure sur question supprimée ne reçoit aucun point',async()=>{
    const {others:[helper],questionId,answers:[answer]}=await setup();
    await sql.query('UPDATE "Question" SET "acceptedAnswerId"=$2,"deletedAt"=now() WHERE id=$1',[questionId,answer]);
    await withReputation(service=>service.rebuild());assert.equal(await points(helper),0);assert.equal(await events(questionId),0);
  });

  test('le journal refuse modification, effacement et troncature',async()=>{
    const {asker,questionId,answers:[answer]}=await setup();await asker.browser.put(`/questions/${questionId}/accepted-answer`,{answerId:answer});
    await assert.rejects(sql.query('UPDATE "ReputationEvent" SET delta=20 WHERE "questionId"=$1',[questionId]),{code:'23514'});
    await assert.rejects(sql.query('DELETE FROM "ReputationEvent" WHERE "questionId"=$1',[questionId]),{code:'23514'});
    await assert.rejects(sql.query('TRUNCATE "ReputationEvent"'),{code:'23514'});assert.equal(await events(questionId),1);
  });

  test('deux solutions concurrentes : seule la solution finale détient les points',async()=>{
    const {asker,others,questionId,answers}=await setup(2);
    const results=await Promise.all(answers.map(answerId=>asker.browser.put(`/questions/${questionId}/accepted-answer`,{answerId})));
    assert.ok(results.every(r=>r.status===200));const accepted=(await visitor.get(`/questions/${questionId}`)).body.acceptedAnswerId;
    for(let i=0;i<others.length;i++)assert.equal(await points(others[i]),answers[i]===accepted?P:0);
  });

  test('acceptation concurrente à suppression ou masquage de question : aucun score résiduel',async()=>{
    for(const operation of ['delete','hide']){
      const {asker,others:[helper],questionId,answers:[answer]}=await setup();
      const results=await Promise.all([asker.browser.put(`/questions/${questionId}/accepted-answer`,{answerId:answer}),operation==='delete'?asker.browser.delete(`/questions/${questionId}`):admin.browser.post('/admin/moderation-actions',{decision:'HIDE_CONTENT',targetType:'QUESTION',targetId:questionId,reason:'Question fictive pour concurrence.'})]);
      assert.ok([200,404].includes(results[0].status));assert.ok([201,204].includes(results[1].status));
      assert.equal(await points(helper),0);assert.equal((await visitor.get(`/questions/${questionId}`)).status,404);
    }
  });

  test('reconstruction concurrente aux mutations normales : état final et journal cohérents',async()=>{
    const {asker,others:[helper],questionId,answers:[answer]}=await setup();
    await withReputation(async service=>{await Promise.all([service.rebuild(),asker.browser.put(`/questions/${questionId}/accepted-answer`,{answerId:answer})]);});
    assert.equal(await points(helper),P);assert.equal(await events(questionId),1);
    assert.equal((await withReputation(service=>service.rebuild())).eventsWritten,0);
  });

  test('le verrou de reconstruction bloque une acceptation avant tout changement',async()=>{
    const {asker,others:[helper],questionId,answers:[answer]}=await setup();
    await sql.query('BEGIN');
    await sql.query('SELECT pg_advisory_xact_lock(1949387571,19)');
    let pending:ReturnType<typeof asker.browser.put>|undefined;
    try{
      pending=asker.browser.put(`/questions/${questionId}/accepted-answer`,{answerId:answer});
      let waiting=false;
      for(let i=0;i<100;i++){
        waiting=(await sql.query("SELECT EXISTS(SELECT 1 FROM pg_locks WHERE locktype='advisory' AND classid=1949387571 AND objid=19 AND NOT granted) waiting")).rows[0].waiting;
        if(waiting)break;await new Promise(resolve=>setTimeout(resolve,20));
      }
      assert.equal(waiting,true);
      assert.equal((await sql.query('SELECT "acceptedAnswerId" FROM "Question" WHERE id=$1',[questionId])).rows[0].acceptedAnswerId,null);
      assert.equal(await events(questionId),0);
    }finally{await sql.query('ROLLBACK');}
    assert.equal((await pending!).status,200);assert.equal(await points(helper),P);
  });

  test('échec de reconstruction : aucune compensation partielle',async()=>{
    const cases=[await setup(),await setup()].sort((a,b)=>a.questionId.localeCompare(b.questionId));
    for(const item of cases)await sql.query('UPDATE "Question" SET "acceptedAnswerId"=$2 WHERE id=$1',[item.questionId,item.answers[0]]);
    // Fail the second question, after the first could have appended a movement.
    await sql.query(`CREATE FUNCTION fail_rebuild() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."questionId"='${cases[1].questionId}'::uuid THEN RAISE EXCEPTION 'synthetic'; END IF; RETURN NEW; END $$`);
    await sql.query('CREATE TRIGGER fail_rebuild BEFORE INSERT ON "ReputationEvent" FOR EACH ROW EXECUTE FUNCTION fail_rebuild()');
    try{await assert.rejects(withReputation(service=>service.rebuild()));}finally{await sql.query('DROP TRIGGER fail_rebuild ON "ReputationEvent"');await sql.query('DROP FUNCTION fail_rebuild()');}
    for(const item of cases){assert.equal(await points(item.others[0]),0);assert.equal(await events(item.questionId),0);}
    await withReputation(service=>service.rebuild());for(const item of cases)assert.equal(await points(item.others[0]),P);
  });
});
