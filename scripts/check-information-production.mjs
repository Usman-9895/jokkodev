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
 const publicPages=['/','/regles','/contact','/confidentialite','/a-propos','/ressources','/questions','/questions/demo-session-nestjs','/projets','/projets/demo-associations','/connexion','/inscription','/mot-de-passe-oublie','/nouveau-mot-de-passe','/verification-email'];
 const waiting=['/espace','/espace/profil','/espace/questions','/espace/projets','/espace/candidatures','/espace/projets/demo-associations/demandes','/admin','/admin/signalements','/admin/signalements/demo-report-answer?role=administrator','/profils/awa_dev','/questions/poser','/questions/demo-session-nestjs/modifier','/projets/proposer','/projets/demo-associations/modifier','/signalements?type=answer&target=demo-session-answer-2'];
 const previews=['comptes','design-system','espace','informations','jokkohelp','jokkohelp-contributions','jokkoprojects','moderation','signalements'].map(x=>'/dev/'+x);
 for(const route of [...publicPages,...waiting,...previews]){
  const response=await fetch(origin+route),body=await response.text();assert.equal(response.status,previews.includes(route)?404:200,route);
  if(waiting.includes(route))assert.match(body,/indisponible|pas encore|attente|ultérieurement/i,route);
  if(!previews.includes(route))assert.ok(!/<a\b[^>]*href="\/dev\//.test(body),route+' lien public vers aperçu');
  assert.ok(!body.includes('Relecteur fictif')&&!body.includes('Propos inappropriés — scénario fictif')&&!body.includes('Version de travail — développement uniquement'),route+' données de démonstration privée');
  if(route==='/confidentialite'){assert.ok(body.includes('Contenu à venir'));assert.ok(!body.includes('Périmètre prévu'));}
  if(route==='/contact'){assert.ok(!body.includes('mailto:')&&!body.includes('tel:'));assert.ok(!/<form\b/.test(body));assert.ok(body.includes('Canal de contact à confirmer'));}
  reports.push({route,status:response.status});console.log(route+' : '+response.status);
 }
 for(const route of ['/dev/informations?state=success','/dev/moderation?view=detail&id=demo-report-answer&role=administrator','/dev/espace?view=received&perspective=owner','/dev/comptes?view=edit']){const r=await fetch(origin+route);assert.equal(r.status,404);reports.push({route,status:r.status});}
 for(const route of ['/route-lot-9-inconnue','/questions/lot-9-inconnue','/projets/lot-9-inconnu']){const response=await fetch(origin+route),body=await response.text();assert.match(body,/introuvable/i);reports.push({route,status:response.status,visualNotFound:true,streamingHeader:response.headers.get('content-type')});console.log(route+' : '+response.status+' avec état introuvable');}
 fs.mkdirSync('.cache/design-system/lot-9',{recursive:true});fs.writeFileSync('.cache/design-system/lot-9/production-checks.json',JSON.stringify(reports,null,2)+'\n');
} finally {if(child.exitCode===null){if(process.platform==='win32')execFileSync('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});else child.kill('SIGTERM');}}
