import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {readdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createServer} from 'node:net';
import type {Client} from 'pg';
import {createTestDatabase,sqlClient,type TestDatabase} from './support/database';
import {startApp,type TestApp} from './support/app';
import {registerAdmin,registerMember,seedCatalogue,PASSWORD,type Member} from './support/fixtures';
import {Browser} from './support/browser';
import {RateLimiter} from '../src/common/rate-limit/rate-limiter.service';
import {MailService,type MailMessage} from '../src/modules/mail/mail.service';
import {NotificationRecorder,NotificationWorker,classifyMailFailure} from '../src/modules/mail/notifications';
import {validateEnvironment} from '../src/config/environment';
let db:TestDatabase,sql:Client,app:TestApp,admin:Member,owner:Member,technology:string,counter=0;
const reason='Motif confidentiel réservé aux administrateurs.',secret='Candidature privée et contact confidentiel.';
before(async()=>{process.env.NOTIFICATION_EVENTS_ENABLED='1';db=await createTestDatabase();sql=await sqlClient(db);app=await startApp(db.url);admin=await registerAdmin(app.api,sql,'email_admin');owner=await registerMember(app.api,'email_owner');technology=(await seedCatalogue(sql)).get('react')!;});
after(async()=>{await app?.close();await sql?.end();await db?.drop();});
async function clear(){await sql.query('DELETE FROM "EmailNotification"');app.app.get(RateLimiter).reset('project:'+owner.id);}
async function member(verified=true){const u=await registerMember(app.api,'email_member_'+(++counter));if(verified)await sql.query('UPDATE "User" SET "emailVerifiedAt"=now() WHERE id=$1',[u.id]);return u;}
async function application(verified=true){const candidate=await member(verified);const project=await owner.browser.post('/projects',{title:'Projet local de notification '+counter,objective:'Un projet fictif local pour vérifier les notifications.',technologyIds:[technology],recruitmentStatus:'OPEN'});assert.equal(project.status,201);const created=await candidate.browser.post('/projects/'+project.body.id+'/applications',{message:secret});assert.equal(created.status,201);return{candidate,project:project.body,id:created.body.id};}
const decide=(id:string)=>owner.browser.patch('/applications/'+id,{status:'ACCEPTED'});
async function suspend(u:Member){assert.equal((await admin.browser.post('/admin/moderation-actions',{decision:'SUSPEND_ACCOUNT',targetType:'USER',targetId:u.id,reason})).status,201);}
const reactivate=(id:string)=>admin.browser.post('/admin/accounts/'+id+'/reactivate',{reason});
// Use the Prisma client backing the real app; no mock of business state.
import {DatabaseService} from '../src/database/database.service';
const makeWorker=(send:(m:MailMessage)=>Promise<void>)=>new NotificationWorker(app.app.get(DatabaseService).prisma,send,'http://localhost:3000');

test('acceptance/repetition: one event, one file mail, verified recipient and private data excluded',async()=>{
 await clear();const {candidate,project,id}=await application();assert.equal((await decide(id)).status,200);assert.equal((await decide(id)).status,200);
 const rows=await sql.query('SELECT * FROM "EmailNotification"');assert.equal(rows.rowCount,1);assert.equal(rows.rows[0].decisionKey,'application:'+id);assert.equal(rows.rows[0].status,'PENDING');assert.ok(!JSON.stringify(rows.rows).includes(candidate.email));assert.ok(!JSON.stringify(rows.rows).includes(secret));
 const mail=app.app.get(MailService);let delivered:MailMessage|undefined;await makeWorker(async m=>{delivered=m;await mail.send(m);}).process();assert.equal(delivered!.to,candidate.email);assert.ok(delivered!.text.includes(project.title));assert.ok(delivered!.text.includes('http://localhost:3000/espace/projets'));assert.ok(!delivered!.text.includes(secret));assert.ok(delivered!.messageId?.includes(rows.rows[0].id));
 const messages=await Promise.all((await readdir(app.mailDir)).map(f=>readFile(join(app.mailDir,f),'utf8')));assert.ok(messages.some(m=>m.includes('Ta candidature a été acceptée')));assert.equal((await sql.query('SELECT status FROM "EmailNotification"')).rows[0].status,'SENT');
 const times=(await sql.query('SELECT "claimedAt","finishedAt" FROM "EmailNotification"')).rows[0];assert.ok(times.finishedAt>=times.claimedAt);
 let repeats=0;await makeWorker(async()=>{repeats++;}).process();assert.equal(repeats,0);
});
test('reactivation: motivated history, one concurrent decision/event, new login, revoked session unchanged',async()=>{
 await clear();const u=await member();await suspend(u);const results=await Promise.all([1,2,3,4].map(()=>reactivate(u.id)));assert.deepEqual(results.map(r=>r.status).sort(),[200,409,409,409]);assert.equal((await u.browser.get('/auth/me')).status,401);assert.equal((await new Browser(app.api).post('/auth/login',{email:u.email,password:PASSWORD})).status,200);
 assert.equal((await sql.query('SELECT count(*)::int n FROM "EmailNotification"')).rows[0].n,1);assert.equal((await reactivate(u.id)).status,409);
 let delivered:MailMessage|undefined;await makeWorker(async m=>{delivered=m;await app.app.get(MailService).send(m);}).process();assert.equal(delivered!.to,u.email);assert.ok(delivered!.text.includes('http://localhost:3000/connexion'));assert.ok(!JSON.stringify(delivered).includes(reason));assert.equal((await sql.query('SELECT count(*)::int n FROM "ModerationAction" WHERE "targetUserId"=$1 AND decision::text=\'REACTIVATE_ACCOUNT\'',[u.id])).rows[0].n,1);
});
test('concurrent acceptance and workers do not duplicate a decision or delivery attempt',async()=>{
 await clear();const {id}=await application();assert.deepEqual((await Promise.all([1,2,3,4].map(()=>decide(id)))).map(r=>r.status),[200,200,200,200]);assert.equal((await sql.query('SELECT count(*)::int n FROM "EmailNotification"')).rows[0].n,1);
 let sends=0;await Promise.all([1,2,3,4].map(()=>makeWorker(async()=>{sends++;await new Promise(r=>setTimeout(r,100));}).process()));assert.equal(sends,1);
});
test('unverified address explicitly skipped for both decisions; dispatch rechecks verification',async()=>{
 await clear();const {id}=await application(false);assert.equal((await decide(id)).status,200);const u=await member(false);await suspend(u);assert.equal((await reactivate(u.id)).status,200);let sends=0;await makeWorker(async()=>{sends++;}).process();assert.equal(sends,0);assert.equal((await sql.query('SELECT count(*)::int n FROM "EmailNotification" WHERE status=\'SKIPPED\' AND "lastCode"=\'UNVERIFIED_ADDRESS\'')).rows[0].n,2);
 const a=await application();await decide(a.id);await sql.query('UPDATE "User" SET "emailVerifiedAt"=NULL WHERE id=$1',[a.candidate.id]);await makeWorker(async()=>{sends++;}).process();assert.equal(sends,0);
});
test('temporary SMTP refusal bounded retries; lost response and stale claim become uncertain without replay',async()=>{
 await clear();const {id}=await application();await decide(id);const fail=makeWorker(async()=>{throw{responseCode:451};});const base=Date.now();
 for(let i=0;i<5;i++)await fail.process(1,new Date(base+i*3*3600000));assert.equal((await sql.query('SELECT status,attempts,"lastCode" FROM "EmailNotification"')).rows[0].status,'FAILED');assert.equal((await sql.query('SELECT attempts FROM "EmailNotification"')).rows[0].attempts,5);assert.equal((await owner.browser.get('/applications/'+id)).body.status,'ACCEPTED');
 await clear();const a=await application();await decide(a.id);await makeWorker(async()=>{throw{code:'ETIMEDOUT',command:'DATA',message:secret};}).process();assert.equal((await sql.query('SELECT status FROM "EmailNotification"')).rows[0].status,'UNCERTAIN');let replay=0;await makeWorker(async()=>{replay++;}).process();assert.equal(replay,0);assert.ok(!JSON.stringify(await makeWorker(async()=>{}).inspect()).includes(secret));
 await sql.query('UPDATE "EmailNotification" SET status=\'SENDING\',"claimedAt"=now()-interval \'10 minutes\'');await makeWorker(async()=>{replay++;}).process();assert.equal(replay,0);assert.equal((await sql.query('SELECT status FROM "EmailNotification"')).rows[0].status,'UNCERTAIN');
});
test('real SMTP connection failure does not revert either business decision',async()=>{
 await clear();const a=await application();await decide(a.id);const u=await member();await suspend(u);await reactivate(u.id);
 const port=await new Promise<number>(resolve=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=(s.address() as {port:number}).port;s.close(()=>resolve(p));});});
 const env=validateEnvironment({...process.env,NODE_ENV:'test',DATABASE_URL:db.url,APP_ORIGIN:'http://localhost:3000',MAIL_TRANSPORT:'smtp',SMTP_HOST:'127.0.0.1',SMTP_PORT:String(port)});const mail=new MailService(env);await makeWorker(m=>mail.send(m)).process();const rows=(await sql.query('SELECT status FROM "EmailNotification"')).rows;assert.equal(rows.length,2);assert.ok(rows.every(r=>['PENDING','UNCERTAIN'].includes(r.status)));assert.equal((await owner.browser.get('/applications/'+a.id)).body.status,'ACCEPTED');assert.equal((await new Browser(app.api).post('/auth/login',{email:u.email,password:PASSWORD})).status,200);
});
test('mail accepted but SENT persistence fails: recover uncertainty without a second send',async()=>{
 await clear();const a=await application();await decide(a.id);let sends=0;
 await sql.query(`CREATE FUNCTION reject_email_sent() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.status='SENT' THEN RAISE EXCEPTION 'fixture'; END IF; RETURN NEW; END $$; CREATE TRIGGER reject_email_sent BEFORE UPDATE ON "EmailNotification" FOR EACH ROW EXECUTE FUNCTION reject_email_sent();`);
 try{await assert.rejects(makeWorker(async m=>{sends++;await app.app.get(MailService).send(m);}).process());assert.equal(sends,1);assert.equal((await sql.query('SELECT status FROM "EmailNotification"')).rows[0].status,'SENDING');}finally{await sql.query('DROP TRIGGER reject_email_sent ON "EmailNotification";DROP FUNCTION reject_email_sent();');}
 await makeWorker(async()=>{sends++;}).process(20,new Date(Date.now()+6*60000));assert.equal(sends,1);assert.equal((await sql.query('SELECT status FROM "EmailNotification"')).rows[0].status,'UNCERTAIN');
});
test('outbox failure rolls back acceptance and reactivation in their transactions',async()=>{
 await clear();const a=await application(),u=await member();await suspend(u);await sql.query(`CREATE FUNCTION reject_email_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture'; END $$; CREATE TRIGGER reject_email_event BEFORE INSERT ON "EmailNotification" FOR EACH ROW EXECUTE FUNCTION reject_email_event();`);
 try{assert.equal((await decide(a.id)).status,500);assert.equal((await owner.browser.get('/applications/'+a.id)).body.status,'PENDING');assert.equal((await sql.query('SELECT count(*)::int n FROM "ProjectMember" WHERE "projectId"=$1 AND "userId"=$2',[a.project.id,a.candidate.id])).rows[0].n,0);assert.equal((await reactivate(u.id)).status,500);assert.equal((await sql.query('SELECT status FROM "User" WHERE id=$1',[u.id])).rows[0].status,'SUSPENDED');}finally{await sql.query('DROP TRIGGER reject_email_event ON "EmailNotification";DROP FUNCTION reject_email_event();');}
});
test('disabled collection is not backfilled; unique event key, expiry and retention',async()=>{
 await clear();const a=await application();const recorder=new NotificationRecorder({...validateEnvironment({...process.env,DATABASE_URL:db.url}),notificationEventsEnabled:false});await app.app.get(DatabaseService).prisma.$transaction(tx=>recorder.record(tx,{decisionKey:'disabled',kind:'ACCOUNT_REACTIVATED',userId:a.candidate.id}));assert.equal((await sql.query('SELECT count(*)::int n FROM "EmailNotification"')).rows[0].n,0);
 await decide(a.id);const row=(await sql.query('SELECT * FROM "EmailNotification"')).rows[0];await assert.rejects(sql.query('INSERT INTO "EmailNotification"(id,"decisionKey",kind) VALUES(gen_random_uuid(),$1,\'ACCOUNT_REACTIVATED\')',[row.decisionKey]));await sql.query('UPDATE "EmailNotification" SET "createdAt"=now()-interval \'8 days\'');let sends=0;await makeWorker(async()=>{sends++;}).process();assert.equal(sends,0);assert.equal((await sql.query('SELECT "lastCode" FROM "EmailNotification"')).rows[0].lastCode,'EXPIRED');await sql.query('UPDATE "EmailNotification" SET "createdAt"=now()-interval \'31 days\'');assert.equal((await makeWorker(async()=>{}).prune()).count,1);
 assert.equal(classifyMailFailure({responseCode:550}),'PERMANENT');assert.equal(classifyMailFailure(undefined),'UNCERTAIN');
});
