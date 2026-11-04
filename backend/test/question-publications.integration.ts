import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {randomUUID} from 'node:crypto';
import type {Client} from 'pg';
import {createTestDatabase,sqlClient,type TestDatabase} from './support/database';
import {startApp,type TestApp} from './support/app';
import {Browser} from './support/browser';
import {registerMember,seedCatalogue,PASSWORD,type Member} from './support/fixtures';
import {PUBLICATION_RETRY_MS} from '../src/modules/questions/publication-policy';
let database:TestDatabase,server:TestApp,sql:Client,a:Member,b:Member,technology:string;
const key=(at=Date.now())=>`jdq1.${at}.${randomUUID()}`;
const question=(title='Question fictive publication F2')=>({title,context:'Contexte fictif F2',expected:'Une seule question',actual:'Une réponse peut se perdre',attempts:'Reprise explicite',technologyIds:[technology],code:null,codeLanguage:null});
let original:{questionId:string;confirmedAt:string},originalKey:string;
before(async()=>{database=await createTestDatabase();server=await startApp(database.url);sql=await sqlClient(database);technology=(await seedCatalogue(sql)).get('typescript')!;a=await registerMember(server.api,'f2_member_a');b=await registerMember(server.api,'f2_member_b');});
after(async()=>{await sql?.end();await server?.close();await database?.drop();});
test('same key and payload returns the initial result without creating or exposing a body snapshot',async()=>{
 originalKey=key();const first=await a.browser.post('/questions/publications',{idempotencyKey:originalKey,question:question()});assert.equal(first.status,201);original=first.body;
 for(let i=0;i<12;i++)assert.deepEqual((await a.browser.post('/questions/publications',{idempotencyKey:originalKey,question:question()})).body,original);
 assert.deepEqual(Object.keys(original).sort(),['confirmedAt','questionId']);
 assert.equal((await sql.query('SELECT count(*)::int AS n FROM "QuestionPublication" WHERE key=$1',[originalKey])).rows[0].n,1);
});
test('concurrent API attempts with one key create exactly one question and one receipt',async()=>{
 const k=key(),q=question('Concurrence fictive F2');await a.browser.csrf();
 const responses=await Promise.all(Array.from({length:8},()=>a.browser.post('/questions/publications',{idempotencyKey:k,question:q})));
 assert.ok(responses.every(r=>r.status===201));assert.equal(new Set(responses.map(r=>r.body.questionId)).size,1);
 assert.equal((await sql.query('SELECT count(*)::int AS n FROM "Question" WHERE title=$1',[q.title])).rows[0].n,1);
 assert.equal((await sql.query('SELECT count(*)::int AS n FROM "QuestionPublication" WHERE key=$1',[k])).rows[0].n,1);
});
test('same account and key with changed content is an explicit conflict',async()=>{
 const response=await a.browser.post('/questions/publications',{idempotencyKey:originalKey,question:question('Un contenu différent pour la même clé')});assert.equal(response.status,409);assert.equal(response.body.code,'IDEMPOTENCY_CONTENT_CONFLICT');
});
test('same key belongs to separate authenticated accounts',async()=>{
 const response=await b.browser.post('/questions/publications',{idempotencyKey:originalKey,question:question('Question du second membre F2')});assert.equal(response.status,201);assert.notEqual(response.body.questionId,original.questionId);
 assert.equal((await sql.query('SELECT "authorId" FROM "Question" WHERE id=$1',[response.body.questionId])).rows[0].authorId,b.id);
});
test('session, origin and CSRF are rechecked even for a known successful key',async()=>{
 const body={idempotencyKey:originalKey,question:question()};assert.equal((await new Browser(server.api).post('/questions/publications',body)).status,401);
 assert.equal((await a.browser.request('POST','/questions/publications',body)).status,403);
 const foreign=new Browser(server.api,'https://evil.example');for(const [k,v]of a.browser.cookies)foreign.cookies.set(k,v);foreign.csrfToken=a.browser.csrfToken;assert.equal((await foreign.post('/questions/publications',body)).status,403);
 await sql.query('UPDATE "Session" SET "expiresAt"=now()-interval \'1 second\' WHERE "userId"=$1',[a.id]);assert.equal((await a.browser.post('/questions/publications',body)).status,401);
 assert.equal((await a.browser.post('/auth/login',{email:a.email,password:PASSWORD})).status,200);
});
test('nested invalid data, future clocks and additional identity fields are rejected',async()=>{
 for(const body of [{idempotencyKey:key()},{idempotencyKey:key(),question:null},{idempotencyKey:key(),question:[]},{idempotencyKey:key(),question:{...question(),authorId:b.id}},{idempotencyKey:key(),question:question(),action:'OTHER'},{idempotencyKey:key(Date.now()+600000),question:question()}])assert.equal((await a.browser.post('/questions/publications',body)).status,400);
});
test('replay does not resurface a question after logical deletion and moderation',async()=>{
 await sql.query('UPDATE "Question" SET visibility=\'HIDDEN\',"deletedAt"=now() WHERE id=$1',[original.questionId]);
 const response=await a.browser.post('/questions/publications',{idempotencyKey:originalKey,question:question()});assert.equal(response.status,201);assert.deepEqual(response.body,original);assert.equal((await a.browser.get('/questions/'+original.questionId)).status,404);
});
test('receipt insertion failure rolls back question and retry creates only one',async()=>{
 const k=key(),q=question('Atomicité fictive F2');
 await sql.query(`CREATE FUNCTION fail_f2_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'F2 fixture failure'; END; $$; CREATE TRIGGER fail_f2 BEFORE INSERT ON "QuestionPublication" FOR EACH ROW EXECUTE FUNCTION fail_f2_receipt();`);
 try{assert.equal((await a.browser.post('/questions/publications',{idempotencyKey:k,question:q})).status,500);assert.equal((await sql.query('SELECT count(*)::int AS n FROM "Question" WHERE title=$1',[q.title])).rows[0].n,0);}
 finally{await sql.query('DROP TRIGGER fail_f2 ON "QuestionPublication"; DROP FUNCTION fail_f2_receipt();');}
 assert.equal((await a.browser.post('/questions/publications',{idempotencyKey:k,question:q})).status,201);
 assert.equal((await sql.query('SELECT count(*)::int AS n FROM "Question" WHERE title=$1',[q.title])).rows[0].n,1);
});
test('expired original keys remain refused after receipt deletion',async()=>{
 const k=key(Date.now()-PUBLICATION_RETRY_MS+2000),q=question('Échéance fictive F2');assert.equal((await a.browser.post('/questions/publications',{idempotencyKey:k,question:q})).status,201);
 await new Promise(resolve=>setTimeout(resolve,2100));await sql.query('DELETE FROM "QuestionPublication" WHERE key=$1',[k]);
 const expired=await a.browser.post('/questions/publications',{idempotencyKey:k,question:q});assert.equal(expired.status,410);assert.equal(expired.body.code,'PUBLICATION_REQUEST_EXPIRED');assert.equal((await sql.query('SELECT count(*)::int AS n FROM "Question" WHERE title=$1',[q.title])).rows[0].n,1);
});
test('legacy clients without keys still create questions and database enforces receipt uniqueness',async()=>{
 const first=await a.browser.post('/questions',question('Ancien client F2 sans clé')),second=await a.browser.post('/questions',question('Ancien client F2 sans clé'));assert.equal(first.status,201);assert.equal(second.status,201);assert.notEqual(first.body.id,second.body.id);
 await assert.rejects(sql.query('INSERT INTO "QuestionPublication" ("userId",action,key,"payloadHash","questionId","retainUntil") VALUES ($1,\'CREATE_QUESTION\',$2,$3,$4,now()+interval \'1 day\')',[a.id,originalKey,'0'.repeat(64),first.body.id]),(e:unknown)=>(e as {code:string}).code==='23505');
});
