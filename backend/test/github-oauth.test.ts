import assert from 'node:assert/strict';
import {test} from 'node:test';
import {GitHubOAuth} from '../src/modules/auth/github.oauth';
import {validateEnvironment} from '../src/config/environment';
class RequestFixture extends GitHubOAuth {read(path:string,token:string){return this.api(path,token);}}
test('GitHub API transport fixes origin, authenticates headers only, forbids redirect and bounds response',async()=>{
 const fixture=new RequestFixture(validateEnvironment({NODE_ENV:'test',DATABASE_URL:'postgresql://local:fixture@127.0.0.1:1/fixture'}));
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async(input,init)=>{
   assert.equal(String(input),'https://api.github.com/user');assert.equal(init?.redirect,'error');assert.ok(init?.signal);
   const headers=new Headers(init?.headers);assert.equal(headers.get('authorization'),'Bearer local-test-token');assert.equal(String(input).includes('local-test-token'),false);
   return new Response(JSON.stringify({id:123}),{status:200});
  };
  assert.deepEqual(await fixture.read('/user','local-test-token'),{id:123});
  globalThis.fetch=async()=>new Response('x'.repeat(65537),{status:200});
  await assert.rejects(fixture.read('/user','local-test-token'),/too large/);
  globalThis.fetch=async()=>new Response('{}',{status:401});
  await assert.rejects(fixture.read('/user','local-test-token'),/unavailable/);
 }finally{globalThis.fetch=original;}
});
