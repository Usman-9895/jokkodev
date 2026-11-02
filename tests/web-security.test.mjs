import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createCspReporter} from '../frontend/server/csp-report.mjs';
import {observeWebRequest,isRequestId} from '../frontend/server/observability.mjs';
import {apiRelay} from '../frontend/server/api-relay.mjs';

async function listen(server){server.listen(0,'127.0.0.1');await once(server,'listening');return 'http://127.0.0.1:'+server.address().port;}
async function close(server){server.closeAllConnections();await new Promise(r=>server.close(r));}
function request(origin,{method='POST',type='application/csp-report',body='',headers={}}={}){
 return new Promise((resolve,reject)=>{const url=new URL(origin),req=http.request({hostname:url.hostname,port:url.port,method,headers:{'Content-Type':type,...headers}},r=>{r.resume();r.once('end',()=>resolve({status:r.statusCode,headers:r.headers}));});req.on('error',reject);req.end(body);});
}

test('CSP reports log only bounded directive aggregates, never sensitive report values',async()=>{
 const logs=[],handler=createCspReporter({log:x=>logs.push(x)}),server=http.createServer(handler),origin=await listen(server);
 try{
  const result=await request(origin,{body:JSON.stringify({'csp-report':{'effective-directive':'script-src-elem','document-uri':'https://example.invalid/reset?token=secret','blocked-uri':'https://private.invalid','script-sample':'password=secret'}})});
  assert.equal(result.status,204);assert.equal(result.headers['cache-control'],'no-store');assert.deepEqual(logs,[{event:'csp_observation',directives:{'script-src-elem':1}}]);
  assert.equal((await request(origin,{type:'application/reports+json',body:JSON.stringify(Array.from({length:20},()=>({type:'csp-violation',body:{effectiveDirective:'img-src',sourceFile:'secret'}})))})).status,204);
  assert.deepEqual(logs.at(-1),{event:'csp_observation',directives:{'img-src':10}});
  assert.equal((await request(origin,{body:'{'})).status,400);
  assert.equal((await request(origin,{type:'text/plain',body:'not a report'})).status,415);
  assert.equal((await request(origin,{method:'GET'})).status,405);
  assert(!JSON.stringify(logs).includes('secret'));
 }finally{await close(server);}
});

test('CSP observation bounds request size and request rate, then opens a new time window',async()=>{
 let now=0;const logs=[],handler=createCspReporter({log:x=>logs.push(x),now:()=>now}),server=http.createServer(handler),origin=await listen(server);
 try{
  assert.equal((await request(origin,{headers:{'Content-Length':'20000'},body:'x'.repeat(20000)})).status,413);
  assert.equal((await request(origin,{headers:{'Transfer-Encoding':'chunked'},body:'x'.repeat(20000)})).status,413);
  for(let i=0;i<58;i++)assert.equal((await request(origin,{body:'{}'})).status,204);
  const limited=await request(origin,{body:'{}'});assert.equal(limited.status,429);assert.equal(limited.headers['retry-after'],'60');
  now=60_000;assert.equal((await request(origin,{body:'{}'})).status,204);assert.deepEqual(logs,[]);
 }finally{await close(server);}
});

test('web IDs are fresh even on cached HTML and visitor IDs/URLs never reach request logs',async()=>{
 const logs=[],server=http.createServer((q,r)=>{observeWebRequest(q,r,x=>logs.push(x));r.setHeader('Cache-Control','public,max-age=60');r.end('static');}),origin=await listen(server);
 try{
  const a=await request(origin,{method:'GET',headers:{'X-Request-Id':'chosen-by-visitor'}}),b=await request(origin,{method:'GET'});
  assert(isRequestId(a.headers['x-request-id']));assert.notEqual(a.headers['x-request-id'],b.headers['x-request-id']);assert.equal(logs.length,2);
  assert.deepEqual(Object.keys(logs[0]).sort(),['event','requestId','method','status','durationMs'].sort());assert.equal(logs[0].requestId,a.headers['x-request-id']);assert(!JSON.stringify(logs).includes('chosen-by-visitor'));
 }finally{await close(server);}
});

test('relay correlates a valid backend response ID and drops visitor or invalid upstream identifiers',async()=>{
 const backendId='11111111-1111-4111-8111-111111111111',logs=[],received=[];let reply=backendId;
 const upstream=http.createServer((q,r)=>{received.push(q.headers['x-request-id']);r.setHeader('X-Request-Id',reply);r.end('{}');}),target=await listen(upstream),relay=apiRelay(target);
 const web=http.createServer((q,r)=>{observeWebRequest(q,r,x=>logs.push(x));q.url='/api/v1/example';relay(q,r);}),origin=await listen(web);
 try{
  const a=await request(origin,{method:'GET',headers:{'X-Request-Id':'visitor-input'}});assert.equal(a.headers['x-request-id'],backendId);assert.equal(logs[0].requestId,backendId);assert.equal(received[0],undefined);
  reply='invalid-backend-id';const b=await request(origin,{method:'GET'});assert(isRequestId(b.headers['x-request-id']));assert.equal(logs[1].requestId,b.headers['x-request-id']);
 }finally{await close(web);await close(upstream);}
});
