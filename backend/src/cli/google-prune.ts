import 'dotenv/config';
import {parseArgs} from 'node:util';
import {createPrismaClient} from '../database/database.service';
async function run(){
 const {values}=parseArgs({options:{execute:{type:'boolean',default:false},'confirm-database':{type:'string'},'confirm-host':{type:'string'},batch:{type:'string',default:'1000'}}});
 const raw=process.env.GOOGLE_FLOW_DATABASE_URL;if(!raw)throw Error('Explicit destination required');
 const url=new URL(raw),name=decodeURIComponent(url.pathname.slice(1)),batch=Number(values.batch);
 if(!['postgresql:','postgres:'].includes(url.protocol)||values['confirm-database']!==name||values['confirm-host']!==url.hostname+':'+(url.port||'5432')||!Number.isInteger(batch)||batch<1||batch>1000)throw Error('Unconfirmed destination or batch');
 const db=createPrismaClient(raw);
 try{
  const [identity]=await db.$queryRaw<{name:string}[]>`SELECT current_database() AS name`;if(identity.name!==name)throw Error('Unexpected destination');
  const rows=await db.googleFlow.findMany({where:{expiresAt:{lte:new Date()}},select:{id:true},take:batch,orderBy:{expiresAt:'asc'}});
  const removed=values.execute?await db.googleFlow.deleteMany({where:{id:{in:rows.map(r=>r.id)},expiresAt:{lte:new Date()}}}):{count:0};
  console.log(JSON.stringify({event:'google_flow_prune',execute:values.execute,selected:rows.length,removed:removed.count}));
 }finally{await db.$disconnect();}
}
run().catch(()=>{console.error(JSON.stringify({event:'google_flow_prune_failed'}));process.exitCode=1;});
