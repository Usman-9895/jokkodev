import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createPwaHandler} from '../frontend/server/pwa.mjs';
function reply(){return {status:0,headers:{},body:null,writeHead(status,headers){this.status=status;this.headers=headers},end(body){this.body=body}}}
test('development never serves a working worker; unsupported routes fall through',()=>{
 const handle=createPwaHandler({enabled:false,version:'dev'}),res=reply();assert.equal(handle({url:'/sw.js',method:'GET'},res),true);assert.equal(res.status,404);assert.equal(res.headers['Cache-Control'],'no-store');assert.equal(handle({url:'/api/v1/auth/me',method:'POST'},reply()),false);
});
test('production worker has build version, no-store and narrow worker CSP',()=>{
 const handle=createPwaHandler({enabled:true,version:'fixture-version'}),res=reply();handle({url:'/sw.js',method:'GET'},res);assert.equal(res.status,200);assert.ok(res.body.includes('const VERSION="fixture-version";'));assert.equal(res.headers['Cache-Control'],'no-store');assert.equal(res.headers['Service-Worker-Allowed'],'/');assert.ok(!res.headers['Content-Security-Policy'].includes('unsafe-inline'));
});
test('worker does not accept query parameters or mutations; HEAD has no body',()=>{
 const handle=createPwaHandler({enabled:true,version:'fixture'});for(const req of [{url:'/sw.js?token=fictional',method:'GET'},{url:'/sw.js',method:'POST'}]){const res=reply();handle(req,res);assert.equal(res.status,404)}const res=reply();handle({url:'/sw.js',method:'HEAD'},res);assert.equal(res.body,'');
});
test('explicit operational disable retires only this feature and leaves other caches intact',async()=>{
 const handle=createPwaHandler({enabled:true,version:'fixture',disabled:true}),res=reply();handle({url:'/sw.js',method:'GET'},res);assert.equal(res.status,200);
 const handlers={},removed=[];let skipped=false,unregistered=false;
 vm.runInNewContext(res.body,{self:{addEventListener:(k,f)=>{handlers[k]=f},skipWaiting:()=>{skipped=true},registration:{unregister:async()=>{unregistered=true}}},caches:{keys:async()=>['other-application','jokkodev-public-reading-v1-fixture','jokkodev-public-reading-v1-active'],delete:async key=>{removed.push(key)}}});
 handlers.install();let complete;handlers.activate({waitUntil:p=>{complete=p}});await complete;
 assert.equal(skipped,true);assert.equal(unregistered,true);assert.deepEqual(removed,['jokkodev-public-reading-v1-fixture','jokkodev-public-reading-v1-active']);assert.equal(handlers.fetch,undefined);
});
