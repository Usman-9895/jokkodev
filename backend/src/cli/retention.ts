import 'dotenv/config';
import { parseArgs } from 'node:util';
import { readFile,writeFile,stat } from 'node:fs/promises';
import { createPrismaClient } from '../database/database.service';
import { validateEnvironment } from '../config/environment';
import { MailService } from '../modules/mail/mail.service';
import { CATEGORIES,RETENTION_LOCK,RetentionService,type Category } from '../modules/retention/retention.service';

async function run(){
 const {values,positionals}=parseArgs({allowPositionals:true,options:{'confirm-database':{type:'string'},'confirm-host':{type:'string'},batch:{type:'string'},categories:{type:'string'},output:{type:'string'},'hold-file':{type:'string'}}});
 const mode=positionals[0]??'simulate';
 if(positionals.length>1||!['simulate','execute','notify','hold','export','restore-check'].includes(mode))throw Error('Unknown retention mode');
 // Never silently reuse the normal application database, even for a simulation.
 const raw=process.env.RETENTION_DATABASE_URL;if(!raw)throw Error('Explicit retention destination required');
 const url=new URL(raw),name=decodeURIComponent(url.pathname.slice(1));
 if(values['confirm-database']!==name||values['confirm-host']!==`${url.hostname}:${url.port||'5432'}`)throw Error('Unconfirmed destination');
 const db=createPrismaClient(raw);
 try{
  const [identity]=await db.$queryRaw<{name:string}[]>`SELECT current_database() AS name`;
  if(identity.name!==name)throw Error('Unexpected destination');
  const service=new RetentionService(db);
  if(['simulate','execute'].includes(mode)){
   const requested=values.categories?.split(','),categories:Category[]=[];
   for(const c of requested??CATEGORIES){const known=CATEGORIES.find(k=>k===c);if(!known)throw Error('Unknown category');categories.push(known);}
   console.log(JSON.stringify(await service.run(mode==='execute',values.batch?Number(values.batch):undefined,categories)));return;
  }
  if(mode==='notify'){
   const env=validateEnvironment({...process.env,DATABASE_URL:raw});const mail=new MailService(env);
   console.log(JSON.stringify({category:'INACTIVITY',...await service.notify(m=>mail.send(m),values.batch?Number(values.batch):undefined)}));return;
  }
  if(mode==='hold'){
   if(!values['hold-file'])throw Error('Hold file required');
   const h=JSON.parse(await readFile(values['hold-file'],'utf8')) as {category:string;entityId:string;reason:string;owner:string;reviewAt:string;untilAt:string};
   const reviewAt=new Date(h.reviewAt),untilAt=new Date(h.untilAt),now=new Date();
   if(!CATEGORIES.some(c=>c===h.category)||!/^[0-9a-f-]{36}$/i.test(h.entityId)||!h.reason?.trim()||h.reason.length>500||!h.owner?.trim()||h.owner.length>100||!(reviewAt>now)||!(untilAt>=reviewAt))throw Error('Invalid dated exception');
   await db.$transaction(async tx=>{await tx.$queryRaw`SELECT pg_advisory_xact_lock(${RETENTION_LOCK}::int,0)::text`;await tx.retentionHold.upsert({where:{category_entityId:{category:h.category,entityId:h.entityId}},create:{...h,reviewAt,untilAt},update:{reason:h.reason,owner:h.owner,reviewAt,untilAt}});});
   console.log(JSON.stringify({category:h.category,result:'exception_recorded'}));return;
  }
  if(!values.output)throw Error('Protected registry path required');
  if(mode==='export'){
   const snapshot=await db.$transaction(async tx=>({at:new Date().toISOString(),events:await tx.retentionEvent.findMany({orderBy:{at:'asc'},take:10001}),holds:await tx.retentionHold.findMany({take:10001}),reviews:await tx.retentionReview.findMany({take:10001})}),{isolationLevel:'RepeatableRead'});
   if([snapshot.events,snapshot.holds,snapshot.reviews].some(rows=>rows.length>10000))throw Error('Registry requires reviewed partitioned export');
   await writeFile(values.output,JSON.stringify(snapshot),{mode:0o600,flag:'wx'});
   console.log(JSON.stringify({result:'protected_registry_exported',events:snapshot.events.length,holds:snapshot.holds.length,reviews:snapshot.reviews.length}));return;
  }
  if((await stat(values.output)).size>10*1024*1024)throw Error('Registry outside bounds');
  const snapshot=JSON.parse(await readFile(values.output,'utf8')) as {at:string;events:{category:string;entityId:string;action:string}[]};
  if(!Number.isFinite(Date.parse(snapshot.at))||!Array.isArray(snapshot.events)||snapshot.events.length>10000)throw Error('Invalid registry');
  let resurrected=0;
  for(const e of snapshot.events){
   if(e.action==='NOTICE_QUEUED')continue;
   if(e.category==='SESSION')resurrected+=await db.session.count({where:{id:e.entityId}});
   else if(e.category==='TOKEN')resurrected+=await db.accountToken.count({where:{id:e.entityId}});
   else if(e.action==='ACCOUNT_ERASED')resurrected+=await db.user.count({where:{id:e.entityId}});
   else if(e.category==='APPLICATION')resurrected+=await db.application.count({where:{id:e.entityId,messageErasedAt:null}});
   else if(e.category==='QUESTION')resurrected+=await db.question.count({where:{id:e.entityId,retentionErasedAt:null}});
   else if(e.category==='PROJECT')resurrected+=await db.project.count({where:{id:e.entityId,retentionErasedAt:null}});
   else if(e.category==='REPORT')resurrected+=await db.report.count({where:{id:e.entityId}});
   else throw Error('Unknown registry action');
  }
  console.log(JSON.stringify({result:'restore_retention_check',resurrected}));if(resurrected)process.exitCode=2;
 }finally{await db.$disconnect();}
}
run().catch(()=>{console.error('Traitement refusé ou incomplet : vérifier destination, mode et prérequis sans publier de données privées.');process.exitCode=1;});
