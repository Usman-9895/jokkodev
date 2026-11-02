import test from 'node:test';
import assert from 'node:assert/strict';
import {AccountClient,apiFailure} from '../frontend/src/lib/accounts/session.ts';
import {profileDraft,profilePayload,validateProfile,countryLabel} from '../frontend/src/lib/accounts/profile.ts';
import {createHttpClient} from '../packages/api-client/src/http.ts';
const user={id:'owner',username:'owner_test',email:'owner@example.test',role:'MEMBER',emailVerified:false};
const response=(value,status=200)=>Response.json(value,{status});
test('empty accepted email response succeeds; malformed accepted JSON remains a protocol error',async()=>{
 assert.equal(await createHttpClient('/api',async()=>new Response(null,{status:202}))('/auth/forgot-password'),undefined);
 await assert.rejects(createHttpClient('/api',async()=>new Response('invalid',{status:202}))('/test'),e=>e.kind==='protocol');
});
test('CSRF initial acquisition is deduplicated, login replaces the token, logout invalidates and reacquires',async()=>{
 let calls=[],version=0;const client=new AccountClient('/api',async(url,init)=>{const path=url.slice(4);calls.push({path,token:init.headers.get('X-CSRF-Token')});if(path==='/auth/csrf')return response({csrfToken:'csrf-'+(++version)});if(path==='/auth/login')return response({user,csrfToken:'authenticated'});if(path==='/auth/logout')return new Response(null,{status:204});return new Response(null,{status:202});});
 assert.deepEqual(await Promise.all([client.csrf(),client.csrf()]),['csrf-1','csrf-1']);
 await client.authenticate('login',{email:user.email,password:'fake fixture password'});assert.equal(client.snapshot().phase,'authenticated');assert.equal(client.serverSnapshot().phase,'loading');assert.equal(client.serverSnapshot().user,null);
 await client.mutate('/auth/resend-verification');assert.equal(calls.at(-1).token,'authenticated');
 await client.logout();assert.equal(client.snapshot().user,null);assert.equal(client.snapshot().phase,'guest');assert.equal(calls.at(-2).token,'authenticated');assert.equal(calls.at(-1).path,'/auth/csrf');
});
test('CSRF error renews only the token; no mutation is replayed',async()=>{
 let mutations=0,tokens=0;const client=new AccountClient('/api',async url=>url.endsWith('/csrf')?response({csrfToken:String(++tokens)}):(mutations++,response({code:'CSRF_TOKEN_INVALID'},403)));
 await assert.rejects(client.mutate('/auth/login',{}));assert.equal(mutations,1);assert.equal(tokens,2);
});
test('private responses in flight are discarded after logout and session401 removes the identity',async()=>{
 let release;let me=true;const client=new AccountClient('/api',async url=>{if(url.endsWith('/auth/me'))return me?response(user):response({code:'UNAUTHORIZED'},401);if(url.endsWith('/auth/csrf'))return response({csrfToken:'token'});if(url.endsWith('/users/me'))return new Promise(r=>release=r);return new Response(null,{status:204});});
 await client.refresh();const reading=client.read('/users/me',undefined,true);await client.logout();release(response({id:'owner',email:'private@example.test'}));await assert.rejects(reading,e=>e.kind==='aborted');
 me=false;await client.refresh();assert.equal(client.snapshot().user,null);
});
test('an old session lookup cannot overwrite a new login identity',async()=>{
 let release;const client=new AccountClient('/api',async url=>url.endsWith('/auth/me')?new Promise(r=>release=r):url.endsWith('/csrf')?response({csrfToken:'initial'}):response({user,csrfToken:'fresh'}));const old=client.refresh();await client.authenticate('login',{email:user.email,password:'fake fixture password'});release(response({code:'UNAUTHORIZED'},401));await old;assert.equal(client.snapshot().user.username,user.username);
});
test('backend outage hides identity; 429 retains only the real server delay and field errors',async()=>{
 const client=new AccountClient('/api',async()=>{throw Error('network')});await client.refresh();assert.equal(client.snapshot().phase,'unavailable');assert.equal(client.snapshot().user,null);
 const error=await createHttpClient('/api',async()=>response({code:'RATE_LIMITED',fieldErrors:{email:['invalid']},requestId:'fixture'},429))('/test').catch(e=>e);const result=apiFailure(error);assert.equal(result.retryAfterSeconds,undefined);assert.equal(result.fields.email,'invalid');
});
test('profile mapping uses ISO, technology ids and explicit null clears without leaking account fields',()=>{
 const profile={...user,links:['https://example.test'],skills:[{id:'skill',name:'React',slug:'react'}],bio:'Bio',countryCode:'SN',memberSince:'2026-10-18',stats:{questions:0,answers:0,projects:0}};
 const draft=profileDraft(profile);assert.equal(draft.countryCode,'SN');assert.deepEqual(draft.skillIds,['skill']);const payload=profilePayload({...draft,bio:'',countryCode:'',links:[],skillIds:[]});assert.equal(payload.bio,null);assert.equal(payload.countryCode,null);assert.equal('email' in payload,false);assert.equal('role' in payload,false);assert.deepEqual(validateProfile(draft),{});assert.equal(countryLabel('SN'),'Sénégal');
 assert.ok(validateProfile({...draft,username:'a',bio:'x'.repeat(501),links:['javascript:alert(1)']}).username);assert.ok(validateProfile({...draft,links:['https://user:pass@example.test']})['link-0']);
});

test('credential limits count Unicode characters without truncating or imposing composition',async()=>{
 const {validateCredentials}=await import('../frontend/src/lib/accounts/validation.ts');
 const password='🔐'.repeat(128),draft={username:'valid_name',email:'test@example.test',password,confirmation:password};
 assert.deepEqual(validateCredentials('register',draft,true),{});
 assert.ok(validateCredentials('reset',{...draft,password:'🔐'.repeat(129)},true).password);
 assert.deepEqual(validateCredentials('login',{...draft,password:'x'},true),{});
 assert.ok(validateCredentials('register',{...draft,password:'short',confirmation:'short'},true).password);
 assert.deepEqual(validateCredentials('register',{...draft,password:' '.repeat(12),confirmation:' '.repeat(12)},true),{});
});

test('session checks share one in-flight request; later checks remain fresh after success and outage',async()=>{
 let calls=0,resolve;const client=new AccountClient('/api',async()=>{calls++;return new Promise(r=>{resolve=r;});});
 const first=client.refresh(),second=client.refresh();assert.equal(first,second);assert.equal(calls,1);
 resolve(response(user));await first;assert.equal(client.snapshot().phase,'authenticated');
 const next=client.refresh();assert.equal(calls,2);resolve(response({code:'TEMPORARY'},503));await next;
 assert.equal(client.snapshot().phase,'unavailable');assert.equal(client.snapshot().user,null);
 const retry=client.refresh();assert.equal(calls,3);resolve(response({code:'UNAUTHORIZED'},401));await retry;
 assert.equal(client.snapshot().phase,'guest');
});
