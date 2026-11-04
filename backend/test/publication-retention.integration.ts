import assert from 'node:assert/strict';
import {test} from 'node:test';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createTestDatabase,sqlClient} from './support/database';
import {PUBLICATION_RECEIPT_MS} from '../src/modules/questions/publication-policy';
test('receipt cleanup is explicit, bounded, simulated by default and preserves live key protection',async()=>{
 const database=await createTestDatabase(),sql=await sqlClient(database);
 try{
  const owner=randomUUID();await sql.query('INSERT INTO "User" (id,username,"usernameKey",email,"passwordHash","updatedAt") VALUES ($1,\'retention_f2\',\'retention_f2\',\'retention.f2@example.test\',\'not-a-login\',now())',[owner]);
  const keys:string[]=[];
  for(const offset of [PUBLICATION_RECEIPT_MS+60000,PUBLICATION_RECEIPT_MS+120000,0]){
   const id=randomUUID(),key=`jdq1.${Date.now()-offset}.${randomUUID()}`;keys.push(key);
   await sql.query('INSERT INTO "Question" (id,"authorId",title,context,expected,actual,attempts,"updatedAt") VALUES ($1,$2,\'F2 retention fixture\',\'c\',\'e\',\'a\',\'t\',now())',[id,owner]);
   await sql.query('INSERT INTO "QuestionPublication" ("userId",action,key,"payloadHash","questionId","retainUntil") VALUES ($1,\'CREATE_QUESTION\',$2,$3,$4,now()-interval \'1 minute\')',[owner,key,'0'.repeat(64),id]);
  }
  const destination=new URL(database.url),confirm=['--confirm-host',`${destination.hostname}:${destination.port}`,'--confirm-database',destination.pathname.slice(1)];
  const run=(args:string[])=>spawnSync(process.execPath,[join(__dirname,'../src/cli/publications-prune.js'),...args],{env:{...process.env,PUBLICATION_RETENTION_DATABASE_URL:database.url},encoding:'utf8',windowsHide:true});
  assert.notEqual(run([]).status,0);
  const simulated=run(confirm);assert.equal(simulated.status,0,simulated.stderr);assert.deepEqual(JSON.parse(simulated.stdout),{category:'QUESTION_PUBLICATION_RECEIPT',result:'simulate',eligible:2,removed:0});
  assert.equal((await sql.query('SELECT count(*)::int n FROM "QuestionPublication"')).rows[0].n,3);
  const execute=run(['execute',...confirm,'--batch','1']);assert.equal(execute.status,0,execute.stderr);assert.equal(JSON.parse(execute.stdout).removed,1);
  assert.equal((await sql.query('SELECT count(*)::int n FROM "QuestionPublication"')).rows[0].n,2);
  const final=run(['execute',...confirm]);assert.equal(final.status,0,final.stderr);assert.equal(JSON.parse(final.stdout).removed,1);
  assert.deepEqual((await sql.query('SELECT key FROM "QuestionPublication"')).rows.map(r=>r.key),[keys[2]]);
  assert.equal((await sql.query('SELECT count(*)::int n FROM "Question"')).rows[0].n,3);
 }finally{await sql.end();await database.drop();}
});
