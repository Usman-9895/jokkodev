import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as oauth from 'openid-client';
import {createTestDatabase,sqlClient} from './support/database';
import {startApp} from './support/app';
import {Browser} from './support/browser';
import {GitHubOAuth} from '../src/modules/auth/github.oauth';

test('real callback emits one sanitized diagnostic and consumes failed flow without account/session/mail',async()=>{
 Object.assign(process.env,{GITHUB_AUTH_ENABLED:'1',GITHUB_CLIENT_ID:'local-github',GITHUB_CLIENT_SECRET:'fixture-only',GITHUB_REDIRECT_URI:'http://localhost:3000/api/v1/auth/github/callback',GITHUB_AUTH_DIAGNOSTICS_ENABLED:'1',GOOGLE_AUTH_ENABLED:'0',NOTIFICATION_EVENTS_ENABLED:'0'});
 const db=await createTestDatabase(),sql=await sqlClient(db);let app:Awaited<ReturnType<typeof startApp>>|undefined;
 try{
  app=await startApp(db.url);const protocol=app.app.get(GitHubOAuth);
  Object.defineProperty(protocol,'configuration',{value:()=>{
   const config=new oauth.Configuration({issuer:'https://github.com',authorization_endpoint:'https://github.com/login/oauth/authorize',token_endpoint:'https://github.com/login/oauth/access_token'},'local-github',{client_secret:'fixture-only'},oauth.ClientSecretPost('fixture-only'));
   config[oauth.customFetch]=async()=>new Response(JSON.stringify({error:'bad_verification_code',error_description:'private-fixture-person@example.test-secret-code-token'}),{status:200,headers:{'Content-Type':'application/json'}});return config;
  }});
  const browser=new Browser(app.api),start=await browser.post('/auth/github/start',{});assert.equal(start.status,200);
  const authorization=new URL(start.body.authorizationUrl),state=authorization.searchParams.get('state')!;
  assert.equal((await sql.query('SELECT count(*)::int n FROM "GitHubFlow"')).rows[0].n,1);
  const original=console.warn,logs:string[]=[];console.warn=value=>logs.push(String(value));
  try{
   const response=await fetch(app.api+'/auth/github/callback?state='+encodeURIComponent(state)+'&code=private-fixture-code',{redirect:'manual',headers:{Cookie:[...browser.cookies].map(([key,value])=>key+'='+encodeURIComponent(value)).join('; '),'X-Forwarded-For':browser.ip}});
   assert.equal(response.status,303);assert.equal(response.headers.get('location'),'http://localhost:3000/connexion/github?error=failed');assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('referrer-policy'),'no-referrer');
  }finally{console.warn=original;}
  assert.deepEqual(logs.map(row=>JSON.parse(row)),[{event:'github_auth_failed',stage:'token_exchange',reason:'code_rejected'}]);
  assert.ok(!logs.join().includes('private-fixture'));assert.ok(!logs.join().includes(state));
  const counts=(await sql.query('SELECT (SELECT count(*)::int FROM "GitHubFlow") flows,(SELECT count(*)::int FROM "GitHubIdentity") identities,(SELECT count(*)::int FROM "User") users,(SELECT count(*)::int FROM "Session") sessions,(SELECT count(*)::int FROM "EmailNotification") mail')).rows[0];
  assert.deepEqual(counts,{flows:0,identities:0,users:0,sessions:0,mail:0});assert.equal((await browser.get('/auth/me')).status,401);
 }finally{await app?.close();await sql.end();await db.drop();}
});
