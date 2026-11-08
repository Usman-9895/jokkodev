import {Inject,Injectable} from '@nestjs/common';
import {ENVIRONMENT} from '../../config/config.module';
import type {Environment} from '../../config/environment';
import type {Prisma,PrismaClient} from '../../generated/prisma/client';
import {randomUUID} from 'node:crypto';
import type {MailMessage} from './mail.service';

export type NotificationKind='APPLICATION_ACCEPTED'|'ACCOUNT_REACTIVATED';
const DAY=86400000;
export const NOTIFICATION_MAX_ATTEMPTS=5;
/** Called only inside the business transaction; no mail, no background promise. */
@Injectable()
export class NotificationRecorder {
 constructor(@Inject(ENVIRONMENT) private readonly env:Environment){}
 async record(tx:Prisma.TransactionClient,input:{decisionKey:string;kind:NotificationKind;userId:string;projectId?:string;projectTitle?:string}){
  if(!this.env.notificationEventsEnabled)return;
  const user=await tx.user.findUnique({where:{id:input.userId},select:{email:true,emailVerifiedAt:true}});
  const eligible=!!user?.email&&!!user.emailVerifiedAt;
  await tx.emailNotification.createMany({data:[{...input,status:eligible?'PENDING':'SKIPPED',lastCode:eligible?null:'UNVERIFIED_ADDRESS',finishedAt:eligible?null:new Date()}],skipDuplicates:true});
 }
}
export function notificationMessage(kind:string,to:string,origin:string,title:string|null):MailMessage{
 if(kind==='APPLICATION_ACCEPTED')return{to,subject:'Ta candidature a été acceptée — JokkoDev',text:`Bonjour,\n\nTa candidature au projet « ${title??'Projet JokkoDev'} » a été acceptée.\nRetrouve tes projets et tes prochaines étapes dans ton espace JokkoDev :\n${origin}/espace/projets\n\nConnecte-toi pour consulter les informations réservées aux membres. Aucun contact de collaboration n’est transmis par cet e-mail.\n\nL’équipe JokkoDev`};
 if(kind!=='ACCOUNT_REACTIVATED')throw Error('Unknown notification kind');
 return{to,subject:'Ton compte JokkoDev est réactivé',text:`Bonjour,\n\nTon compte JokkoDev a été réactivé. Tu peux ouvrir une nouvelle session :\n${origin}/connexion\n\nLes anciennes sessions restent fermées.\n\nL’équipe JokkoDev`};
}
/** Explicit one-shot worker. A committed claim precedes SMTP; stale claims are uncertain, never auto-retried. */
export class NotificationWorker {
 constructor(private readonly db:PrismaClient,private readonly send:(message:MailMessage)=>Promise<void>,private readonly origin:string){
  const u=new URL(origin);if(u.origin!==origin||!['http:','https:'].includes(u.protocol))throw Error('Invalid notification origin');
 }
 private async maintain(now:Date){
  await this.db.emailNotification.updateMany({where:{status:'SENDING',claimedAt:{lt:new Date(now.getTime()-5*60000)}},data:{status:'UNCERTAIN',lastCode:'OUTCOME_UNKNOWN',finishedAt:now,claimToken:null}});
  await this.db.emailNotification.updateMany({where:{status:'PENDING',createdAt:{lt:new Date(now.getTime()-7*DAY)}},data:{status:'FAILED',lastCode:'EXPIRED',finishedAt:now}});
 }
 async process(batch=20,now=new Date()){
  if(!Number.isInteger(batch)||batch<1||batch>100)throw Error('Invalid batch');
  await this.maintain(now);
  const counts:Record<string,number>={};
  for(let index=0;index<batch;index++){
   const attemptNow=new Date(Math.max(Date.now(),now.getTime()));
   const token=randomUUID();
   const row=await this.db.$transaction(async tx=>{
    const [candidate]=await tx.$queryRaw<{id:string}[]>`SELECT id FROM "EmailNotification" WHERE status='PENDING' AND "nextAttemptAt"<=${attemptNow} AND attempts<5 ORDER BY "createdAt",id FOR UPDATE SKIP LOCKED LIMIT 1`;
    if(!candidate)return null;
    return tx.emailNotification.update({where:{id:candidate.id},data:{status:'SENDING',claimedAt:attemptNow,claimToken:token,attempts:{increment:1}}});
   });
   if(!row)break;
   const finish=async(status:string,lastCode:string|null,nextAttemptAt=attemptNow)=>{
    const updated=await this.db.emailNotification.updateMany({where:{id:row.id,status:'SENDING',claimToken:token},data:{status,lastCode,nextAttemptAt,finishedAt:status==='PENDING'?null:new Date(Math.max(Date.now(),attemptNow.getTime())),claimToken:null}});
    if(updated.count!==1)throw Error('Notification claim lost; operator inspection required');
    counts[status]=(counts[status]??0)+1;
   };
   // Database failures after claiming deliberately leave SENDING for stale-claim recovery.
   const user=row.userId?await this.db.user.findUnique({where:{id:row.userId},select:{email:true,emailVerifiedAt:true,status:true}}):null;
   if(!user?.emailVerifiedAt||!user.email){await finish('SKIPPED','UNVERIFIED_ADDRESS');continue;}
   if(user.status!=='ACTIVE'){await finish('SKIPPED','ACCOUNT_UNAVAILABLE');continue;}
   if(row.kind==='APPLICATION_ACCEPTED'&&(!row.projectId||!await this.db.project.findFirst({where:{id:row.projectId,visibility:'VISIBLE',deletedAt:null},select:{id:true}}))){await finish('SKIPPED','PROJECT_UNAVAILABLE');continue;}
   const message={...notificationMessage(row.kind,user.email,this.origin,row.projectTitle),messageId:`<notification-${row.id}@${new URL(this.origin).hostname}>`};
   let failure:unknown,failed=false;
   try{await this.send(message);}catch(error){failed=true;failure=error;}
   // A failure persisting SENT must not be mistaken for an SMTP rejection and retried.
   if(!failed){await finish('SENT',null);continue;}
   const classification=classifyMailFailure(failure);
   if(classification==='TEMPORARY'&&row.attempts<NOTIFICATION_MAX_ATTEMPTS){await finish('PENDING','SMTP_TEMPORARY',new Date(attemptNow.getTime()+[60000,300000,1800000,7200000][row.attempts-1]));}
   else await finish(classification==='UNCERTAIN'?'UNCERTAIN':'FAILED',classification==='UNCERTAIN'?'OUTCOME_UNKNOWN':classification==='TEMPORARY'?'ATTEMPTS_EXHAUSTED':'SMTP_REJECTED');
  }
  return counts;
 }
 async status(){return this.db.emailNotification.groupBy({by:['kind','status','lastCode'],_count:true});}
 async inspect(limit=50){if(!Number.isInteger(limit)||limit<1||limit>100)throw Error('Invalid limit');return this.db.emailNotification.findMany({where:{status:{in:['UNCERTAIN','FAILED','SKIPPED']}},select:{id:true,kind:true,status:true,attempts:true,lastCode:true,createdAt:true,finishedAt:true},orderBy:{createdAt:'desc'},take:limit});}
 async prune(batch=100,now=new Date()){
  if(!Number.isInteger(batch)||batch<1||batch>1000)throw Error('Invalid batch');
  await this.maintain(now);
  // No removal of an active claim. Terminal events, including uncertainty, retained at most 30 days when scheduled.
  const rows=await this.db.emailNotification.findMany({where:{status:{in:['SENT','SKIPPED','FAILED','UNCERTAIN']},createdAt:{lt:new Date(now.getTime()-30*DAY)}},select:{id:true},take:batch});
  return this.db.emailNotification.deleteMany({where:{id:{in:rows.map(r=>r.id)},status:{not:'SENDING'}}});
 }
}
export function classifyMailFailure(error:unknown):'TEMPORARY'|'PERMANENT'|'UNCERTAIN'{
 const e=error as {responseCode?:number;code?:string;command?:string}|null,code=e?.responseCode;
 if(typeof code==='number'&&Number.isInteger(code)&&code>=400&&code<500)return'TEMPORARY';
 if(typeof code==='number'&&Number.isInteger(code)&&code>=500&&code<600)return'PERMANENT';
 if(e?.command==='CONN'&&['ECONNECTION','ECONNREFUSED','ESOCKET','EDNS','ETIMEDOUT'].includes(e.code??''))return'TEMPORARY';
 return'UNCERTAIN';
}
