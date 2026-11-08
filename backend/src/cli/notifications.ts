import 'dotenv/config';
import {parseArgs} from 'node:util';
import {createPrismaClient} from '../database/database.service';
import {validateEnvironment} from '../config/environment';
import {MailService} from '../modules/mail/mail.service';
import {NotificationWorker} from '../modules/mail/notifications';
async function run(){
 const {positionals,values}=parseArgs({allowPositionals:true,options:{'confirm-database':{type:'string'},'confirm-host':{type:'string'},execute:{type:'boolean',default:false},batch:{type:'string'},id:{type:'string'},resolution:{type:'string'}}});
 const mode=positionals[0]??'status';if(positionals.length>1||!['status','inspect','process','prune','resolve'].includes(mode))throw Error('Invalid mode');
 const raw=process.env.NOTIFICATION_DATABASE_URL;if(!raw)throw Error('Explicit notification destination required');
 const url=new URL(raw),name=decodeURIComponent(url.pathname.slice(1));
 if(!['postgres:','postgresql:'].includes(url.protocol)||values['confirm-database']!==name||values['confirm-host']!==url.hostname+':'+(url.port||'5432'))throw Error('Unconfirmed destination');
 if(['process','prune','resolve'].includes(mode)&&(!values.execute||process.env.NOTIFICATION_WORKER_ENABLED!=='1'))throw Error('Explicit worker activation required');
 const db=createPrismaClient(raw);
 try{
  const [identity]=await db.$queryRaw<{name:string}[]>`SELECT current_database() AS name`;if(identity.name!==name)throw Error('Unexpected destination');
  const env=validateEnvironment({...process.env,DATABASE_URL:raw}),mail=new MailService(env),worker=new NotificationWorker(db,message=>mail.send(message),env.appOrigin),batch=values.batch?Number(values.batch):20;
  let result:unknown;
  if(mode==='status')result=await worker.status();
  if(mode==='inspect')result=await worker.inspect(batch);
  if(mode==='process')result=await worker.process(batch);
  if(mode==='prune')result=await worker.prune(batch);
  if(mode==='resolve'){
   if(!values.id||!/^[0-9a-f-]{36}$/i.test(values.id)||!['sent','abandoned'].includes(values.resolution??''))throw Error('Explicit uncertain event and resolution required');
   result=await db.emailNotification.updateMany({where:{id:values.id,status:'UNCERTAIN'},data:{status:values.resolution==='sent'?'SENT':'FAILED',lastCode:values.resolution==='sent'?'OPERATOR_CONFIRMED':'OPERATOR_ABANDONED',finishedAt:new Date()}});
  }
  console.log(JSON.stringify({event:'notification_operation',mode,result}));
 }finally{await db.$disconnect();}
}
run().catch(()=>{console.error(JSON.stringify({event:'notification_operation_failed'}));process.exitCode=1;});
