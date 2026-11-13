import assert from 'node:assert/strict';
import {after,before,test} from 'node:test';
import {mkdtemp,rm,readdir,writeFile,utimes} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {PNG} from 'pngjs';
import jpeg from 'jpeg-js';
import {referenceWebp} from './support/photo-webp';
import type {Client} from 'pg';
import {createTestDatabase,sqlClient,type TestDatabase} from './support/database';
import {startApp,type TestApp,APP_ORIGIN} from './support/app';
import {Browser} from './support/browser';
import {registerMember,seedCatalogue,type Member} from './support/fixtures';
import {QuestionImagesService} from '../src/modules/questions/question-images.service';
let database:TestDatabase,server:TestApp,sql:Client,dir:string,owner:Member,other:Member,technologyId:string;
const png=()=>{const image=new PNG({width:120,height:60});image.data.fill(180);return PNG.sync.write(image);};
async function upload(member:Member|undefined,bytes=png(),mime='image/png',csrf=true) {
  const body=new FormData();body.set('file',new Blob([new Uint8Array(bytes)],{type:mime}),'sensitive-name.png');
  if(member&&!member.browser.csrfToken)await member.browser.csrf();
  const headers:Record<string,string>={Origin:APP_ORIGIN,'X-Forwarded-For':member?.browser.ip??'10.4.5.6'};
  if(member){headers.Cookie=[...member.browser.cookies].map(([k,v])=>k+'='+encodeURIComponent(v)).join('; ');if(csrf)headers['X-CSRF-Token']=member.browser.csrfToken!;}
  const response=await fetch(server.api+'/question-images',{method:'POST',headers,body});
  return {status:response.status,body:await response.json() as {id:string;url:string;code?:string}};
}
async function read(id:string,member?:Member) {return fetch(server.api+'/question-images/'+id,{headers:member?{Cookie:[...member.browser.cookies].map(([k,v])=>k+'='+encodeURIComponent(v)).join('; ')}:{}});}
const question=(imageIds:string[])=>({title:'Capture pour reproduire un problème',context:'Contexte de recette.',expected:'Le rendu attendu.',actual:'Le rendu incorrect.',attempts:'Relecture du code.',technologyIds:[technologyId],imageIds});
before(async()=>{
  dir=await mkdtemp(path.join(tmpdir(),'jokkodev-images-'));process.env.QUESTION_IMAGE_STORAGE_DIR=dir;
  database=await createTestDatabase();server=await startApp(database.url);sql=await sqlClient(database);
  technologyId=(await seedCatalogue(sql)).get('typescript')!;
  owner=await registerMember(server.api,'captures_owner');other=await registerMember(server.api,'captures_other');
});
after(async()=>{await sql?.end();await server?.close();await database?.drop();if(dir)await rm(dir,{recursive:true,force:true});delete process.env.QUESTION_IMAGE_STORAGE_DIR;});
test('préparation privée, réencodage, publication idempotente, modification et retrait',async()=>{
  const image=await upload(owner);assert.equal(image.status,201);
  assert.equal((await read(image.body.id)).status,404);assert.equal((await read(image.body.id,other)).status,404);
  const privateImage=await read(image.body.id,owner);assert.equal(privateImage.status,200);assert.match(privateImage.headers.get('cache-control')??'',/private, no-store/);
  const bytes=Buffer.from(await privateImage.arrayBuffer());assert.deepEqual([...bytes.subarray(0,2)],[255,216]);assert.equal(bytes.includes(Buffer.from('sensitive-name')),false);
  const input={idempotencyKey:`jdq1.${Date.now()}.${randomUUID()}`,question:question([image.body.id])};
  const results=await Promise.all([owner.browser.post('/questions/publications',input),owner.browser.post('/questions/publications',input)]);
  assert.ok(results.every(r=>r.status===201));assert.equal(results[0].body.questionId,results[1].body.questionId);
  const id=results[0].body.questionId;
  assert.equal((await read(image.body.id)).status,200);
  const visitor=new Browser(server.api);assert.equal((await visitor.get('/questions/'+id)).body.images[0].id,image.body.id);
  assert.equal((await owner.browser.post('/questions/publications',{...input,question:question([])})).status,409);
  assert.equal((await owner.browser.post('/questions/publications',{...input,idempotencyKey:`jdq1.${Date.now()}.${randomUUID()}`})).status,400);
  assert.equal((await other.browser.patch('/questions/'+id,{imageIds:[]})).status,403);
  assert.equal((await owner.browser.delete('/question-images/'+image.body.id)).status,404);
  const second=await upload(owner);
  const updated=await owner.browser.patch('/questions/'+id,{imageIds:[second.body.id,image.body.id]});assert.equal(updated.status,200);
  assert.deepEqual(updated.body.images.map((i:{id:string})=>i.id),[second.body.id,image.body.id]);
  assert.equal((await owner.browser.patch('/questions/'+id,{imageIds:[image.body.id,second.body.id]})).status,200);
  assert.equal((await owner.browser.patch('/questions/'+id,{imageIds:[second.body.id]})).status,200);
  assert.equal((await read(image.body.id,owner)).status,404);
  await sql.query(`UPDATE "Question" SET visibility='HIDDEN' WHERE id=$1`,[id]);
  for(const member of [undefined,owner,other])assert.equal((await read(second.body.id,member)).status,404);
  await sql.query(`UPDATE "Question" SET visibility='VISIBLE' WHERE id=$1`,[id]);assert.equal((await read(second.body.id)).status,200);
  assert.equal((await owner.browser.delete('/questions/'+id)).status,204);assert.equal((await read(second.body.id,owner)).status,404);
  // A replay returns the receipt but cannot restore a removed/hidden attachment or question.
  assert.equal((await owner.browser.post('/questions/publications',input)).status,201);assert.equal((await read(second.body.id)).status,404);
});
test('contrôle réel des fichiers, limites et permissions',async()=>{
  assert.equal((await upload(undefined)).status,403);assert.equal((await upload(owner,png(),'image/png',false)).status,403);
  assert.equal((await upload(owner,Buffer.from('<svg><script/></svg>'),'image/png')).status,400);
  const large=Buffer.alloc(5*1024*1024+1);assert.equal((await upload(owner,large)).status,413);
  const oversized=png();oversized.writeUInt32BE(9000,16);assert.equal((await upload(owner,oversized)).status,400);
  const files=[];for(let i=0;i<4;i++){const image=await upload(owner);assert.equal(image.status,201);files.push(image.body.id);}
  assert.equal((await owner.browser.post('/questions',question(files))).status,400);
  assert.equal((await owner.browser.post('/questions',question([files[0],files[0]]))).status,400);
  assert.equal((await other.browser.post('/questions',question([files[0]]))).status,400);
  assert.equal((await other.browser.delete('/question-images/'+files[0])).status,404);
  await sql.query(`UPDATE "QuestionImage" SET "expiresAt"=now()-interval '1 second' WHERE id=$1`,[files[0]]);
  assert.equal((await owner.browser.post('/questions',question([files[0]]))).status,400);assert.equal((await read(files[0],owner)).status,404);
  await sql.query(`UPDATE "User" SET status='SUSPENDED' WHERE id=$1`,[other.id]);
  assert.equal((await upload(other)).status,401);assert.equal((await other.browser.patch('/questions/'+randomUUID(),{imageIds:[]})).status,401);
  assert.equal((await owner.browser.delete('/question-images/'+files[1])).status,204);assert.equal((await read(files[1],owner)).status,404);
});
test('trois captures PNG/JPEG/WebP, limite SQL et retrait complet sans modifier le texte',async()=>{
  const raw={width:40,height:20,data:Buffer.alloc(40*20*4,200)},ids:string[]=[];
  for(const bytes of [png(),jpeg.encode(raw,90).data,referenceWebp]){const uploaded=await upload(owner,Buffer.from(bytes),'application/octet-stream');assert.equal(uploaded.status,201);ids.push(uploaded.body.id);}
  const created=await owner.browser.post('/questions',question(ids));assert.equal(created.status,201);assert.equal(created.body.images.length,3);
  await assert.rejects(sql.query('UPDATE "QuestionImage" SET position=3 WHERE id=$1',[ids[0]]));
  const changed=await owner.browser.patch('/questions/'+created.body.id,{imageIds:[]});assert.equal(changed.status,200);assert.equal(changed.body.actual,created.body.actual);assert.deepEqual(changed.body.images,[]);
  for(const id of ids)assert.equal((await read(id,owner)).status,404);
});
test('nettoyage simulé puis réel : expirées et orphelins, fichiers récents et questions conservés',async()=>{
  const old='qi-'+randomUUID().replaceAll('-','')+'.jpg',fresh='qi-'+randomUUID().replaceAll('-','')+'.jpg';
  await writeFile(path.join(dir,old),png());await utimes(path.join(dir,old),new Date(0),new Date(0));await writeFile(path.join(dir,fresh),png());
  const service=server.app.get(QuestionImagesService),before=await readdir(dir);
  const dry=await service.cleanup();assert.ok(dry.selected>=1);assert.ok(dry.orphans>=1);assert.equal(dry.removed,0);assert.deepEqual(await readdir(dir),before);
  const executed=await service.cleanup(true);assert.ok(executed.removed>=1);assert.ok(executed.orphans>=1);
  assert.ok((await readdir(dir)).includes(fresh));assert.ok(!(await readdir(dir)).includes(old));
  assert.equal((await sql.query('SELECT count(*)::int AS n FROM "QuestionImage" WHERE "questionId" IS NOT NULL')).rows[0].n,1);
});
test('le nettoyage retire la capture seulement après le traitement de conservation de sa question',async()=>{
  const {rows:[image]}=await sql.query('SELECT id, key, "questionId" FROM "QuestionImage" WHERE "questionId" IS NOT NULL');
  assert.ok((await readdir(dir)).includes(image.key));
  await sql.query('UPDATE "Question" SET "retentionErasedAt"=now() WHERE id=$1',[image.questionId]);
  const service=server.app.get(QuestionImagesService);const dry=await service.cleanup();assert.equal(dry.selected,1);assert.ok((await readdir(dir)).includes(image.key));
  assert.equal((await service.cleanup(true)).removed,1);assert.ok(!(await readdir(dir)).includes(image.key));assert.equal((await read(image.id,owner)).status,404);
});
