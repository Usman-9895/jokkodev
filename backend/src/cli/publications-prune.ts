import 'dotenv/config';
import {parseArgs} from 'node:util';
import {createPrismaClient} from '../database/database.service';
import {PUBLICATION_KEY_PATTERN,PUBLICATION_RECEIPT_MS} from '../modules/questions/publication-policy';
async function run(){
 const {values,positionals}=parseArgs({allowPositionals:true,options:{'confirm-host':{type:'string'},'confirm-database':{type:'string'},batch:{type:'string'}}});
 const mode=positionals[0]??'simulate',batch=Number(values.batch??100);
 if(positionals.length>1||!['simulate','execute'].includes(mode)||!Number.isInteger(batch)||batch<1||batch>500)throw Error('Invalid mode or batch');
 const raw=process.env.PUBLICATION_RETENTION_DATABASE_URL;if(!raw)throw Error('Explicit destination required');
 const url=new URL(raw),database=decodeURIComponent(url.pathname.slice(1));
 if(values['confirm-host']!==`${url.hostname}:${url.port||'5432'}`||values['confirm-database']!==database)throw Error('Unconfirmed destination');
 const db=createPrismaClient(raw);
 try{
  const [identity]=await db.$queryRaw<{name:string}[]>`SELECT current_database() AS name`;
  if(identity.name!==database)throw Error('Unexpected destination');
  const result=await db.$transaction(async tx=>{
   const [locked]=await tx.$queryRaw<{locked:boolean}[]>`SELECT pg_try_advisory_xact_lock(742652,1) AS locked`;
   if(!locked.locked)return {category:'QUESTION_PUBLICATION_RECEIPT',result:'already_running',eligible:0,removed:0};
   const now=Date.now();
   const candidates=await tx.questionPublication.findMany({where:{retainUntil:{lte:new Date(now)}},orderBy:[{retainUntil:'asc'},{key:'asc'}],take:batch,select:{userId:true,action:true,key:true}});
   // Never remove protection early, even if a retention timestamp was altered.
   const records=candidates.filter(r=>{const match=PUBLICATION_KEY_PATTERN.exec(r.key);return match&&Number(match[1])+PUBLICATION_RECEIPT_MS<=now;});
   if(mode==='execute')for(const record of records)await tx.questionPublication.delete({where:{userId_action_key:record}});
   return {category:'QUESTION_PUBLICATION_RECEIPT',result:mode,eligible:records.length,removed:mode==='execute'?records.length:0};
  });console.log(JSON.stringify(result));
 }finally{await db.$disconnect();}
}
run().catch(()=>{console.error('Receipt retention refused or failed; no private data displayed.');process.exitCode=1;});
