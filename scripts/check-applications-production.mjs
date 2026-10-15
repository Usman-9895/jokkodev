import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
const origin='http://localhost:3100';
try{await fetch(origin,{signal:AbortSignal.timeout(500)});throw Error('Port 3100 occupé');}catch(e){if(e.message.includes('occupé'))throw e;}
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port','3100'],{cwd:path.join(process.cwd(),'frontend'),stdio:'ignore',windowsHide:true});
const reports=[];
try {
 let ready=false;for(let i=0;i<80;i++){try{if((await fetch(origin,{signal:AbortSignal.timeout(1500)})).ok){ready=true;break;}}catch{/* Attente bornée. */}await delay(250);}assert.ok(ready);
 for(const [route,status] of [['/espace',200],['/espace/candidatures',200],['/espace/projets/demo-associations/demandes',200],['/dev/espace',404],['/dev/espace?view=received&perspective=owner&outcome=success',404],['/dev/espace?view=sent',404],['/dev/espace?view=apply&state=success',404],['/dev/jokkoprojects',404],['/dev/jokkohelp-contributions',404],['/dev/comptes',404]]) {
  const response=await fetch(origin+route),body=await response.text();assert.equal(response.status,status,route);if(status===200)assert.ok(body.includes('indisponible'));assert.ok(!body.includes('Moussa Ba')&&!body.includes('Binta Fall')&&!body.includes('Je peux contribuer à l’API'));reports.push({route,status:response.status});console.log(route+' : '+response.status);
 }
 fs.mkdirSync('.cache/design-system/lot-7',{recursive:true});fs.writeFileSync('.cache/design-system/lot-7/production-checks.json',JSON.stringify(reports,null,2)+'\n');
} finally {if(child.exitCode===null){if(process.platform==='win32')execFileSync('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});else child.kill('SIGTERM');}}
