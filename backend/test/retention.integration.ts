import 'reflect-metadata';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {beforeEach,afterEach,test} from 'node:test';
import {createTestDatabase,sqlClient,type TestDatabase} from './support/database';
import {createPrismaClient,type DatabaseService} from '../src/database/database.service';
import type {PrismaClient} from '../src/generated/prisma/client';
import {RetentionService,RETENTION_LOCK} from '../src/modules/retention/retention.service';
import {ERASED_MESSAGE,days,months,inactivityDue} from '../src/modules/retention/policy';
import {SessionsService} from '../src/modules/auth/sessions.service';
import {AccountTokensService} from '../src/modules/auth/account-tokens.service';
import {hashToken,newToken} from '../src/modules/auth/tokens';
import {startApp} from './support/app';
import {Browser} from './support/browser';
import {ReputationService} from '../src/modules/reputation/reputation.service';

let database:TestDatabase,db:PrismaClient,now:Date,service:RetentionService,counter:number;
beforeEach(async()=>{database=await createTestDatabase();db=createPrismaClient(database.url);now=new Date('2026-10-26T12:00:00Z');service=new RetentionService(db,()=>new Date(now));counter=0;});
afterEach(async()=>{
 try{
  // Independent invariant after every scenario, including rollback and manual-review cases.
  const scores=await db.$queryRaw<{actual:bigint;expected:bigint}[]>`SELECT
   COALESCE((SELECT sum(e.delta) FROM "ReputationEvent" e WHERE e."userId"=u.id),0)::bigint AS actual,
   (10 * (SELECT count(*) FROM "Question" q JOIN "Answer" a ON a.id=q."acceptedAnswerId" AND a."questionId"=q.id
    WHERE a."authorId"=u.id AND a."authorId"<>q."authorId" AND q.visibility='VISIBLE' AND a.visibility='VISIBLE' AND q."deletedAt" IS NULL))::bigint AS expected FROM "User" u`;
  for(const score of scores)assert.equal(score.actual,score.expected);
 }finally{await db?.$disconnect();await database?.drop();}
});
function user(verified=true){const n=++counter;return db.user.create({data:{email:`retention_${n}@example.test`,username:`retention_${n}`,usernameKey:`retention_${n}`,passwordHash:'test-fixture-not-a-usable-password',emailVerifiedAt:verified?now:null,retentionObservedAt:now,createdAt:now,profile:{create:{}}}});}
function question(authorId:string){return db.question.create({data:{authorId,title:'Question fictive dédiée',context:'Contexte de test uniquement',expected:'Attendu',actual:'Observé',attempts:'Essai'}});}
function project(ownerId:string){return db.project.create({data:{ownerId,title:'Projet fictif dédié',objective:'Objectif de test'}});}
const changed=(r:Awaited<ReturnType<RetentionService['run']>>)=>Object.values(r.categories).reduce((n,c)=>n+c.changed,0);

test('retention simulation is strictly read-only, no notice email, no ledger or review writes',async()=>{
 const u=await user(false);await db.user.update({where:{id:u.id},data:{createdAt:days(now,-31)}});
 const before=await db.user.findMany();const r=await service.run();assert.equal(r.categories.UNVERIFIED.eligible,1);assert.equal(changed(r),0);
 assert.deepEqual(await db.user.findMany(),before);assert.equal(await db.retentionEvent.count(),0);assert.equal(await db.retentionReview.count(),0);assert.equal(await db.inactivityNotice.count(),0);
});
test('sessions: absolute, idle and revocation end; exact 30-day boundary; active rows preserved',async()=>{
 const u=await user();
 const make=(revokedAt:Date|null,expiresAt:Date,lastSeenAt:Date)=>db.session.create({data:{userId:u.id,tokenHash:randomBytes(32),createdAt:days(now,-90),expiresAt,lastSeenAt,revokedAt}});
 const exact=await make(days(now,-30),days(now,2),now),edge=await make(new Date(days(now,-30).getTime()+1),days(now,2),now),active=await make(null,days(now,7),now),idle=await make(null,days(now,2),days(now,-32));
 await service.run(true);assert.equal(await db.session.count({where:{id:{in:[exact.id,idle.id]}}}),0);assert.equal(await db.session.count({where:{id:{in:[edge.id,active.id]}}}),2);
 now=new Date(now.getTime()+1);await service.run(true);assert.equal(await db.session.count({where:{id:edge.id}}),0);assert.equal(changed(await service.run(true)),0);
});
test('account links: seven days after consumption or expiry, never delete usable token',async()=>{
 const u=await user();const make=(expiresAt:Date,consumedAt:Date|null)=>db.accountToken.create({data:{userId:u.id,purpose:'EMAIL_VERIFICATION',tokenHash:randomBytes(32),createdAt:days(now,-10),expiresAt,consumedAt}});
 const used=await make(days(now,1),days(now,-7)),expired=await make(days(now,-7),null),live=await make(days(now,1),null),edge=await make(new Date(days(now,-7).getTime()+1),null);
 await service.run(true);assert.equal(await db.accountToken.count({where:{id:{in:[used.id,expired.id]}}}),0);assert.equal(await db.accountToken.count({where:{id:{in:[live.id,edge.id]}}}),2);
});
test('unverified users: exact 30 days, dependencies and every ADMIN go to manual review',async()=>{
 const empty=await user(false),dependent=await user(false),admin=await user(false),young=await user(false);await question(dependent.id);
 await db.user.updateMany({where:{id:{in:[empty.id,dependent.id,admin.id]}},data:{createdAt:days(now,-30)}});await db.user.update({where:{id:admin.id},data:{role:'ADMIN'}});
 await service.run(true);assert.equal(await db.user.count({where:{id:empty.id}}),0);assert.equal(await db.user.count({where:{id:{in:[dependent.id,admin.id,young.id]}}}),3);assert.equal(await db.retentionReview.count(),2);assert.equal(changed(await service.run(true)),0);
});
test('legacy accounts: observation baseline, no invented last login and no first-run mass closure',async()=>{
 const u=await user();await db.user.update({where:{id:u.id},data:{createdAt:new Date('2018-01-01Z'),lastLoginAt:null}});await service.run(true);
 assert.equal(await db.inactivityNotice.count(),0);assert.equal((await db.user.findUniqueOrThrow({where:{id:u.id}})).lastLoginAt,null);
});
test('inactivity: one notice, delayed closure waits full notice, successful login cancels it',async()=>{
 const u=await user(),basis=months(now,-24),due=inactivityDue(basis);await db.user.update({where:{id:u.id},data:{lastLoginAt:basis}});now=days(due,-30);
 await service.run(true);await service.run(true);assert.equal(await db.inactivityNotice.count(),1);let sent=0;await service.notify(async()=>{sent++;});await service.notify(async()=>{sent++;});assert.equal(sent,1);
 now=new Date(due.getTime()-1);await service.run(true);assert.equal(await db.user.count({where:{id:u.id}}),1);
 const sessions=new SessionsService({prisma:db} as DatabaseService);await sessions.create(u.id);now=days(due,1);await service.run(true);assert.equal(await db.user.count({where:{id:u.id}}),1);assert.equal((await db.inactivityNotice.findFirstOrThrow()).state,'CANCELLED');
});
test('inactivity: final check erases only an empty verified account after confirmed full notice',async()=>{
 const u=await user();await db.user.update({where:{id:u.id},data:{lastLoginAt:months(now,-24)}});await service.run(true);await service.notify(async()=>{});now=days(now,30);await service.run(true);assert.equal(await db.user.count({where:{id:u.id}}),0);assert.equal(changed(await service.run(true)),0);
});
test('uncertain notice is never automatically resent and cannot close the account',async()=>{
 const u=await user();await db.user.update({where:{id:u.id},data:{lastLoginAt:months(now,-24)}});await service.run(true);let attempts=0;const send=async()=>{attempts++;throw Error('simulated transport loss');};
 await service.notify(send);await service.notify(send);assert.equal(attempts,1);now=days(now,60);await service.run(true);assert.equal(await db.user.count({where:{id:u.id}}),1);assert.equal((await db.inactivityNotice.findFirstOrThrow()).state,'UNCERTAIN');
});
test('login concurrent with notice delivery cancels the persisted notice before any closure',async()=>{
 const u=await user();await db.user.update({where:{id:u.id},data:{lastLoginAt:months(now,-24)}});await service.run(true);
 let started!:()=>void,release!:()=>void;const delivered=new Promise<void>(r=>{started=r;}),resume=new Promise<void>(r=>{release=r;});
 const sending=service.notify(async()=>{started();await resume;});await delivered;const login=new SessionsService({prisma:db} as DatabaseService).create(u.id);release();await sending;await login;
 assert.equal((await db.inactivityNotice.findFirstOrThrow()).state,'CANCELLED');now=days(now,31);await service.run(true);assert.equal(await db.user.count({where:{id:u.id}}),1);
});
test('failure recording a sent notice reports uncertainty, not success and not an automatic resend',async()=>{
 const u=await user();await db.user.update({where:{id:u.id},data:{lastLoginAt:months(now,-24)}});await service.run(true);const sql=await sqlClient(database);
 try{await sql.query(`CREATE FUNCTION fail_sent_notice() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.state='SENT' THEN RAISE EXCEPTION 'simulated write failure after send'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_sent_notice BEFORE UPDATE ON "InactivityNotice" FOR EACH ROW EXECUTE FUNCTION fail_sent_notice()`);
 let attempts=0;const send=async()=>{attempts++;};assert.deepEqual(await service.notify(send),{sent:0,uncertain:1,cancelled:0});await service.notify(send);assert.equal(attempts,1);assert.equal((await db.inactivityNotice.findFirstOrThrow()).state,'UNCERTAIN');
 }finally{await sql.end();}
});
test('decided applications: erase message at six calendar months, preserve membership/status; pending untouched',async()=>{
 const owner=await user(),candidate=await user(),pending=await user();const p=await project(owner.id);
 const a=await db.application.create({data:{projectId:p.id,applicantId:candidate.id,status:'ACCEPTED',message:'Message privé fictif à effacer.',decidedAt:new Date('2026-04-30T12:00:00Z')}});await db.projectMember.create({data:{projectId:p.id,userId:candidate.id}});
 await db.application.create({data:{projectId:p.id,applicantId:pending.id,message:'Message en attente sans échéance.'}});
 now=new Date('2026-10-30T11:59:59.999Z');await service.run(true);assert.equal((await db.application.findUniqueOrThrow({where:{id:a.id}})).messageErasedAt,null);
 now=new Date('2026-10-30T12:00:00Z');await service.run(true);const after=await db.application.findUniqueOrThrow({where:{id:a.id}});assert.equal(after.message,ERASED_MESSAGE);assert.equal(after.status,'ACCEPTED');assert.equal(await db.projectMember.count(),1);assert.match((await db.application.findFirstOrThrow({where:{status:'PENDING'}})).message,/attente/);assert.equal(changed(await service.run(true)),0);
});
test('deleted content: erase only unnecessary own text, preserve third-party answers and reputation ledger',async()=>{
 const owner=await user(),other=await user();const clean=await question(owner.id),shared=await question(owner.id),p=await project(owner.id);const answer=await db.answer.create({data:{questionId:shared.id,authorId:other.id,body:'Réponse utile d’un tiers'}});
 const rep=new ReputationService({prisma:db} as DatabaseService);
 await db.$transaction(async tx=>{await rep.lockMutation(tx);await tx.question.update({where:{id:shared.id},data:{acceptedAnswerId:answer.id}});await rep.syncQuestion(tx,shared.id);await tx.question.update({where:{id:shared.id},data:{acceptedAnswerId:null,deletedAt:days(now,-30)}});await rep.syncQuestion(tx,shared.id,'QUESTION_DELETED');});
 const history=await db.reputationEvent.findMany();assert.equal(await rep.score(other.id),0);
 const edge=new Date(days(now,-30).getTime()+1);
 await db.question.update({where:{id:clean.id},data:{deletedAt:edge}});await db.project.update({where:{id:p.id},data:{deletedAt:edge,recruitmentStatus:'CLOSED'}});await service.run(true);
 assert.equal((await db.question.findUniqueOrThrow({where:{id:clean.id}})).retentionErasedAt,null);assert.equal((await db.project.findUniqueOrThrow({where:{id:p.id}})).retentionErasedAt,null);
 now=new Date(now.getTime()+1);await service.run(true);
 assert.ok((await db.question.findUniqueOrThrow({where:{id:clean.id}})).retentionErasedAt);assert.ok((await db.project.findUniqueOrThrow({where:{id:p.id}})).retentionErasedAt);assert.equal((await db.question.findUniqueOrThrow({where:{id:shared.id}})).retentionErasedAt,null);assert.deepEqual(await db.reputationEvent.findMany(),history);assert.equal(await rep.score(other.id),0);
});
test('closed reports: expired NO_ACTION removed, active sanction/history sent to review',async()=>{
 const reporter=await user(),author=await user(),admin=await user();const q=await question(author.id);
 const make=async(decision:'NO_ACTION'|'HIDE_CONTENT')=>{const r=await db.report.create({data:{reporterId:reporter.id,questionId:q.id,reason:'Motif fictif',status:'CLOSED',decision,closedById:admin.id,closedAt:months(now,-12)}});await db.moderationAction.create({data:{adminId:admin.id,questionId:q.id,reportId:r.id,decision,reason:'Décision fictive'}});return r;};
 const r=await make('NO_ACTION');await db.report.update({where:{id:r.id},data:{closedAt:new Date(months(now,-12).getTime()+1)}});await service.run(true);assert.equal(await db.report.count({where:{id:r.id}}),1);
 now=new Date(now.getTime()+1);await service.run(true);assert.equal(await db.report.count({where:{id:r.id}}),0);
 const hidden=await make('HIDE_CONTENT');await service.run(true);assert.equal(await db.report.count({where:{id:hidden.id}}),1);assert.equal(await db.moderationAction.count({where:{reportId:hidden.id}}),1);
});
test('dated exceptions: held data stays; overdue review counted; expiry resumes cleanup',async()=>{
 const u=await user(false);await db.user.update({where:{id:u.id},data:{createdAt:days(now,-31)}});await db.retentionHold.create({data:{category:'UNVERIFIED',entityId:u.id,reason:'Contestation fictive précise',owner:'Responsable de test',reviewAt:days(now,-1),untilAt:days(now,1)}});
 const result=await service.run(true);assert.equal(result.overdueHolds,1);assert.equal(await db.user.count({where:{id:u.id}}),1);now=days(now,1);await service.run(true);assert.equal(await db.user.count({where:{id:u.id}}),0);
});
test('global maintenance lock rejects a concurrent run without partial changes',async()=>{
 const sql=await sqlClient(database);try{await sql.query('BEGIN');await sql.query('SELECT pg_advisory_xact_lock($1,0)',[RETENTION_LOCK]);assert.equal((await service.run(true)).busy,true);}finally{await sql.query('ROLLBACK');await sql.end();}
});
test('failure rolls back erasure and registry atomically, reputation events untouched',async()=>{
 const u=await user(false);await db.user.update({where:{id:u.id},data:{createdAt:days(now,-31)}});const sql=await sqlClient(database);try{await sql.query(`CREATE FUNCTION reject_retention_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test failure'; END $$; CREATE TRIGGER reject_retention_event BEFORE INSERT ON "RetentionEvent" FOR EACH ROW EXECUTE FUNCTION reject_retention_event()`);await assert.rejects(service.run(true));assert.equal(await db.user.count({where:{id:u.id}}),1);assert.equal(await db.retentionEvent.count(),0);}finally{await sql.end();}
});
test('concurrent email verification wins under the same user lock; account is not erased',async()=>{
 const u=await user(false);await db.user.update({where:{id:u.id},data:{createdAt:days(now,-31)}});const token=newToken();await db.accountToken.create({data:{userId:u.id,purpose:'EMAIL_VERIFICATION',tokenHash:hashToken(token.token),expiresAt:days(new Date(),1)}});
 const tokens=new AccountTokensService({prisma:db} as DatabaseService);let release!:()=>void,locked!:()=>void;const barrier=new Promise<void>(r=>{locked=r;}),resume=new Promise<void>(r=>{release=r;});
 const verification=db.$transaction(async tx=>{assert.equal(await tokens.consume(token.token,'EMAIL_VERIFICATION',tx),u.id);locked();await resume;await tx.user.update({where:{id:u.id},data:{emailVerifiedAt:now}});});await barrier;await service.run(true);release();await verification;await service.run(true);assert.equal(await db.user.count({where:{id:u.id}}),1);
});
test('concurrent fresh application decision cannot erase a newly needed message',async()=>{
 const owner=await user(),candidate=await user(),p=await project(owner.id);const a=await db.application.create({data:{projectId:p.id,applicantId:candidate.id,message:'Message de demande toujours nécessaire.'}});
 const sql=await sqlClient(database);try{await sql.query('BEGIN');await sql.query('UPDATE "Application" SET status=\'ACCEPTED\',"decidedAt"=$1 WHERE id=$2',[now,a.id]);await service.run(true);await sql.query('COMMIT');await service.run(true);assert.equal((await db.application.findUniqueOrThrow({where:{id:a.id}})).messageErasedAt,null);}finally{await sql.query('ROLLBACK');await sql.end();}
});
test('API after erasure exposes placeholder only to the parties, not a third member; membership and scores preserved',async()=>{
 const app=await startApp(database.url);try{
  const owner=new Browser(app.api),candidate=new Browser(app.api),third=new Browser(app.api);
  const register=async(b:Browser,n:string)=>{const r=await b.post('/auth/register',{email:`${n}@example.test`,username:n,password:'fixture password only 2026'});assert.equal(r.status,201);return r.body.user.id as string;};
  const ownerId=await register(owner,'retention_owner'),candidateId=await register(candidate,'retention_candidate');await register(third,'retention_third');const p=await project(ownerId);
  const a=await db.application.create({data:{projectId:p.id,applicantId:candidateId,message:'Message privé fictif qui doit disparaître.',status:'ACCEPTED',decidedAt:months(now,-6)}});await db.projectMember.create({data:{projectId:p.id,userId:candidateId}});
  await service.run(true);const own=await owner.get('/applications/'+a.id),sent=await candidate.get('/applications/'+a.id),denied=await third.get('/applications/'+a.id);
  assert.equal(own.status,200);assert.equal(sent.body.message,ERASED_MESSAGE);assert.equal(own.body.message,ERASED_MESSAGE);assert.equal(denied.status,404);assert.equal(await db.projectMember.count(),1);assert.equal(await new ReputationService({prisma:db} as DatabaseService).score(candidateId),0);
 }finally{await app.close();}
});
test('bounded selected categories and concurrent moderation preserve a newly necessary history',async()=>{
 const owner=await user(),q=await question(owner.id),reporter=await user(),admin=await user();await db.question.update({where:{id:q.id},data:{deletedAt:days(now,-30)}});
 const sql=await sqlClient(database);try{
  await sql.query('BEGIN');await sql.query('SELECT id FROM "Question" WHERE id=$1 FOR UPDATE',[q.id]);
  await service.run(true,1,['QUESTION']);assert.equal((await db.question.findUniqueOrThrow({where:{id:q.id}})).retentionErasedAt,null);
  await sql.query('INSERT INTO "ModerationAction" (id,"adminId",decision,reason,"questionId") VALUES (gen_random_uuid(),$1,\'HIDE_CONTENT\',\'Contexte de modération nécessaire\',$2)',[admin.id,q.id]);await sql.query('COMMIT');
  await service.run(true,1,['QUESTION']);assert.equal((await db.question.findUniqueOrThrow({where:{id:q.id}})).retentionErasedAt,null);
  assert.equal((await db.retentionReview.findFirstOrThrow()).reason,'THIRD_PARTY_OR_MODERATION');assert.equal(await new ReputationService({prisma:db} as DatabaseService).score(reporter.id),0);
 }finally{await sql.query('ROLLBACK');await sql.end();}
});
test('concurrent suspension retains an expired NO_ACTION report after the locked account status is reread',async()=>{
 const author=await user(),reporter=await user(),admin=await user(),q=await question(author.id);
 const r=await db.report.create({data:{reporterId:reporter.id,questionId:q.id,reason:'Ancien motif fictif',status:'CLOSED',decision:'NO_ACTION',closedById:admin.id,closedAt:months(now,-12)}});
 const sql=await sqlClient(database),observer=await sqlClient(database);let run:ReturnType<RetentionService['run']>|undefined;
 try{
  await sql.query('BEGIN');await sql.query('SELECT id FROM "User" WHERE id=$1 FOR UPDATE',[author.id]);run=service.run(true,10,['REPORT']);
  let waited=false;for(let i=0;i<100;i++){
   // Separate autocommit observer: stats queried inside the locking transaction can keep a cached snapshot.
   const rows=await observer.query(`SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%FROM "User"%FOR SHARE%'`);
   if(rows.rowCount){waited=true;break;}await new Promise(resolve=>setTimeout(resolve,10));
  }
  assert.equal(waited,true,'real retention transaction must wait on the concurrent user lock');
  await sql.query('UPDATE "User" SET status=\'SUSPENDED\' WHERE id=$1',[author.id]);await sql.query('COMMIT');await run;
  assert.equal(await db.report.count({where:{id:r.id}}),1);assert.equal((await db.retentionReview.findFirstOrThrow()).reason,'SANCTION_OR_HISTORY');
 }finally{await sql.query('ROLLBACK');await sql.end();await observer.end();await run;}
});

test('inactivity batches progress past queued and sent notices whose closure is not due',async()=>{
 const basis=new Date('2024-11-10T12:00:00Z');
 const sent=await db.user.create({data:{id:'00000000-0000-4000-8000-000000000001',email:'sent@example.test',username:'sent',usernameKey:'sent',passwordHash:'fixture',emailVerifiedAt:now,lastLoginAt:basis}});
 const queued=await db.user.create({data:{id:'00000000-0000-4000-8000-000000000002',email:'queued@example.test',username:'queued',usernameKey:'queued',passwordHash:'fixture',emailVerifiedAt:now,lastLoginAt:basis}});
 const fresh=await db.user.create({data:{id:'00000000-0000-4000-8000-000000000003',email:'fresh@example.test',username:'fresh',usernameKey:'fresh',passwordHash:'fixture',emailVerifiedAt:now,lastLoginAt:months(now,-24)}});
 await db.inactivityNotice.create({data:{userId:sent.id,basisAt:basis,dueAt:new Date('2026-11-14T12:00:00Z'),state:'SENT',sentAt:new Date('2026-10-15T12:00:00Z')}});
 await db.inactivityNotice.create({data:{userId:queued.id,basisAt:basis,dueAt:inactivityDue(basis),state:'QUEUED'}});
 const simulation=await service.run(false,1,['INACTIVITY']);assert.equal(simulation.categories.INACTIVITY.planned,1);assert.equal(await db.inactivityNotice.count(),2);
 const result=await service.run(true,1,['INACTIVITY']);assert.equal(result.categories.INACTIVITY.changed,1);
 assert.equal((await db.inactivityNotice.findFirstOrThrow({where:{userId:fresh.id}})).state,'QUEUED');
 assert.equal(await db.user.count(),3);assert.equal((await db.inactivityNotice.findFirstOrThrow({where:{userId:sent.id}})).state,'SENT');
 assert.equal(changed(await service.run(true,1,['INACTIVITY'])),0);
});

test('bounded retention signals remaining work and successive passes cover every actionable user',async()=>{
 for(let i=0;i<4;i++){const u=await user();await db.user.update({where:{id:u.id},data:{lastLoginAt:months(now,-24)}});}
 for(let i=0;i<4;i++){
  const result=await service.run(true,1,['INACTIVITY']);
  assert.equal(result.categories.INACTIVITY.changed,1);assert.equal(result.truncated,i<3);
  assert.equal(await db.inactivityNotice.count(),i+1);assert.equal(await db.user.count(),4);
 }
 const final=await service.run(true,1,['INACTIVITY']);assert.equal(changed(final),0);assert.equal(final.truncated,false);
});

test('a sent notice without confirmed timestamp goes to review and cannot starve other users',async()=>{
 const invalid=await db.user.create({data:{id:'00000000-0000-4000-8000-000000000001',email:'invalid_notice@example.test',username:'invalid_notice',usernameKey:'invalid_notice',passwordHash:'fixture',emailVerifiedAt:now,lastLoginAt:months(now,-24)}});
 const next=await user();await db.user.update({where:{id:next.id},data:{lastLoginAt:months(now,-24)}});
 await db.inactivityNotice.create({data:{userId:invalid.id,basisAt:months(now,-24),dueAt:now,state:'SENT',sentAt:null}});
 const first=await service.run(true,1,['INACTIVITY']);assert.equal(first.categories.INACTIVITY.manual,1);assert.equal(first.truncated,true);
 const second=await service.run(true,1,['INACTIVITY']);assert.equal(second.categories.INACTIVITY.changed,1);
 assert.equal((await db.inactivityNotice.findFirstOrThrow({where:{userId:next.id}})).state,'QUEUED');assert.equal(await db.user.count(),2);
});
