import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import type {Client} from 'pg';
import {createTestDatabase,sqlClient,type TestDatabase} from './support/database';
import {startApp,lastMail,tokenFrom,type TestApp} from './support/app';
import {Browser} from './support/browser';
import {registerMember,PASSWORD,type Member} from './support/fixtures';
import {SimulatedGitHub,type GitHubFixture} from './support/github-provider';
import {GitHubOAuth} from '../src/modules/auth/github.oauth';
import {GitHubService,githubCookieName} from '../src/modules/auth/github.service';
import {validateEnvironment} from '../src/config/environment';
let db:TestDatabase,sql:Client,app:TestApp,provider:SimulatedGitHub,member:Member;
before(async()=>{
 Object.assign(process.env,{GITHUB_AUTH_ENABLED:'1',GITHUB_CLIENT_ID:'local-github',GITHUB_CLIENT_SECRET:'fixture-only',GITHUB_REDIRECT_URI:'http://localhost:3000/api/v1/auth/github/callback'});
 db=await createTestDatabase();sql=await sqlClient(db);provider=await new SimulatedGitHub().start();app=await startApp(db.url);
 const protocol=app.app.get(GitHubOAuth);Object.defineProperty(protocol,'configuration',{value:()=>provider.configuration()});Object.defineProperty(protocol,'api',{value:(path:string,token:string)=>provider.api(path,token)});
 member=await registerMember(app.api,'github_existing');await sql.query('UPDATE "User" SET "emailVerifiedAt"=now() WHERE id=$1',[member.id]);
 await sql.query('INSERT INTO "GoogleIdentity" (id,sub,"userId") VALUES (gen_random_uuid(),\'google-linked-before-github\',$1)',[member.id]);
});
after(async()=>{await app?.close();await provider?.close();await sql?.end();await db?.drop();});
async function start(browser:Browser,returnTo='/espace') {const r=await browser.post('/auth/github/start',{returnTo});assert.equal(r.status,200);return new URL(r.body.authorizationUrl);}
async function callback(browser:Browser,url:string){
 const u=new URL(url),response=await fetch(app.api+'/auth/github/callback'+u.search,{redirect:'manual',headers:{Cookie:[...browser.cookies].map(([key,value])=>key+'='+encodeURIComponent(value)).join('; '),'X-Forwarded-For':browser.ip}});
 for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0],at=pair.indexOf('='),name=pair.slice(0,at),value=decodeURIComponent(pair.slice(at+1));if(value)browser.cookies.set(name,value);else browser.cookies.delete(name);}
 browser.csrfToken=undefined;assert.equal(response.status,303);assert.equal(response.headers.get('Referrer-Policy'),'no-referrer');assert.equal(response.headers.get('Cache-Control'),'no-store');return new URL(response.headers.get('location')!);
}
async function pending(b:Browser,fixture:GitHubFixture){const url=await start(b),out=await callback(b,provider.callback(url,fixture));assert.equal(out.pathname,'/connexion/github');assert.equal(out.search,'');}
test('independent configuration, secure cookie, minimal permission, state and PKCE',async()=>{
 assert.equal(validateEnvironment({NODE_ENV:'test',DATABASE_URL:db.url}).github,undefined);
 assert.throws(()=>validateEnvironment({NODE_ENV:'test',GITHUB_AUTH_ENABLED:'1'}),/GITHUB_CLIENT_ID/);
 assert.throws(()=>validateEnvironment({NODE_ENV:'test',GITHUB_AUTH_ENABLED:'1',GITHUB_CLIENT_ID:'local-client',GITHUB_CLIENT_SECRET:'fixture',GITHUB_REDIRECT_URI:'https://other.invalid/callback'}),/GITHUB_REDIRECT_URI/);
 assert.ok(githubCookieName(true).startsWith('__Host-'));
 const b=new Browser(app.api);assert.equal((await b.get('/auth/github/status')).body.enabled,true);assert.equal((await b.get('/auth/google/status')).body.enabled,false);
 assert.equal((await b.request('POST','/auth/github/start',{})).status,403);
 const u=await start(b,'https://attacker.invalid');assert.equal(u.searchParams.get('scope'),'user:email');assert.equal(u.searchParams.get('code_challenge_method'),'S256');assert.ok(u.searchParams.get('state'));assert.equal(u.searchParams.get('redirect_uri'),process.env.GITHUB_REDIRECT_URI);assert.equal(u.searchParams.has('client_secret'),false);
});
test('new member chooses pseudo/password; normal verification and opaque session',async()=>{
 const b=new Browser(app.api);await pending(b,{id:100,email:'first_github@example.test'});assert.equal((await b.get('/auth/me')).status,401);
 assert.equal((await b.get('/auth/github/pending')).body.kind,'register');
 assert.equal((await b.post('/auth/github/register',{username:'x',password:PASSWORD})).status,400);
 const r=await b.post('/auth/github/register',{username:'github_first',password:PASSWORD});assert.equal(r.status,200);assert.equal(r.body.user.role,'MEMBER');assert.equal(r.body.user.emailVerified,false);assert.equal((await b.get('/auth/me')).status,200);
 const mail=await lastMail(app.mailDir,'first_github@example.test');assert.equal((await b.post('/auth/verify-email',{token:tokenFrom(mail.text)})).status,204);
 assert.equal((await sql.query('SELECT count(*)::int n FROM "GitHubIdentity" WHERE sub=\'100\'')).rows[0].n,1);
 assert.equal((await b.post('/auth/github/register',{username:'second',password:PASSWORD})).status,400);
});
test('stable GitHub id reconnects original member despite changed login/email; password still works',async()=>{
 const b=new Browser(app.api),u=await start(b,'/espace/projets');const out=await callback(b,provider.callback(u,{id:100,email:'changed_github@example.test'}));assert.equal(out.searchParams.get('success'),'1');assert.equal(out.searchParams.get('retour'),'/espace/projets');
 assert.equal((await b.get('/auth/me')).body.email,'first_github@example.test');
 const old=new Browser(app.api);for(const [k,v] of b.cookies)old.cookies.set(k,v);
 assert.equal((await b.post('/auth/logout')).status,204);assert.equal((await old.get('/auth/me')).status,401);
 assert.equal((await new Browser(app.api).post('/auth/login',{email:'first_github@example.test',password:PASSWORD})).status,200);
});
test('matching email requires login and explicit reauthentication; linking rotates session',async()=>{
 const b=new Browser(app.api);await pending(b,{id:101,email:member.email});assert.equal((await b.get('/auth/github/pending')).body.kind,'link');assert.equal((await b.get('/auth/me')).status,401);
 assert.equal((await b.post('/auth/github/link',{password:PASSWORD})).status,401);
 assert.equal((await b.post('/auth/login',{email:member.email,password:PASSWORD})).status,200);
 assert.equal((await b.post('/auth/github/link',{password:'incorrect'})).status,401);
 assert.equal((await sql.query('SELECT count(*)::int n FROM "GitHubIdentity" WHERE "userId"=$1',[member.id])).rows[0].n,0);
 const stale=new Browser(app.api);for(const [k,v] of b.cookies)stale.cookies.set(k,v);
 const r=await b.post('/auth/github/link',{password:PASSWORD});assert.equal(r.status,200);assert.equal(r.body.user.id,member.id);assert.equal((await stale.get('/auth/me')).status,401);
 assert.equal((await b.post('/auth/github/link',{password:PASSWORD})).status,400);
 assert.equal((await sql.query('SELECT sub FROM "GoogleIdentity" WHERE "userId"=$1',[member.id])).rows[0].sub,'google-linked-before-github');
});
test('suspended member blocked by GitHub and password; session not revived',async()=>{
 await sql.query('UPDATE "User" SET status=\'SUSPENDED\' WHERE id=$1',[member.id]);const b=new Browser(app.api),u=await start(b);
 assert.equal((await callback(b,provider.callback(u,{id:101,email:member.email}))).search,'?error=suspended');assert.equal((await b.get('/auth/me')).status,401);assert.equal((await b.post('/auth/login',{email:member.email,password:PASSWORD})).status,403);
 await sql.query('UPDATE "User" SET status=\'ACTIVE\' WHERE id=$1',[member.id]);
});
test('missing verified email is clear and consumes flow without account creation',async()=>{
 const b=new Browser(app.api),u=await start(b);const url=provider.callback(u,{id:102,email:'unverified_github@example.test',verified:false});
 const out=await callback(b,url);assert.equal(out.search,'?error=no-email');assert.equal((await b.get('/auth/me')).status,401);assert.equal((await callback(b,url)).search,'?error=expired');assert.equal((await sql.query('SELECT count(*)::int n FROM "GitHubIdentity" WHERE sub=\'102\'')).rows[0].n,0);
});
test('verified fallback email used when public/primary email absent or unverified',async()=>{
 const b=new Browser(app.api);await pending(b,{id:103,emails:[{email:'bad@example.test',verified:false,primary:true},{email:'valid_github@example.test',verified:true,primary:false}]});assert.equal((await b.get('/auth/github/pending')).body.email,'valid_github@example.test');
});
test('repo or broad user permission is refused before identity use',async()=>{
 for(const scope of ['repo,user:email','user','']){const b=new Browser(app.api),u=await start(b);assert.equal((await callback(b,provider.callback(u,{id:104,scope}))).search,'?error=failed');assert.equal((await b.get('/auth/me')).status,401);}
});
test('denied consent, incorrect browser/state and replay never create session',async()=>{
 const b=new Browser(app.api),u=await start(b);const denied=provider.cancel(u);assert.equal((await callback(b,denied)).search,'?error=cancelled');assert.equal((await callback(b,denied)).search,'?error=expired');
 const c=new Browser(app.api),auth=await start(c),url=provider.callback(auth,{id:105});assert.equal((await callback(new Browser(app.api),url)).search,'?error=expired');
 const changed=new URL(url);changed.searchParams.set('state','x'.repeat(43));assert.equal((await callback(c,changed.href)).search,'?error=expired');
 assert.equal((await callback(c,url)).search,'?error=expired');
 const d=new Browser(app.api),fresh=await start(d),valid=provider.callback(fresh,{id:109});assert.equal((await callback(d,valid)).search,'');assert.equal((await callback(d,valid)).search,'?error=expired');
});
test('concurrent callback consumes once; Google and GitHub capabilities remain separate',async()=>{
 const b=new Browser(app.api),u=await start(b),url=new URL(provider.callback(u,{id:106})),token=b.cookies.get(githubCookieName(false))!;
 const before=provider.exchanges,service=app.app.get(GitHubService);const results=await Promise.allSettled([service.callback(token,url,undefined),service.callback(token,url,undefined)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(provider.exchanges-before,1);
 const c=new Browser(app.api);await pending(c,{id:107});assert.equal((await c.get('/auth/google/pending')).status,404);assert.equal((await c.post('/auth/logout')).status,204);assert.equal((await c.get('/auth/github/pending')).status,400);
});
test('linking requires matching verified account and CSRF, never just email',async()=>{
 const unverified=await registerMember(app.api,'github_unverified'),b=new Browser(app.api);await pending(b,{id:108,email:unverified.email});
 await b.post('/auth/login',{email:unverified.email,password:PASSWORD});assert.equal((await b.post('/auth/github/link',{password:PASSWORD})).status,403);assert.equal((await b.request('POST','/auth/github/link',{password:PASSWORD})).status,403);
 await b.post('/auth/login',{email:member.email,password:PASSWORD});assert.equal((await b.post('/auth/github/link',{password:PASSWORD})).status,403);
});
