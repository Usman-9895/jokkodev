// Vérification HTTP du build existant, sans démarrer ni contacter le backend.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
const origin='http://localhost:3100';
try{await fetch(origin,{signal:AbortSignal.timeout(500)});throw Error('Port 3100 occupé');}catch(error){if(error.message.includes('occupé'))throw error;}
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port','3100'],{cwd:path.join(process.cwd(),'frontend'),stdio:'ignore',windowsHide:true});
const reports=[];
try{
 let ready=false;for(let i=0;i<80;i++){try{if((await fetch(origin,{signal:AbortSignal.timeout(1500)})).ok){ready=true;break;}}catch{/* Démarrage. */}await delay(250);}assert.ok(ready,'Démarrage du build');
 for(const [route,status] of [['/questions/poser',200],['/espace/questions',200],['/questions/demo-session-nestjs',200],['/questions/demo-session-nestjs/modifier',200],['/dev/jokkohelp-contributions',404],['/dev/jokkohelp-contributions?view=mine',404],['/dev/jokkohelp-contributions?view=detail&perspective=author',404],['/dev/jokkohelp-contributions?view=edit&state=success',404],['/dev/comptes',404],['/dev/jokkohelp',404]]){
  const response=await fetch(origin+route);assert.equal(response.status,status,route);const body=await response.text();
  if(route==='/questions/poser')assert.ok(body.includes('Publication indisponible'));
  if(route==='/espace/questions')assert.ok(body.includes('Consultation personnelle indisponible'));
  if(route.includes('/modifier'))assert.ok(body.includes('Modification indisponible'));
  if(status===404)assert.ok(!body.includes('Liste privée simulée'));
  reports.push({route,status:response.status});console.log(`${route} : ${response.status}`);
 }
 fs.mkdirSync('.cache/design-system/lot-5',{recursive:true});
 fs.writeFileSync('.cache/design-system/lot-5/production-checks.json',JSON.stringify(reports,null,2)+'\n');
}finally{if(child.exitCode===null){if(process.platform==='win32')execFileSync('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});else child.kill('SIGTERM');}}
