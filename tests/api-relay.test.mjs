import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {Buffer} from 'node:buffer';
import {apiOrigin,apiRelay} from '../frontend/server/api-relay.mjs';

async function listen(server){server.listen(0,'127.0.0.1');await once(server,'listening');return 'http://127.0.0.1:'+server.address().port;}
async function close(server){server.closeAllConnections();await new Promise(r=>server.close(r));}
function request(origin,{path='/api/v1/test',source='127.0.0.1',method='GET',headers={},body}={}){
 return new Promise((resolve,reject)=>{
  const url=new URL(origin);const q=http.request({hostname:url.hostname,port:url.port,path,localAddress:source,method,headers},r=>{
   const chunks=[];r.on('data',b=>chunks.push(b));r.on('end',()=>resolve({status:r.statusCode,headers:r.headers,body:Buffer.concat(chunks).toString()}));
  });q.on('error',reject);q.end(body);
 });
}
test('API relay takes IP from real TCP peers, replacing every client forwarding variant',async()=>{
 const upstream=http.createServer((q,r)=>r.end(JSON.stringify({headers:q.headers})));
 const origin=await listen(upstream),web=http.createServer(apiRelay(origin));const entry=await listen(web);
 try{
  for(const headers of [
   {'X-Forwarded-For':'10.1.1.1'},
   {'X-Forwarded-For':'10.1.1.2, 127.0.0.1'},
   {'X-Forwarded-For':['10.1.1.3','10.1.1.4'],Forwarded:'for=10.1.1.5;proto=https'},
   {Forwarded:'for="[::1]",for=10.1.1.6','X-Real-IP':'10.1.1.7','CF-Connecting-IP':'10.1.1.8','X-Forwarded-Host':'external.invalid'},
   {Connection:'x-forwarded-for,x-real-ip','X-Forwarded-For':'10.1.1.9','X-Real-IP':'10.1.1.10'}
  ]){
   const a=JSON.parse((await request(entry,{headers})).body).headers;
   assert.equal(a['x-forwarded-for'],'127.0.0.1');assert.equal(a['x-forwarded-proto'],'http');
   assert.equal(a.forwarded,undefined);assert.equal(a['x-real-ip'],undefined);assert.equal(a['cf-connecting-ip'],undefined);assert.equal(a['x-forwarded-host'],undefined);
  }
  const b=JSON.parse((await request(entry,{source:'127.0.0.2',headers:{'X-Forwarded-For':'127.0.0.1'}})).body).headers;
  assert.equal(b['x-forwarded-for'],'127.0.0.2');
 }finally{await close(web);await close(upstream);}
});
test('relay streams JSON/multipart untouched and preserves cookies, CSRF, status and Retry-After',async()=>{
 const received=[];const upstream=http.createServer(async(q,r)=>{
  const chunks=[];for await(const b of q)chunks.push(b);received.push({body:Buffer.concat(chunks),headers:q.headers,url:q.url,method:q.method});
  r.writeHead(429,{'Set-Cookie':['a=one; HttpOnly; SameSite=Lax','b=two; HttpOnly; SameSite=Lax'],'Retry-After':'9','Cache-Control':'no-store','Access-Control-Expose-Headers':'Retry-After'});r.end('{"code":"RATE_LIMITED"}');
 });
 const origin=await listen(upstream),web=http.createServer(apiRelay(origin)),entry=await listen(web);
 try{for(const [type,body]of [['application/json','{"title":"é <>&"}'],['multipart/form-data; boundary=AUDIT','--AUDIT\r\nContent-Disposition: form-data; name="file"; filename="x.png"\r\n\r\nabc\r\n--AUDIT--\r\n']]){
  const r=await request(entry,{path:'/api/v1/test?search=a%26b',method:'POST',headers:{'Content-Type':type,'X-CSRF-Token':'synthetic-test-csrf',Cookie:'synthetic=local',Origin:'http://local.invalid',Host:'external.invalid'},body});
  assert.equal(r.status,429);assert.equal(r.headers['retry-after'],'9');assert.equal(r.headers['set-cookie'].length,2);assert.equal(r.headers['cache-control'],'no-store');
  const q=received.at(-1);assert.ok(q.body.equals(Buffer.from(body)));assert.equal(q.headers['content-type'],type);assert.equal(q.headers['x-csrf-token'],'synthetic-test-csrf');assert.equal(q.headers.cookie,'synthetic=local');assert.equal(q.headers.origin,'http://local.invalid');assert.equal(q.headers.host,new URL(origin).host);assert.equal(q.url,'/api/v1/test?search=a%26b');assert.equal(q.method,'POST');
 }}finally{await close(web);await close(upstream);}
});
test('relay never follows redirects from upstream',async()=>{
 let count=0;const upstream=http.createServer((q,r)=>{count++;r.writeHead(303,{Location:'https://not-contacted.invalid/'});r.end();});
 const origin=await listen(upstream),web=http.createServer(apiRelay(origin)),entry=await listen(web);
 try{const r=await request(entry);assert.equal(r.status,303);assert.equal(r.headers.location,'https://not-contacted.invalid/');assert.equal(count,1);}finally{await close(web);await close(upstream);}
});
test('lost upstream response returns a generic error without automatic replay',async()=>{
 let count=0;const upstream=http.createServer((q)=>{count++;q.socket.destroy();});
 const origin=await listen(upstream),web=http.createServer(apiRelay(origin)),entry=await listen(web);
 try{const r=await request(entry,{method:'POST',body:'{}'});assert.equal(r.status,502);assert.equal(JSON.parse(r.body).code,'API_UNAVAILABLE');assert.equal(count,1);assert.ok(!r.body.includes(origin));assert.equal(r.headers['cache-control'],'no-store');}finally{await close(web);await close(upstream);}
});
test('invalid origin or non-API destination cannot select an upstream',async()=>{
 for(const u of ['file:///tmp/a','https://a.invalid/path','https://user:pass@a.invalid','https://a.invalid/?x=1'])assert.throws(()=>apiOrigin(u));
 let count=0;const upstream=http.createServer((q,r)=>{count++;r.end();}),origin=await listen(upstream),web=http.createServer(apiRelay(origin)),entry=await listen(web);
 try{for(const path of ['/api/v10/test','//external.invalid/api/v1/test','http://external.invalid/api/v1/test'])assert.equal((await request(entry,{path})).status,404);assert.equal(count,0);}finally{await close(web);await close(upstream);}
});
