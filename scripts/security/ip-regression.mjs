import './safe-failure.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import net from 'node:net';
import {Buffer} from 'node:buffer';
import {randomUUID,randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {apiRelay} from '../../frontend/server/api-relay.mjs';

// No implicit team DATABASE_URL, no migration, seven-to-twelve invalid attempts per real peer.
const database=process.env.SECURITY_DATABASE_URL;
if(!database)throw Error('Explicit SECURITY_DATABASE_URL required');
const destination=new URL(database),databaseName=destination.pathname.slice(1);
if(destination.hostname!=='127.0.0.1'||!['jokkodev_security21','jokkodev_ci'].includes(databaseName)||databaseName!==process.env.SECURITY_CONFIRM_DATABASE)throw Error('Unapproved disposable destination');
const basePort=Number(process.env.SECURITY_BASE_PORT??34000);
if(!Number.isInteger(basePort)||basePort<1024||basePort>65533)throw Error('Invalid dedicated ports');
const root=process.cwd(),require=createRequire(path.resolve('backend/package.json')),{Client}=require('pg');
const sql=new Client({connectionString:database});await sql.connect();
try{if((await sql.query('SELECT current_database() name')).rows[0].name!==databaseName)throw Error('Database differs');}finally{await sql.end();}
const records=[];const directory=process.env.SECURITY_EVIDENCE_DIR;
if(directory)fs.mkdirSync(directory,{recursive:true});
function check(name,ok,observed){records.push({name,pass:Boolean(ok),observed});if(!ok)throw Error('Security regression failed: '+name);}
async function free(port){await new Promise((r,j)=>{const s=net.createServer();s.once('error',j);s.listen(port,'127.0.0.1',()=>s.close(r));});}
function send(port,source,method,url,headers={},body){return new Promise((resolve,reject)=>{
 const request=http.request({hostname:'127.0.0.1',port,localAddress:source,method,path:'/api/v1'+url,headers},response=>{
  const chunks=[];response.on('data',b=>chunks.push(b));response.on('end',()=>{let data;try{data=JSON.parse(Buffer.concat(chunks).toString());}catch{/* Assert expected structure/status in caller. */}resolve({status:response.statusCode,headers:response.headers,data});});
 });request.on('error',reject);request.setTimeout(10_000,()=>request.destroy());request.end(body);
});}
async function exercise(port,topology){
 const origin='http://127.0.0.1:'+port,email='security-absent-'+randomUUID()+'@example.test',password=randomBytes(24).toString('base64url');
 async function actor(source){const r=await send(port,source,'GET','/auth/csrf');check(topology+' CSRF/cookie handshake',r.status===200&&typeof r.data.csrfToken==='string'&&r.headers['set-cookie'].every(c=>/HttpOnly/i.test(c)&&/SameSite=Lax/i.test(c)),{status:r.status});return {source,headers:{Origin:origin,'Content-Type':'application/json','X-CSRF-Token':r.data.csrfToken,Cookie:r.headers['set-cookie'].map(c=>c.split(';')[0]).join('; ')}};}
 const a=await actor('127.0.0.1');
 const login=(actor,extra={},body={email,password})=>send(port,actor.source,'POST','/auth/login',{...actor.headers,...extra},JSON.stringify(body));
 const denied=await login(a,{'X-CSRF-Token':''});check(topology+' CSRF still enforced',denied.status===403&&denied.data.code==='CSRF_TOKEN_INVALID',{status:denied.status,code:denied.data.code});
 const foreign=await login(a,{Origin:'https://not-allowed.invalid'});check(topology+' origin still enforced',foreign.status===403&&foreign.data.code==='CSRF_ORIGIN_REJECTED',{status:foreign.status,code:foreign.data.code});
 const invalid=await login(a,{},{});check(topology+' body validation intact',invalid.status===400,{status:invalid.status});
 for(let i=0;i<5;i++){const r=await login(a);check(topology+' failed login '+(i+1),r.status===401,{status:r.status});}
 const limited=await login(a);check(topology+' sixth limited',limited.status===429&&limited.data.code==='RATE_LIMITED'&&/^\d+$/.test(limited.headers['retry-after']??'')&&limited.headers['access-control-expose-headers']?.includes('Retry-After'),{status:limited.status,code:limited.data.code,retryAfterPresent:!!limited.headers['retry-after']});
 for(const extra of [
  {'X-Forwarded-For':'10.20.1.1'},
  {'X-Forwarded-For':['10.20.1.2','10.20.1.3']},
  {'X-Forwarded-For':'10.20.1.4, 127.0.0.1, ::1',Forwarded:'for=10.20.1.5;proto=https'},
  {Forwarded:'for="[::1]",for=10.20.1.6','X-Real-IP':'10.20.1.7','CF-Connecting-IP':'10.20.1.8','X-Forwarded-Host':'not-allowed.invalid'}
 ]){const r=await login(a,extra);check(topology+' forwarding variant remains limited',r.status===429,{status:r.status});}
 const b=await actor('127.0.0.2');const other=await login(b,{'X-Forwarded-For':'127.0.0.1'});
 check(topology+' actual second TCP peer has independent quota',other.status===401,{status:other.status,realSource:'127.0.0.2 (localAddress socket bind, not a header)'});
}
try{
 for(const topology of ['direct','node-relay']){
  await free(basePort);await free(basePort+1);
  const frontPort=topology==='direct'?basePort:basePort+1,origin='http://127.0.0.1:'+frontPort;
  const log=directory?fs.openSync(path.join(directory,topology+'.log'),'a'):null;
  const child=spawn(process.execPath,['dist/src/main.js'],{cwd:path.join(root,'backend'),env:{...process.env,NODE_ENV:'test',HOST:'127.0.0.1',PORT:String(basePort),DATABASE_URL:database,APP_ORIGIN:origin,CORS_ORIGINS:origin,SESSION_COOKIE_SECURE:'false',TRUST_PROXY:topology==='direct'?'':'127.0.0.1',CSRF_SECRET:randomBytes(32).toString('hex'),MAIL_TRANSPORT:'file',MAIL_FILE_DIR:path.join(os.tmpdir(),'jokkodev-security21-ip-mail')},stdio:['ignore',log??'ignore',log??'ignore'],windowsHide:true});
  if(log!==null)fs.closeSync(log);let relay;
  try{
   let ready=false;for(let i=0;i<80;i++){try{if((await fetch('http://127.0.0.1:'+basePort+'/api/v1/health/ready')).ok){ready=true;break;}}catch{/* Wait only for our own child. */}if(child.exitCode!==null)break;await new Promise(r=>setTimeout(r,250));}if(!ready)throw Error('Dedicated API unavailable');
   if(topology==='node-relay'){relay=http.createServer(apiRelay('http://127.0.0.1:'+basePort));await new Promise(r=>relay.listen(basePort+1,'127.0.0.1',r));}
   await exercise(frontPort,topology);
  }finally{if(relay){relay.closeAllConnections();await new Promise(r=>relay.close(r));}if(child.exitCode===null){await new Promise(r=>{child.once('exit',r);child.kill();});}}
 }
 if(process.env.SECURITY_WEB_PORT){const webPort=Number(process.env.SECURITY_WEB_PORT);if(webPort!==33300)throw Error('Unapproved existing recipe port');await exercise(webPort,'next-node-entry');}
 console.log('PASS real TCP peers: direct API and socket-based relay; forwarding variants stay 429.');
}catch{console.error('Security IP regression failed; details withheld. Inspect sanitized evidence.');process.exitCode=1;}
finally{if(directory)fs.writeFileSync(path.join(directory,'ip-regression.json'),JSON.stringify({baseCommit:'d300b0ba17fbf8d0665c26f6cad52c17ac0011a2',time:new Date().toISOString(),records},null,2));}
