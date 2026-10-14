import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
const origin='http://localhost:3100';
try{await fetch(origin,{signal:AbortSignal.timeout(500)});throw Error('Port 3100 occupé');}catch(e){if(e.message.includes('occupé'))throw e;}
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port','3100'],{cwd:path.join(process.cwd(),'frontend'),stdio:'ignore',windowsHide:true});
const reports=[];
try{
 let ready=false;for(let i=0;i<80;i++){try{if((await fetch(origin,{signal:AbortSignal.timeout(1500)})).ok){ready=true;break;}}catch{/* Attente. */}await delay(250);}assert.ok(ready,'Démarrage du build');
 for(const [route,status] of [['/projets',200],['/projets/demo-associations',200],['/projets/proposer',200],['/projets/demo-associations/modifier',200],['/espace/projets',200],['/dev/jokkoprojects',404],['/dev/jokkoprojects?view=mine',404],['/dev/jokkoprojects?view=edit&state=success&perspective=owner',404],['/dev/jokkoprojects?view=detail&state=unavailable',404],['/dev/jokkohelp-contributions',404],['/dev/comptes',404]]){
  const response=await fetch(origin+route);assert.equal(response.status,status,route);const body=await response.text();if(route==='/projets')assert.ok(body.includes('Consultation de démonstration'));if(route==='/projets/proposer'||route.includes('/modifier')||route==='/espace/projets')assert.ok(body.includes('indisponible'));if(status===404)assert.ok(!body.includes('Liste personnelle fictive'));reports.push({route,status:response.status});console.log(`${route} : ${response.status}`);
 }
 const missing=await fetch(origin+'/projets/inconnu');assert.ok((await missing.text()).includes('Ce projet est introuvable'));reports.push({route:'/projets/inconnu',status:missing.status,note:'Rendu introuvable contrôlé ; le statut dépend du streaming Next.'});console.log('/projets/inconnu : '+missing.status);
 fs.mkdirSync('.cache/design-system/lot-6',{recursive:true});fs.writeFileSync('.cache/design-system/lot-6/production-checks.json',JSON.stringify(reports,null,2)+'\n');
}finally{if(child.exitCode===null){if(process.platform==='win32')execFileSync('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});else child.kill('SIGTERM');}}
