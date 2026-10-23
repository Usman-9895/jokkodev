import './safe-failure.mjs';
// Seven invalid logins only; a random nonexistent audit identity, never an account attack.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const env=JSON.parse(fs.readFileSync('.cache/verification/env.json'));
assert.equal(env.APP_ORIGIN,'http://127.0.0.1:33300');
assert.equal(new URL(env.DATABASE_URL).pathname,'/jokkodev_security21');
const base=env.APP_ORIGIN+'/api/v1',cookies=new Map();
function remember(response){for(const c of response.headers.getSetCookie()){const pair=c.split(';')[0],i=pair.indexOf('=');cookies.set(pair.slice(0,i),pair.slice(i+1));}}
const initial=await fetch(base+'/auth/csrf');remember(initial);const {csrfToken}=await initial.json();
const email='audit-no-account-'+crypto.randomUUID()+'@example.test',password=crypto.randomBytes(24).toString('base64url');
const results=[];
for(let i=0;i<7;i++){
 const response=await fetch(base+'/auth/login',{method:'POST',headers:{Origin:env.APP_ORIGIN,'Content-Type':'application/json','X-CSRF-Token':csrfToken,Cookie:[...cookies].map(([k,v])=>k+'='+v).join('; '),'X-Forwarded-For':i===6?'10.20.98.2':'10.20.98.1'},body:JSON.stringify({email,password}),signal:AbortSignal.timeout(10000)});
 const body=await response.json();results.push({request:i+1,forwardedIdentity:i===6?'changed':'same',status:response.status,code:body.code,retryAfterPresent:response.headers.has('Retry-After')});
}
const reproduced=results.slice(0,5).every(r=>r.status===401)&&results[5].status===429&&results[6].status===401;
fs.writeFileSync('docs/security/lot21/before-proof.json',JSON.stringify({commit:'d300b0ba17fbf8d0665c26f6cad52c17ac0011a2',time:new Date().toISOString(),topology:'Next rewrite -> Nest trusting loopback; nginx template not running',boundedRequests:7,reproduced,results},null,2));
assert.equal(reproduced,true,'Expected local topology reproduction not observed; inspect evidence without assuming cause');
console.log('Confirmed: six invalid attempts reach 429; changing supplied forwarding header yields 401. Seven local requests total.');
