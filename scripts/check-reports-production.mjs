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
  for(const [route,status] of [
    ['/admin',200],['/admin/signalements',200],['/admin/signalements/demo-report-answer?role=administrator',200],
    ['/signalements?type=question&target=demo-session-nestjs',200],['/signalements?type=answer&target=demo-session-answer-2',200],['/signalements?type=project&target=demo-associations',200],
    ['/dev/moderation',404],['/dev/moderation?view=detail&id=demo-report-answer&role=administrator&outcome=success',404],['/dev/moderation?state=paginated&page=2',404],
    ['/dev/signalements',404],['/dev/signalements?state=success&perspective=developer',404],['/dev/signalements?type=answer&target=demo-session-answer-2',404],['/dev/espace',404],
  ]) {
    const response=await fetch(origin+route),body=await response.text();assert.equal(response.status,status,route);
    if(status===200)assert.ok(body.includes('indisponible')||body.includes('indisponibles'));
    assert.ok(!body.includes('Propos inappropriés — scénario fictif')&&!body.includes('Relecteur fictif')&&!body.includes('Administration fictive'));
    reports.push({route,status:response.status});console.log(route+' : '+response.status);
  }
  fs.mkdirSync('.cache/design-system/lot-8',{recursive:true});fs.writeFileSync('.cache/design-system/lot-8/production-checks.json',JSON.stringify(reports,null,2)+'\n');
} finally {if(child.exitCode===null){if(process.platform==='win32')execFileSync('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});else child.kill('SIGTERM');}}
