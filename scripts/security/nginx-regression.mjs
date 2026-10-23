import './safe-failure.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import net from 'node:net';
const dir=path.resolve('.cache/verification'),env=JSON.parse(fs.readFileSync(dir+'/env.json')),database=new URL(env.DATABASE_URL);
if(database.hostname!=='127.0.0.1'||database.port!=='55475'||database.pathname!=='/jokkodev_security21')throw Error('Dedicated destination required');
const peer=JSON.parse(fs.readFileSync('docs/security/lot21/docker-peer.json')).peer;
if(peer!=='127.0.0.1')throw Error('Re-examine actual Docker host peer; never guess a trust range');
await new Promise((r,j)=>{const s=net.createServer();s.once('error',j);s.listen(33305,'127.0.0.1',()=>s.close(r));});
const stamp=randomBytes(5).toString('hex'),network='jokkodev-lot21-'+stamp,name='jokkodev-lot21-nginx-'+stamp;
const command=(args)=>execFileSync('docker',args,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}).trim();
const configuration=`server { listen 8080; access_log off; client_max_body_size 128k; location /api/v1/ { proxy_pass http://host.docker.internal:33305; proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Forwarded-For $remote_addr; proxy_set_header X-Forwarded-Proto http; proxy_set_header X-Forwarded-Host $host; proxy_set_header Forwarded ""; proxy_set_header X-Real-IP ""; proxy_set_header X-Client-IP ""; proxy_set_header True-Client-IP ""; proxy_set_header CF-Connecting-IP ""; } }`;
fs.writeFileSync(dir+'/nginx-test.conf',configuration);
const log=fs.openSync(dir+'/nginx-api.log','a'),child=spawn(process.execPath,['dist/src/main.js'],{cwd:path.resolve('backend'),env:{...process.env,...env,PORT:'33305',HOST:'127.0.0.1',NODE_ENV:'test',TRUST_PROXY:peer,APP_ORIGIN:'http://security21.test',CORS_ORIGINS:'http://security21.test'},windowsHide:true,stdio:['ignore',log,log]});fs.closeSync(log);
let ownNetwork=false,id;const evidence={baseCommit:'d300b0ba17fbf8d0665c26f6cad52c17ac0011a2',time:new Date().toISOString(),scope:'HTTP nginx API header boundary, Docker Desktop. Not SystaLink TLS/firewall or full production config.',peer,clients:[]};
try{
 let ready=false;for(let i=0;i<80;i++){try{if((await fetch('http://127.0.0.1:33305/api/v1/health/ready')).ok){ready=true;break;}}catch{/* Our API starts here. */}await new Promise(r=>setTimeout(r,250));}if(!ready)throw Error('Dedicated API unavailable');
 command(['network','create','--label','jokkodev.audit=lot21',network]);ownNetwork=true;
 id=command(['run','-d','--name',name,'--label','jokkodev.audit=lot21','--network',network,'--network-alias','entry','--mount','type=bind,source='+dir+'/nginx-test.conf,target=/etc/nginx/conf.d/default.conf,readonly','nginx:alpine']);
 evidence.nginx=JSON.parse(command(['image','inspect','nginx:alpine']))[0].Config.Env.find(v=>v.startsWith('NGINX_VERSION='));
 evidence.images=['nginx:alpine','node:24-alpine'].map(image=>({image,id:command(['image','inspect',image,'--format','{{.Id}}'])}));
 await new Promise(r=>setTimeout(r,1000));
 const subnet=JSON.parse(command(['network','inspect',network]))[0].IPAM.Config.find(c=>c.Subnet.includes('.')).Subnet;
 for(const mode of ['a','b']){
  // Same nonexistent email; containers establish different TCP sources in the private test network.
  const address=subnet.split('/')[0].replace(/\.\d+$/,mode==='a'?'.10':'.11');
  let result;try{result=command(['run','--rm','--name','jokkodev-lot21-client-'+mode+'-'+stamp,'--label','jokkodev.audit=lot21','--network',network,'--ip',address,'--env','SECURITY_TEST_ID='+stamp,'--mount','type=bind,source='+path.resolve('scripts/security/nginx-client.mjs')+',target=/tests/client.mjs,readonly','node:24-alpine','node','/tests/client.mjs']);}catch(e){if(e.stdout)evidence.clients.push({client:mode,...JSON.parse(e.stdout)});throw Error('Dedicated client failed',{cause:e});}
  const record=JSON.parse(result);if(!record.addresses.includes(address))throw Error('Actual client address differs');evidence.clients.push({client:mode,...record});
 }
 evidence.pass=evidence.clients.length===2&&evidence.clients.every(c=>c.pass);
 console.log('PASS nginx: two genuine network clients have independent quotas; forged headers remain limited.');
}catch{evidence.pass=false;console.error('Nginx regression failed; inspect sanitized evidence.');process.exitCode=1;}
finally{
 if(id)command(['rm','-f',id]);if(ownNetwork)command(['network','rm',network]);
 if(child.exitCode===null)await new Promise(r=>{child.once('exit',r);child.kill();});
 fs.writeFileSync('docs/security/lot21/nginx-evidence.json',JSON.stringify(evidence,null,2));
}
