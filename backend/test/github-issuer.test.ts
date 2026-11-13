import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as oauth from 'openid-client';
import {GitHubOAuth} from '../src/modules/auth/github.oauth';
import {validateEnvironment} from '../src/config/environment';

const issuer='https://github.com/login/oauth';
const checks={state:'s'.repeat(43),nonce:'n'.repeat(43),verifier:'v'.repeat(43)};
const env=validateEnvironment({NODE_ENV:'test',DATABASE_URL:'postgresql://fixture:fixture@127.0.0.1:1/fixture',GITHUB_AUTH_ENABLED:'1',GITHUB_CLIENT_ID:'local-fixture',GITHUB_CLIENT_SECRET:'fixture-only',GITHUB_REDIRECT_URI:'http://localhost:3000/api/v1/auth/github/callback'});

class IssuerFixture extends GitHubOAuth {
 exchanges=0;apiCalls=0;
 constructor(){super(env);}
 metadata(){return this.configuration().serverMetadata();}
 protected configuration(){
  const config=super.configuration();
  config[oauth.customFetch]=async(url,options)=>{
   this.exchanges++;
   assert.equal(String(url),'https://github.com/login/oauth/access_token');
   const form=new URLSearchParams(options.body as URLSearchParams);
   assert.equal(form.get('code_verifier'),checks.verifier);
   assert.equal(form.get('redirect_uri'),env.github!.redirectUri);
   return new Response(JSON.stringify({access_token:'local-fixture-token',token_type:'bearer',scope:'user:email'}),{headers:{'Content-Type':'application/json'}});
  };
  return config;
 }
 protected async api(path:string,token:string):Promise<unknown>{
  this.apiCalls++;assert.equal(token,'local-fixture-token');
  return path==='/user'?{id:12345}:[{email:'member@example.test',verified:true,primary:true}];
 }
}
function callback(issuers:string[],state=checks.state){
 const url=new URL(env.github!.redirectUri);url.searchParams.set('code','local-fixture-code');url.searchParams.set('state',state);
 for(const value of issuers)url.searchParams.append('iss',value);
 return url;
}

test('GitHub configuration pins the documented issuer and HTTPS endpoints',()=>{
 const metadata=new IssuerFixture().metadata();
 assert.equal(metadata.issuer,issuer);
 assert.equal(metadata.authorization_endpoint,'https://github.com/login/oauth/authorize');
 assert.equal(metadata.token_endpoint,'https://github.com/login/oauth/access_token');
});
test('GitHub callback with the documented issuer reaches the token exchange and verified identity',async()=>{
 const fixture=new IssuerFixture();
 assert.deepEqual(await fixture.identity(callback([issuer]),checks),{sub:'12345',email:'member@example.test'});
 assert.equal(fixture.exchanges,1);assert.equal(fixture.apiCalls,2);
});
test('GitHub callback without optional issuer retains the existing state and PKCE flow',async()=>{
 const fixture=new IssuerFixture();
 assert.deepEqual(await fixture.identity(callback([]),checks),{sub:'12345',email:'member@example.test'});
 assert.equal(fixture.exchanges,1);
});
for(const values of [['https://github.com'],['https://untrusted.example.test'],[issuer,issuer]]){
 test('GitHub refuses mismatched or repeated issuer before token exchange: '+values.join(','),async()=>{
  const fixture=new IssuerFixture();
  await assert.rejects(fixture.identity(callback(values),checks));
  assert.equal(fixture.exchanges,0);assert.equal(fixture.apiCalls,0);
 });
}
test('GitHub issuer validation does not bypass the state check',async()=>{
 const fixture=new IssuerFixture();
 await assert.rejects(fixture.identity(callback([issuer],'wrong-fixture-state'),checks));
 assert.equal(fixture.exchanges,0);assert.equal(fixture.apiCalls,0);
});
