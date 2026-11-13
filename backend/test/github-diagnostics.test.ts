import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {Request,Response} from 'express';
import * as oauth from 'openid-client';
import {validateEnvironment} from '../src/config/environment';
import {ApiException} from '../src/common/http/api-exception';
import {GitHubOAuth} from '../src/modules/auth/github.oauth';
import {GitHubController} from '../src/modules/auth/github.controller';
import type {GitHubService} from '../src/modules/auth/github.service';
import type {Csrf} from '../src/modules/auth/csrf';
import {GitHubDiagnosticError,reportGitHubFailure} from '../src/modules/auth/github-diagnostics';

const privateValue='private-fixture-secret-code-token-person@example.test';
function environment(enabled=true){return validateEnvironment({NODE_ENV:'test',DATABASE_URL:'postgresql://fixture:fixture@127.0.0.1:1/fixture',GITHUB_AUTH_ENABLED:'1',GITHUB_CLIENT_ID:'local-fixture',GITHUB_CLIENT_SECRET:privateValue,GITHUB_REDIRECT_URI:'http://localhost:3000/api/v1/auth/github/callback',GITHUB_AUTH_DIAGNOSTICS_ENABLED:enabled?'1':'0'});}
const checks={state:'s'.repeat(43),nonce:'n'.repeat(43),verifier:'v'.repeat(43)};
const callback=new URL('http://localhost:3000/api/v1/auth/github/callback?state='+checks.state+'&code='+privateValue);
async function capture(action:()=>Promise<void>|void){
 const original=console.warn,rows:string[]=[];console.warn=value=>{assert.equal(typeof value,'string');rows.push(value);};
 try{await action();}finally{console.warn=original;}
 assert.ok(!rows.join().includes(privateValue));assert.ok(!rows.join().includes(checks.state));assert.ok(!rows.join().includes(checks.verifier));
 return rows.map(row=>JSON.parse(row) as Record<string,unknown>);
}
type Mode='success'|'token_rejected'|'token_http'|'token_json'|'network'|'missing_scope'|'extra_scope'|'identity_http'|'identity_invalid'|'emails_http'|'emails_invalid'|'no_email';
class Fixture extends GitHubOAuth {
 apiCalls=0;
 constructor(readonly mode:Mode,enabled=true){super(environment(enabled));}
 protected configuration(){
  const config=super.configuration();config[oauth.customFetch]=async()=>{
   if(this.mode==='network')throw Object.assign(new TypeError(privateValue),{cause:{code:'EAI_AGAIN',privateValue}});
   if(this.mode==='token_http')return new Response(privateValue,{status:502,headers:{'Content-Type':'text/plain'}});
   if(this.mode==='token_json')return new Response(privateValue,{status:200,headers:{'Content-Type':'application/json'}});
   if(this.mode==='token_rejected')return new Response(JSON.stringify({error:'bad_verification_code',error_description:privateValue}),{status:200,headers:{'Content-Type':'application/json'}});
   return new Response(JSON.stringify({access_token:privateValue,token_type:'bearer',scope:this.mode==='missing_scope'?'':this.mode==='extra_scope'?'repo,user:email':'user:email',expires_in:28800,refresh_token:privateValue}),{status:200,headers:{'Content-Type':'application/json'}});
  };return config;
 }
 protected async api(path:string):Promise<unknown>{
  this.apiCalls++;
  if(path==='/user'){
   if(this.mode==='identity_http')throw new GitHubDiagnosticError('http_error',401);
   return {id:this.mode==='identity_invalid'?privateValue:12345};
  }
  if(this.mode==='emails_http')throw new GitHubDiagnosticError('http_error',403);
  if(this.mode==='emails_invalid')return {privateValue};
  return this.mode==='no_email'?[]:[{email:'member@example.test',verified:true,primary:true}];
 }
}

test('GitHub diagnostics default OFF, independent from provider activation, invalid flag refused',()=>{
 const base={NODE_ENV:'test',DATABASE_URL:'postgresql://fixture:fixture@127.0.0.1:1/fixture'};
 assert.equal(validateEnvironment(base).githubDiagnosticsEnabled,false);
 const configured=validateEnvironment({...base,GITHUB_AUTH_DIAGNOSTICS_ENABLED:'1'});assert.equal(configured.githubDiagnosticsEnabled,true);assert.equal(configured.github,undefined);
 assert.throws(()=>validateEnvironment({...base,GITHUB_AUTH_DIAGNOSTICS_ENABLED:'true'}),/GITHUB_AUTH_DIAGNOSTICS_ENABLED/);
});
test('successful external identity emits no diagnostic record',async()=>{
 const rows=await capture(async()=>{assert.deepEqual(await new Fixture('success').identity(callback,checks),{sub:'12345',email:'member@example.test'});});assert.deepEqual(rows,[]);
});
const cases:[Mode,string,string,number?][]=[
 ['token_rejected','token_exchange','code_rejected'],['token_http','token_exchange','http_error',502],['token_json','token_exchange','token_response_invalid'],['network','token_exchange','network_error'],
 ['missing_scope','granted_scope','scope_missing'],['extra_scope','granted_scope','scope_unexpected'],['identity_http','identity_request','http_error',401],
 ['identity_invalid','identity_response','identity_invalid'],['emails_http','emails_request','http_error',403],['emails_invalid','emails_response','emails_invalid'],['no_email','verified_email','no_verified_email']
];
for(const [mode,stage,reason,status] of cases)test('GitHub failure category: '+mode,async()=>{
 const fixture=new Fixture(mode);const rows=await capture(async()=>{
  await assert.rejects(fixture.identity(callback,checks),error=>error instanceof ApiException&&error.getStatus()===(mode==='no_email'?400:503));
 });assert.deepEqual(rows,[{event:'github_auth_failed',stage,reason,...(status===undefined?{}:{status})}]);
 if(mode==='missing_scope'||mode==='extra_scope')assert.equal(fixture.apiCalls,0);
});
test('disabled diagnostics keep identical generic failure without logging',async()=>{
 assert.deepEqual(await capture(async()=>{await assert.rejects(new Fixture('token_rejected',false).identity(callback,checks),error=>error instanceof ApiException&&error.getStatus()===503);}),[]);
});
test('untrusted errors and provider fields never enter the record',async()=>{
 const error=Object.assign(new Error(privateValue),{code:privateValue,cause:{code:privateValue,token:privateValue},url:privateValue});
 Object.defineProperty(error,'message',{get(){throw new Error('message must not be read');}});
 Object.defineProperty(error,'stack',{get(){throw new Error('stack must not be read');}});
 assert.deepEqual(await capture(()=>reportGitHubFailure(true,privateValue as 'callback',error)),[{event:'github_auth_failed',stage:'callback',reason:'unexpected_failure'}]);
 const upstream=new oauth.ResponseBodyError(privateValue,{cause:{error:privateValue,error_description:privateValue},response:new Response('{}',{status:400})});
 assert.deepEqual(await capture(()=>reportGitHubFailure(true,'token_exchange',upstream)),[{event:'github_auth_failed',stage:'token_exchange',reason:'provider_rejected',status:400}]);
});
test('invalid or attacker-controlled status cannot be serialized',async()=>{
 assert.deepEqual(await capture(()=>reportGitHubFailure(true,'identity_request',new GitHubDiagnosticError('http_error',privateValue as unknown as number))),[{event:'github_auth_failed',stage:'identity_request',reason:'http_error'}]);
});
test('logger failure cannot replace the authentication failure',async()=>{
 const original=console.warn;console.warn=()=>{throw new Error(privateValue);};
 try{await assert.rejects(new Fixture('token_rejected').identity(callback,checks),error=>error instanceof ApiException&&error.getStatus()===503);}finally{console.warn=original;}
});
test('invalid JSON in real bounded API transport has only a fixed diagnostic category',async()=>{
 class ReadFixture extends GitHubOAuth{read(){return this.api('/user',privateValue);}}
 const original=globalThis.fetch;globalThis.fetch=async()=>new Response(privateValue,{status:200});
 try{await assert.rejects(new ReadFixture(environment()).read(),error=>error instanceof GitHubDiagnosticError&&error.reason==='invalid_json');}finally{globalThis.fetch=original;}
});
for(const [error,expected] of [[Object.assign(new Error(privateValue),{code:'P2010'}),'database_error'],[new Error(privateValue),'unexpected_failure'],[new ApiException(400,'GITHUB_FLOW_INVALID',privateValue),'flow_invalid']] as const)test('callback retains generic redirect and categorizes '+expected,async()=>{
 const service={callback:async()=>{throw error;}} as unknown as GitHubService;
 const controller=new GitHubController(service,environment(),{} as Csrf),headers=new Map<string,string>();let destination='';
 const response={setHeader:(key:string,value:string)=>headers.set(key,value),clearCookie:()=>{},redirect:(status:number,url:string)=>{assert.equal(status,303);destination=url;}} as unknown as Response;
 const rows=await capture(()=>controller.callback({originalUrl:callback.pathname+callback.search,cookies:{}} as Request,response));
 assert.deepEqual(rows,[{event:'github_auth_failed',stage:'callback',reason:expected}]);assert.equal(destination,'http://localhost:3000/connexion/github?error='+(expected==='flow_invalid'?'expired':'failed'));assert.equal(headers.get('Cache-Control'),'no-store');assert.equal(headers.get('Referrer-Policy'),'no-referrer');
});
