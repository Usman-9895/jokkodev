import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import type {Client} from 'pg';
import {createTestDatabase,sqlClient,type TestDatabase} from './support/database';
import {startApp,lastMail,tokenFrom,type TestApp} from './support/app';
import {Browser} from './support/browser';
import {registerMember,PASSWORD,type Member} from './support/fixtures';
import {SimulatedGoogle} from './support/google-provider';
import {GoogleOidc} from '../src/modules/auth/google.oidc';
import {GoogleService,googleReturnPath,googleCookieName} from '../src/modules/auth/google.service';
import {validateEnvironment} from '../src/config/environment';
let db:TestDatabase,sql:Client,app:TestApp,provider:SimulatedGoogle,member:Member;
const clientId='local-recipe.apps.googleusercontent.com';
before(async()=>{
 Object.assign(process.env,{GOOGLE_AUTH_ENABLED:'1',GOOGLE_CLIENT_ID:clientId,GOOGLE_CLIENT_SECRET:'fixture-only',GOOGLE_REDIRECT_URI:'http://localhost:3000/api/v1/auth/google/callback'});
 db=await createTestDatabase();sql=await sqlClient(db);provider=await new SimulatedGoogle().start();app=await startApp(db.url);
 const config=provider.configuration(clientId);Object.defineProperty(app.app.get(GoogleOidc),'configuration',{value:async()=>config});
 member=await registerMember(app.api,'google_existing');await sql.query('UPDATE "User" SET "emailVerifiedAt"=now() WHERE id=$1',[member.id]);
});
after(async()=>{await app?.close();await provider?.close();await sql?.end();await db?.drop();});
async function start(browser:Browser,returnTo='/espace'){
 const response=await browser.post('/auth/google/start',{returnTo});assert.equal(response.status,200);return new URL(response.body.authorizationUrl);
}
async function callback(browser:Browser,url:string){
 const u=new URL(url),response=await fetch(app.api+'/auth/google/callback'+u.search,{redirect:'manual',headers:{Cookie:[...browser.cookies].map(([key,value])=>key+'='+encodeURIComponent(value)).join('; '),'X-Forwarded-For':browser.ip}});
 for(const cookie of response.headers.getSetCookie()){
  const pair=cookie.split(';')[0],at=pair.indexOf('='),name=pair.slice(0,at),value=decodeURIComponent(pair.slice(at+1));if(value)browser.cookies.set(name,value);else browser.cookies.delete(name);
 }
 browser.csrfToken=undefined;assert.equal(response.status,303);assert.equal(response.headers.get('Referrer-Policy'),'no-referrer');return new URL(response.headers.get('location')!);
}
async function pending(browser:Browser,sub:string,email:string){const authorization=await start(browser);const result=await callback(browser,provider.callback(authorization,{sub,email}));assert.equal(result.pathname,'/connexion/google');assert.equal(result.search,'');return authorization;}
test('provider status and start: CSRF required, exact callback, minimal scopes and PKCE',async()=>{
 const b=new Browser(app.api);assert.equal((await b.get('/auth/google/status')).body.enabled,true);
 assert.equal((await b.request('POST','/auth/google/start',{})).status,403);
 const u=await start(b,'https://attacker.invalid');assert.equal(u.searchParams.get('scope'),'openid email');assert.equal(u.searchParams.get('code_challenge_method'),'S256');assert.ok(u.searchParams.get('nonce'));assert.ok(u.searchParams.get('state'));assert.equal(u.searchParams.get('redirect_uri'),process.env.GOOGLE_REDIRECT_URI);
 assert.equal(u.searchParams.has('client_secret'),false);assert.equal(googleReturnPath('https://attacker.invalid'),'/espace');
 const rows=(await sql.query('SELECT payload FROM "GoogleFlow"')).rows;assert.ok(!JSON.stringify(rows).includes(u.searchParams.get('nonce')!));
});
test('first access: explicit pseudo/password and normal verification; one account, identity and existing session',async()=>{
 const b=new Browser(app.api);await pending(b,'first-member','first_google@example.test');assert.equal((await b.get('/auth/me')).status,401);
 const status=await b.get('/auth/google/pending');assert.equal(status.body.kind,'register');assert.equal(status.body.email,'first_google@example.test');
 assert.equal((await b.post('/auth/google/register',{username:'x',password:PASSWORD})).status,400);
 assert.equal((await b.post('/auth/google/register',{username:'google_first',password:'short'})).status,400);
 const result=await b.post('/auth/google/register',{username:'google_first',password:PASSWORD});assert.equal(result.status,200);assert.equal(result.body.user.emailVerified,false);assert.equal(result.body.user.role,'MEMBER');assert.equal((await b.get('/auth/me')).status,200);
 const message=await lastMail(app.mailDir,'first_google@example.test');assert.equal((await b.post('/auth/verify-email',{token:tokenFrom(message.text)})).status,204);
 assert.equal((await b.post('/auth/google/register',{username:'google_first_again',password:PASSWORD})).status,400);
 assert.equal((await sql.query('SELECT count(*)::int n FROM "GoogleIdentity" WHERE sub=$1',['first-member'])).rows[0].n,1);
 assert.equal(b.cookies.has(googleCookieName(false)),false);
});
test('linked sub reconnects same account despite changed Google email; old session revoked on logout',async()=>{
 const b=new Browser(app.api);const u=await start(b,'/espace/projets');const destination=await callback(b,provider.callback(u,{sub:'first-member',email:'changed_google@example.test'}));assert.equal(destination.searchParams.get('success'),'1');assert.equal(destination.searchParams.get('retour'),'/espace/projets');
 const me=await b.get('/auth/me');assert.equal(me.body.username,'google_first');assert.equal(me.body.email,'first_google@example.test');
 const stale=new Browser(app.api);for(const [key,value] of b.cookies)stale.cookies.set(key,value);
 assert.equal((await b.post('/auth/logout')).status,204);assert.equal((await stale.get('/auth/me')).status,401);assert.equal((await b.get('/users/me')).status,401);
 const password=new Browser(app.api);assert.equal((await password.post('/auth/login',{email:'first_google@example.test',password:PASSWORD})).status,200);
});
test('same email never auto-links; existing account login plus explicit password-protected link',async()=>{
 const b=new Browser(app.api);await pending(b,'existing-member',member.email);assert.equal((await b.get('/auth/google/pending')).body.kind,'link');assert.equal((await b.get('/auth/me')).status,401);
 assert.equal((await b.post('/auth/google/link',{password:PASSWORD})).status,401);
 assert.equal((await b.post('/auth/login',{email:member.email,password:PASSWORD})).status,200);
 assert.equal((await b.post('/auth/google/link',{password:'wrong-password'})).status,401);
 assert.equal((await sql.query('SELECT count(*)::int n FROM "GoogleIdentity" WHERE "userId"=$1',[member.id])).rows[0].n,0);
 const old=new Browser(app.api);for(const [key,value] of b.cookies)old.cookies.set(key,value);
 const linked=await b.post('/auth/google/link',{password:PASSWORD});assert.equal(linked.status,200);assert.equal(linked.body.user.id,member.id);assert.equal((await old.get('/auth/me')).status,401);
 assert.equal((await b.post('/auth/google/link',{password:PASSWORD})).status,400);
});
test('suspended account blocked by Google sub and password, all sessions remain invalid',async()=>{
 await sql.query('UPDATE "User" SET status=\'SUSPENDED\' WHERE id=$1',[member.id]);
 const b=new Browser(app.api),u=await start(b);const out=await callback(b,provider.callback(u,{sub:'existing-member',email:member.email}));assert.equal(out.searchParams.get('error'),'suspended');assert.equal((await b.get('/auth/me')).status,401);assert.equal((await b.post('/auth/login',{email:member.email,password:PASSWORD})).status,403);
 await sql.query('UPDATE "User" SET status=\'ACTIVE\' WHERE id=$1',[member.id]);
});
test('consent refusal consumes callback, URL is clean and never exposes provider code/state/email',async()=>{
 const b=new Browser(app.api),u=await start(b),denied=provider.cancel(u);const out=await callback(b,denied);assert.equal(out.search,'?error=cancelled');assert.equal((await callback(b,denied)).search,'?error=expired');
});
test('wrong browser/state, expired flow and replay cannot open a session',async()=>{
 const b=new Browser(app.api),u=await start(b),cb=provider.callback(u,{sub:'bad-flow',email:'bad@example.test'});
 assert.equal((await callback(new Browser(app.api),cb)).search,'?error=expired');
 const changed=new URL(cb);changed.searchParams.set('state','x'.repeat(43));assert.equal((await callback(b,changed.href)).search,'?error=expired');
 const c=new Browser(app.api),auth=await start(c),valid=provider.callback(auth,{sub:'replay-safe',email:'safe@example.test'});
 assert.equal((await callback(c,valid)).search,'');assert.equal((await callback(c,valid)).search,'?error=expired');assert.equal((await c.get('/auth/me')).status,401);
 const d=new Browser(app.api),expired=await start(d);await sql.query('UPDATE "GoogleFlow" SET "expiresAt"=now()-interval \'1 second\'');assert.equal((await callback(d,provider.callback(expired))).search,'?error=expired');
});
for(const [name,claim] of [['nonce',{nonce:'wrong'}],['issuer',{iss:'https://attacker.invalid'}],['audience',{aud:'other-client'}],['expiration',{exp:1}],['unverified email',{email_verified:false}],['signature',{recipe_invalid_signature:true}],['malformed email',{email:'invalid'}]] as const){
 test('invalid '+name+' rejected by signed OIDC exchange',async()=>{const b=new Browser(app.api),u=await start(b);const out=await callback(b,provider.callback(u,{sub:'invalid-'+name,email:'invalid@example.test',...claim}));assert.equal(out.search,'?error=failed');assert.equal((await b.get('/auth/me')).status,401);});
}
test('callback concurrency consumes once and pending cancellation/logout erases the browser capability',async()=>{
 const b=new Browser(app.api),u=await start(b),url=new URL(provider.callback(u,{sub:'concurrent',email:'concurrent@example.test'})),token=b.cookies.get(googleCookieName(false))!;
 const service=app.app.get(GoogleService),before=provider.exchanges;const results=await Promise.allSettled([service.callback(token,url,undefined),service.callback(token,url,undefined)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(provider.exchanges-before,1);
 const c=new Browser(app.api);await pending(c,'cancel-new','cancel@example.test');assert.equal((await c.delete('/auth/google/pending')).status,204);assert.equal((await c.get('/auth/google/pending')).status,400);
 await pending(c,'logout-new','logout@example.test');assert.equal((await c.post('/auth/logout')).status,204);assert.equal((await c.get('/auth/google/pending')).status,400);
});
test('link requires matching verified account and CSRF; competing registrations create only one account',async()=>{
 const fresh=await registerMember(app.api,'google_unverified');const b=new Browser(app.api);await pending(b,'unverified-link',fresh.email);
 assert.equal((await b.post('/auth/login',{email:fresh.email,password:PASSWORD})).status,200);
 assert.equal((await b.post('/auth/google/link',{password:PASSWORD})).status,403);
 assert.equal((await b.request('POST','/auth/google/link',{password:PASSWORD})).status,403);
 assert.equal((await b.post('/auth/login',{email:'first_google@example.test',password:PASSWORD})).status,200);
 assert.equal((await b.post('/auth/google/link',{password:PASSWORD})).status,403);
 assert.equal((await sql.query('SELECT count(*)::int n FROM "GoogleIdentity" WHERE sub=$1',['unverified-link'])).rows[0].n,0);
 const c=new Browser(app.api);await pending(c,'registration-race','registration_race@example.test');
 const results=await Promise.all([c.post('/auth/google/register',{username:'google_race_a',password:PASSWORD}),c.post('/auth/google/register',{username:'google_race_b',password:PASSWORD})]);
 assert.equal(results.filter(r=>r.status===200).length,1);
 assert.equal((await sql.query('SELECT count(*)::int n FROM "User" WHERE email=$1',['registration_race@example.test'])).rows[0].n,1);
 assert.equal((await sql.query('SELECT count(*)::int n FROM "GoogleIdentity" WHERE sub=$1',['registration-race'])).rows[0].n,1);
 const first=new Browser(app.api),second=new Browser(app.api);await pending(first,'changed-email-race','changed_a@example.test');await pending(second,'changed-email-race','changed_b@example.test');
 assert.equal((await first.post('/auth/google/register',{username:'google_changed_a',password:PASSWORD})).status,200);
 const conflict=await second.post('/auth/google/register',{username:'google_changed_b',password:PASSWORD});assert.equal(conflict.status,409);assert.equal(conflict.body.code,'GOOGLE_ALREADY_LINKED');
 assert.equal((await sql.query('SELECT count(*)::int n FROM "User" WHERE email=$1',['changed_b@example.test'])).rows[0].n,0);
});
test('disabled config hides provider; enabled but incomplete or imprecise callback is rejected',async()=>{
 const base={...process.env,GOOGLE_AUTH_ENABLED:'0',GOOGLE_CLIENT_ID:'',GOOGLE_CLIENT_SECRET:''};assert.equal(validateEnvironment(base).google,undefined);
 assert.throws(()=>validateEnvironment({...base,GOOGLE_AUTH_ENABLED:'1'}));
 assert.throws(()=>validateEnvironment({...process.env,GOOGLE_REDIRECT_URI:'https://attacker.invalid/callback'}));
 const original=process.env.GOOGLE_AUTH_ENABLED;process.env.GOOGLE_AUTH_ENABLED='0';const disabled=await startApp(db.url);
 try{
  const browser=new Browser(disabled.api);assert.equal((await browser.get('/auth/google/status')).body.enabled,false);
  assert.equal((await browser.post('/auth/google/start',{})).status,404);
  assert.equal((await browser.post('/auth/login',{email:member.email,password:PASSWORD})).status,200);
 }finally{await disabled.close();process.env.GOOGLE_AUTH_ENABLED=original;}
});
