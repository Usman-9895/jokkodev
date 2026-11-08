import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import type {Client} from 'pg';
import {createTestDatabase,sqlClient,type TestDatabase} from './support/database';
import {startApp,type TestApp} from './support/app';
import {Browser} from './support/browser';
import {registerAdmin,registerMember,PASSWORD,type Member,seedCatalogue} from './support/fixtures';
let db:TestDatabase,app:TestApp,sql:Client,admin:Member,member:Member;
const reason='Réexamen motivé après échange avec le membre.';
before(async()=>{db=await createTestDatabase();sql=await sqlClient(db);app=await startApp(db.url);admin=await registerAdmin(app.api,sql,'reactivation_admin');member=await registerMember(app.api,'reactivation_member');});
after(async()=>{await app?.close();await sql?.end();await db?.drop();});
async function suspended(name:string){const u=await registerMember(app.api,name);assert.equal((await admin.browser.post('/admin/moderation-actions',{decision:'SUSPEND_ACCOUNT',targetType:'USER',targetId:u.id,reason})).status,201);return u;}
const endpoint=(id:string)=>'/admin/accounts/'+id+'/reactivate';
test('parcours complet, historique conservé, contenu masqué et anciennes sessions restent invalides',async()=>{
 const u=await registerMember(app.api,'reactivation_full');const tech=await seedCatalogue(sql);
 const q=await u.browser.post('/questions',{title:'Question de contrôle réactivation',context:'Contexte suffisant pour tester.',expected:'Attendu',actual:'Obtenu',attempts:'Essais',technologyIds:[tech.get('go')]});assert.equal(q.status,201);
 await admin.browser.post('/admin/moderation-actions',{decision:'HIDE_CONTENT',targetType:'QUESTION',targetId:q.body.id,reason});
 assert.equal((await admin.browser.post('/admin/moderation-actions',{decision:'SUSPEND_ACCOUNT',targetType:'USER',targetId:u.id,reason})).status,201);
 const login=new Browser(app.api);assert.equal((await login.post('/auth/login',{email:u.email,password:PASSWORD})).body.code,'ACCOUNT_SUSPENDED');
 const result=await admin.browser.post(endpoint(u.id),{reason});assert.equal(result.status,200);assert.equal(result.body.decision,'REACTIVATE_ACCOUNT');assert.equal(result.body.admin.id,admin.id);assert.equal(result.body.target.id,u.id);assert.equal(result.body.reason,reason);assert.ok(Date.parse(result.body.createdAt));
 assert.equal((await u.browser.get('/auth/me')).status,401);assert.equal((await login.post('/auth/login',{email:u.email,password:PASSWORD})).status,200);
 assert.equal((await login.get('/questions/'+q.body.id)).status,404);
 const rows=await sql.query('SELECT decision::text FROM "ModerationAction" WHERE "targetUserId"=$1 ORDER BY "createdAt"',[u.id]);assert.deepEqual(rows.rows.map(r=>r.decision),['SUSPEND_ACCOUNT','REACTIVATE_ACCOUNT']);
 assert.equal((await admin.browser.post(endpoint(u.id),{reason})).status,409);
});
test('droits, CSRF, motif obligatoire et compte inconnu',async()=>{
 const u=await suspended('reactivation_rights');const guest=new Browser(app.api);
 assert.equal((await guest.post(endpoint(u.id),{reason})).status,401);
 assert.equal((await member.browser.post(endpoint(u.id),{reason})).status,403);
 assert.equal((await member.browser.get('/admin/suspended-accounts')).status,403);
 assert.equal((await admin.browser.request('POST',endpoint(u.id),{reason})).status,403);
 for(const body of [{},{reason:''},{reason:'          '}])assert.equal((await admin.browser.post(endpoint(u.id),body)).status,400);
 assert.equal((await admin.browser.post(endpoint('00000000-0000-4000-8000-000000000000'),{reason})).status,404);
 const list=await admin.browser.get('/admin/suspended-accounts');assert.equal(list.status,200);assert.ok(list.body.data.some((a:{id:string})=>a.id===u.id));assert.ok(!JSON.stringify(list.body).includes('@example.test'));
});
test('concurrence : un seul changement et un seul reçu historique',async()=>{
 const u=await suspended('reactivation_concurrent');
 const responses=await Promise.all([1,2,3,4].map(()=>admin.browser.post(endpoint(u.id),{reason})));
 assert.deepEqual(responses.map(r=>r.status).sort(),[200,409,409,409]);
 const {rows}=await sql.query('SELECT count(*)::int AS count FROM "ModerationAction" WHERE "targetUserId"=$1 AND decision::text=\'REACTIVATE_ACCOUNT\'',[u.id]);assert.equal(rows[0].count,1);
});
test('échec historique annule le changement de statut',async()=>{
 const u=await suspended('reactivation_rollback');
 await sql.query(`CREATE FUNCTION reject_reactivation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.decision::text='REACTIVATE_ACCOUNT' THEN RAISE EXCEPTION 'fixture'; END IF; RETURN NEW; END $$; CREATE TRIGGER reject_reactivation BEFORE INSERT ON "ModerationAction" FOR EACH ROW EXECUTE FUNCTION reject_reactivation();`);
 try{assert.equal((await admin.browser.post(endpoint(u.id),{reason})).status,500);assert.equal((await sql.query('SELECT status FROM "User" WHERE id=$1',[u.id])).rows[0].status,'SUSPENDED');}finally{await sql.query('DROP TRIGGER reject_reactivation ON "ModerationAction"; DROP FUNCTION reject_reactivation();');}
});
