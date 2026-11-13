import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../frontend/public/pwa-worker.js',import.meta.url),'utf8');
const origin='http://localhost:3488';
function fixture({fail=false,privateResponse=false,version='test',stores=new Map(),responseBytes=0,headers={},onPut=async()=>{}}={}){
 const handlers={},network=[],deleted=[];let now=Date.now(),offline=false,skipped=0;
 const storage={async keys(){return [...stores.keys()]},async delete(k){deleted.push(k);return stores.delete(k)},async open(k){if(!stores.has(k))stores.set(k,new Map());const s=stores.get(k);return {async match(path){return s.get(path)?.clone()},async put(path,response){await onPut(path);s.set(path,response.clone())},async delete(path){return s.delete(path)}}}};
 class Clock extends Date{static now(){return now}}
 const context=vm.createContext({URL,Headers,Response,Date:Clock,Request:class extends Request{constructor(url,options){super(new URL(url,origin),options)}},caches:storage,fetch:async request=>{network.push(request);if(offline||fail)throw Error('Network failed');return new Response(responseBytes?'x'.repeat(responseBytes):'public guide',{headers:{'Content-Type':'text/plain','Cache-Control':privateResponse?'no-store':'public, max-age=0','X-Request-Id':'server-only',...headers}})},self:{location:new URL(origin),clients:{claim:async()=>{}},skipWaiting:async()=>{skipped++},addEventListener:(kind,fn)=>{handlers[kind]=fn}}});
 vm.runInContext(source.replaceAll('__JD_BUILD__',JSON.stringify(version)),context);
 async function event(kind,data={}){let promise;handlers[kind]({...data,waitUntil:p=>{promise=p}});if(promise)await promise}
 function request(path,extra={}){return {url:origin+path,method:'GET',mode:'navigate',cache:'default',headers:new Headers(),...extra}}
 async function get(req){let promise;handlers.fetch({request:req,respondWith:p=>{promise=p}});return promise?await promise:null}
 return {context,handlers,stores,network,deleted,event,request,get,setOffline:()=>{offline=true},advance:ms=>{now+=ms},skipped:()=>skipped};
}
test('precache is fixed, anonymous and bounded; no API/Next pages stored',async()=>{
 const f=fixture();await f.event('install');assert.equal(f.stores.size,1);const entries=[...f.stores.values()][0];assert.equal(entries.size,13);
 assert.ok([...entries.keys()].every(k=>!k.startsWith('/api')&&!k.startsWith('/_next')&&!k.includes('?')));
 assert.ok(f.network.every(r=>r.credentials==='omit'&&r.redirect==='error'));
 for(const response of entries.values())assert.equal(response.headers.get('X-Request-Id'),null);
 assert.equal(f.skipped(),0);
});
test('mutations, auth, private paths, tokens, no-store and RSC are never intercepted',async()=>{
 const f=fixture();await f.event('install');f.setOffline();
 for(const path of ['/api/v1/auth/me','/api/v1/users/me','/api/v1/question-images/00000000-0000-4000-8000-000000000001','/connexion','/espace','/admin','/profils/demo','/security/csp-report','/verification-email?token=secret','/ressources?token=secret','/_next/static/example.js'])assert.equal(await f.get(f.request(path)),null,path);
 for(const extra of [{method:'POST'},{cache:'no-store'},{headers:new Headers({RSC:'1'})},{headers:new Headers({Accept:'text/x-component'})},{headers:new Headers({Authorization:'Bearer fictional'})}])assert.equal(await f.get(f.request('/ressources',extra)),null);
});
test('resources fallback contains only authored document, not any live Next HTML',async()=>{
 const f=fixture();await f.event('install');f.setOffline();const res=await f.get(f.request('/ressources'));assert.equal(await res.text(),'public guide');assert.equal(res.headers.get('X-JokkoDev-Offline'),'1');assert.equal(res.headers.get('X-Request-Id'),null);
 const unknown=await f.get(f.request('/questions'));assert.equal(await unknown.text(),'public guide');
});
test('exact 24-hour expiry removes the requested entry and does not advertise expired guides',async()=>{
 const f=fixture();await f.event('install');f.advance(24*60*60*1000-1);f.setOffline();assert.equal((await f.get(f.request('/ressources'))).status,200);f.advance(1);const response=await f.get(f.request('/ressources'));assert.equal(response.status,503);assert.match(await response.text(),/expir/);
});
test('failed install and no-store responses discard partial owned cache',async()=>{
 for(const options of [{fail:true},{privateResponse:true}]){const f=fixture(options);await assert.rejects(f.event('install'));assert.equal(f.stores.size,0)}
});
test('activation cleans only old caches with the feature namespace',async()=>{
 const stores=new Map([['other-app',new Map()],['jokkodev-unrelated',new Map()],['jokkodev-public-reading-v1-old',new Map()]]);const f=fixture({stores});await f.event('install');await f.event('activate');assert.deepEqual(f.deleted,['jokkodev-public-reading-v1-old']);assert.ok(stores.has('other-app'));assert.ok(stores.has('jokkodev-unrelated'));
});
test('update does not skip waiting without an explicit same-origin message',async()=>{
 const f=fixture();await f.event('install');await f.event('message',{source:{url:'https://other.invalid/'},data:{type:'ACTIVATE_UPDATE'}});assert.equal(f.skipped(),0);await f.event('message',{source:{url:origin+'/'},data:{type:'ACTIVATE_UPDATE'}});assert.equal(f.skipped(),1);
});
test('expired snapshot may renew online without caching session responses',async()=>{
 const f=fixture();await f.event('install');const before=f.network.length;await f.event('message',{source:{url:origin+'/'},data:{type:'REFRESH_PUBLIC_READING'}});assert.equal(f.network.length,before);f.advance(24*60*60*1000);await f.event('message',{source:{url:origin+'/'},data:{type:'REFRESH_PUBLIC_READING'}});assert.equal(f.network.length,before*2);
});
test('oversized entries and total payloads are refused without a partial snapshot',async()=>{
 for(const responseBytes of [3*1024*1024+1,700000]){const f=fixture({responseBytes});await assert.rejects(f.event('install'));assert.equal(f.stores.size,0)}
});
test('private varying responses, cookies and RSC content cannot enter the cache',async()=>{
 for(const headers of [{Vary:'Cookie'},{'Set-Cookie':'fictional=value'},{'Content-Type':'text/x-component'},{Vary:'RSC'}]){const f=fixture({headers});await assert.rejects(f.event('install'));assert.equal(f.stores.size,0)}
});
test('a concurrent offline reader waits for renewal to commit all files',async()=>{
 let block=false,release,reached;
 const gate=new Promise(resolve=>{release=resolve}),writing=new Promise(resolve=>{reached=resolve});
 const f=fixture({onPut:async path=>{if(block&&path==='/pwa/offline.css'){reached();await gate}}});
 await f.event('install');f.advance(86400000);block=true;
 const renewal=f.event('message',{source:{url:origin+'/'},data:{type:'REFRESH_PUBLIC_READING'}});await writing;f.setOffline();
 let settled=false;const read=f.get(f.request('/ressources')).then(response=>{settled=true;return response});
 await new Promise(resolve=>setTimeout(resolve,10));assert.equal(settled,false,'No partial copy or premature unavailability during a validated renewal');release();await renewal;assert.equal((await read).status,200);
});
