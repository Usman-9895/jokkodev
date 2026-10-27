import { Prisma, type PrismaClient } from '../../generated/prisma/client';
import { ReputationService } from '../reputation/reputation.service';
import type { DatabaseService } from '../../database/database.service';
import { RETENTION as R, days, inactivityDue, ERASED_MESSAGE } from './policy';
import {SESSION_IDLE_MS} from '../auth/auth.constants';

export const CATEGORIES=['SESSION','TOKEN','APPLICATION','REPORT','QUESTION','PROJECT','UNVERIFIED','INACTIVITY'] as const;
export type Category=typeof CATEGORIES[number];
export const RETENTION_LOCK=260007;
interface Count { eligible:number; planned:number; changed:number; manual:number; reasons:Record<string,number> }
export interface RetentionResult { mode:'simulate'|'execute'; at:string; busy:boolean; truncated:boolean; categories:Record<Category,Count>; holds:number; overdueHolds:number }
type Sender=(message:{to:string;subject:string;text:string})=>Promise<void>;

/** Explicit maintenance only. Never registered as an application startup job. */
export class RetentionService {
 constructor(private readonly db:PrismaClient,private readonly clock:()=>Date=()=>new Date()){}

 async run(execute=false,batch:number=R.batch,categories:readonly Category[]=CATEGORIES):Promise<RetentionResult>{
  if(!Number.isInteger(batch)||batch<1||batch>R.maxBatch)throw Error('Invalid retention batch');
  if(!categories.length||categories.some(c=>!CATEGORIES.includes(c)))throw Error('Invalid retention categories');
  const now=this.clock();if(!Number.isFinite(now.getTime()))throw Error('Invalid clock');
  const out:RetentionResult={mode:execute?'execute':'simulate',at:now.toISOString(),busy:false,truncated:false,categories:Object.fromEntries(CATEGORIES.map(c=>[c,{eligible:0,planned:0,changed:0,manual:0,reasons:{}}])) as Record<Category,Count>,holds:0,overdueHolds:0};
  const started=Date.now();
  // Outer connection holds only the maintenance lease; row locks never leak from one entity to another.
  // This avoids User -> child vs Project/Report -> User lock inversions with normal application transactions.
  return this.db.$transaction(async lease=>{
   if(!execute)await lease.$executeRaw`SET TRANSACTION READ ONLY`;
   const [gate]=await lease.$queryRaw<{ok:boolean}[]>`SELECT pg_try_advisory_xact_lock(${RETENTION_LOCK}::int,0) AS ok`;
   if(!gate.ok){out.busy=true;return out;}
   out.holds=await lease.retentionHold.count({where:{untilAt:{gt:now}}});
   out.overdueHolds=await lease.retentionHold.count({where:{untilAt:{gt:now},reviewAt:{lte:now}}});
   const cutoff=days(now,-R.sessionDays),tokenCutoff=days(now,-R.tokenDays);
   const inactivityBasis=Prisma.sql`COALESCE(t."lastLoginAt",t."retentionObservedAt")`;
   const inactivityDeadline=Prisma.sql`((${inactivityBasis} AT TIME ZONE 'UTC' + ${R.inactiveMonths} * interval '1 month') AT TIME ZONE 'UTC')`;
   // Waiting notices must not consume the bounded selection forever. notify handles QUEUED separately.
   const actionableInactivity=Prisma.sql`NOT EXISTS (SELECT 1 FROM "InactivityNotice" n
    WHERE n."userId"=t.id AND n."basisAt"=${inactivityBasis}
     AND (n.state='QUEUED' OR (n.state='SENT' AND n."sentAt" IS NOT NULL
      AND (${inactivityDeadline}>${now} OR n."dueAt">${now} OR n."sentAt" + ${R.noticeDays} * interval '1 day'>${now}))))`;
   const definitions:{category:Category;table:string;where:Prisma.Sql}[]=[
    {category:'SESSION',table:'Session',where:Prisma.sql`LEAST(t."expiresAt", t."lastSeenAt" + ${SESSION_IDLE_MS} * interval '1 millisecond', t."revokedAt") <= ${cutoff}`},
    {category:'TOKEN',table:'AccountToken',where:Prisma.sql`LEAST(t."expiresAt",t."consumedAt") <= ${tokenCutoff}`},
    {category:'APPLICATION',table:'Application',where:Prisma.sql`t.status <> 'PENDING' AND t."messageErasedAt" IS NULL AND (t."decidedAt" AT TIME ZONE 'UTC' + ${R.applicationMonths} * interval '1 month') AT TIME ZONE 'UTC' <= ${now}`},
    {category:'REPORT',table:'Report',where:Prisma.sql`t.status='CLOSED' AND (t."closedAt" AT TIME ZONE 'UTC' + ${R.reportMonths} * interval '1 month') AT TIME ZONE 'UTC' <= ${now}`},
    {category:'QUESTION',table:'Question',where:Prisma.sql`t."retentionErasedAt" IS NULL AND t."deletedAt" <= ${days(now,-R.deletedDays)}`},
    {category:'PROJECT',table:'Project',where:Prisma.sql`t."retentionErasedAt" IS NULL AND t."deletedAt" <= ${days(now,-R.deletedDays)}`},
    {category:'UNVERIFIED',table:'User',where:Prisma.sql`t."emailVerifiedAt" IS NULL AND t."createdAt" <= ${days(now,-R.unverifiedDays)}`},
    {category:'INACTIVITY',table:'User',where:Prisma.sql`t."emailVerifiedAt" IS NOT NULL AND t.status='ACTIVE' AND ${inactivityDeadline} - ${R.noticeDays} * interval '1 day' <= ${now} AND ${actionableInactivity}`}
   ];
   const reputation=new ReputationService({prisma:this.db} as DatabaseService);
   for(const {category,table,where}of definitions){
    if(!categories.includes(category))continue;
    const rows=await lease.$queryRaw<{id:string}[]>(Prisma.sql`SELECT t.id FROM ${Prisma.raw('"'+table+'"')} t WHERE ${where}
      AND NOT EXISTS (SELECT 1 FROM "RetentionHold" h WHERE h.category=${category} AND h."entityId"=t.id AND h."untilAt">${now})
      AND NOT EXISTS (SELECT 1 FROM "RetentionReview" r WHERE r.category=${category} AND r."entityId"=t.id AND r."reviewAt">${now})
      ORDER BY t.id LIMIT ${batch+1}`);
    if(rows.length>batch)out.truncated=true;
    for(const {id}of rows.slice(0,batch)){
     if(Date.now()-started>45000){out.truncated=true;return out;}
     const processEntity=async(tx:Prisma.TransactionClient)=>{
     if(execute){
      if(category==='QUESTION'||category==='REPORT')await reputation.lockMutation(tx);
      const current=await tx.$queryRaw<{id:string}[]>(Prisma.sql`SELECT t.id FROM ${Prisma.raw('"'+table+'"')} t WHERE t.id=${id}::uuid AND ${where}
       AND NOT EXISTS (SELECT 1 FROM "RetentionHold" h WHERE h.category=${category} AND h."entityId"=t.id AND h."untilAt">${now})
       AND NOT EXISTS (SELECT 1 FROM "RetentionReview" r WHERE r.category=${category} AND r."entityId"=t.id AND r."reviewAt">${now}) FOR UPDATE OF t SKIP LOCKED`);
      if(!current.length)return;
     }
     const count=out.categories[category];count.eligible++;
     const review=async(reason:string)=>{count.manual++;count.reasons[reason]=(count.reasons[reason]??0)+1;if(execute)await tx.retentionReview.upsert({where:{category_entityId:{category,entityId:id}},create:{category,entityId:id,reason,reviewAt:days(now,R.reviewDays)},update:{reason,reviewAt:days(now,R.reviewDays)}});};
     let action='ERASE';
     if(category==='SESSION'){if(execute)await tx.session.delete({where:{id}});}
     else if(category==='TOKEN'){if(execute)await tx.accountToken.delete({where:{id}});}
     else if(category==='APPLICATION'){if(execute)await tx.application.update({where:{id},data:{message:ERASED_MESSAGE,messageErasedAt:now}});}
     else if(category==='REPORT'){
      const r=await tx.report.findUniqueOrThrow({where:{id},include:{moderations:{select:{decision:true},take:R.maxBatch+1},question:{select:{authorId:true}},answer:{select:{authorId:true}},project:{select:{ownerId:true}}}});
      if(execute){
       if(r.projectId)await tx.$queryRaw`SELECT id FROM "Project" WHERE id=${r.projectId}::uuid FOR UPDATE`;
       else{const qid=r.questionId??(await tx.answer.findUniqueOrThrow({where:{id:r.answerId!},select:{questionId:true}})).questionId;await tx.$queryRaw`SELECT id FROM "Question" WHERE id=${qid}::uuid FOR UPDATE`;}
      }
      const authorId=r.question?.authorId??r.answer?.authorId??r.project?.ownerId;
      if(execute&&authorId)await tx.$queryRaw`SELECT id FROM "User" WHERE id=${authorId}::uuid FOR SHARE`;
      const author=authorId?await tx.user.findUnique({where:{id:authorId},select:{status:true}}):null;
      const target=[...(r.questionId?[{questionId:r.questionId}]:[]),...(r.answerId?[{answerId:r.answerId}]:[]),...(r.projectId?[{projectId:r.projectId}]:[])];
      const sanctions=await tx.moderationAction.count({where:{decision:{not:'NO_ACTION'},OR:[...target,...(authorId?[{targetUserId:authorId}]:[])]}});
      const open=await tx.report.count({where:{status:'OPEN',OR:target}});
      if(r.decision!=='NO_ACTION'||sanctions||open||author?.status!=='ACTIVE'||r.moderations.length>R.maxBatch||r.moderations.some(a=>a.decision!=='NO_ACTION')){await review('SANCTION_OR_HISTORY');return;}
      if(execute){await tx.moderationAction.deleteMany({where:{reportId:id,decision:'NO_ACTION'}});await tx.report.delete({where:{id}});}
     }
     else if(category==='QUESTION'){
      const q=await tx.question.findUniqueOrThrow({where:{id},include:{_count:{select:{reports:true,moderations:true,answers:true}}}});
      if(execute)await tx.$queryRaw`SELECT id FROM "User" WHERE id=${q.authorId}::uuid FOR SHARE`;
      const author=await tx.user.findUniqueOrThrow({where:{id:q.authorId},select:{status:true}});
      const dependent=await tx.answer.findFirst({where:{questionId:id,OR:[{authorId:{not:q.authorId}},{reports:{some:{}}},{moderations:{some:{}}}]},select:{id:true}});
      if(author.status!=='ACTIVE'||q._count.reports||q._count.moderations||dependent){await review('THIRD_PARTY_OR_MODERATION');return;}
      if(q._count.answers>R.maxBatch){await review('CONTENT_VOLUME');return;}
      if(execute){await tx.question.update({where:{id},data:{title:'Question supprimée',context:'Contenu effacé après suppression.',expected:'Contenu effacé.',actual:'Contenu effacé.',attempts:'Contenu effacé.',code:null,codeLanguage:null,acceptedAnswerId:null,retentionErasedAt:now}});await reputation.syncQuestion(tx,id,'QUESTION_DELETED');await tx.answer.updateMany({where:{questionId:id},data:{body:'Réponse retirée avec la question supprimée.',code:null,codeLanguage:null}});await tx.questionTechnology.deleteMany({where:{questionId:id}});}
     }
     else if(category==='PROJECT'){
      const p=await tx.project.findUniqueOrThrow({where:{id},include:{_count:{select:{applications:true,reports:true,moderations:true}}}});
      if(execute)await tx.$queryRaw`SELECT id FROM "User" WHERE id=${p.ownerId}::uuid FOR SHARE`;
      const owner=await tx.user.findUniqueOrThrow({where:{id:p.ownerId},select:{status:true}});
      const member=await tx.projectMember.findFirst({where:{projectId:id,userId:{not:p.ownerId}},select:{userId:true}});
      if(owner.status!=='ACTIVE'||p._count.applications||p._count.reports||p._count.moderations||member){await review('COLLABORATORS_OR_HISTORY');return;}
      if(execute){await tx.project.update({where:{id},data:{title:'Projet supprimé',objective:'Contenu effacé après suppression.',availability:null,recruitmentStatus:'CLOSED',retentionErasedAt:now}});await tx.projectTechnology.deleteMany({where:{projectId:id}});}
     }
     else {
      const u=await tx.user.findUniqueOrThrow({where:{id},select:{id:true,role:true,status:true,lastLoginAt:true,retentionObservedAt:true,avatarKey:true,_count:true}});
      if(u.role==='ADMIN'){await review('ADMIN_MANUAL_REVIEW');return;}
      if(u.status!=='ACTIVE'){await review('ACTIVE_SANCTION');return;}
      if(category==='INACTIVITY'){
       const basis=u.lastLoginAt??u.retentionObservedAt,due=inactivityDue(basis);
       const notice=await tx.inactivityNotice.findUnique({where:{userId_basisAt:{userId:id,basisAt:basis}}});
       if(!notice){if(execute)await tx.inactivityNotice.create({data:{userId:id,basisAt:basis,dueAt:due}});action='NOTICE_QUEUED';}
       else if(notice.state==='CANCELLED'){if(execute)await tx.inactivityNotice.update({where:{id:notice.id},data:{state:'QUEUED'}});action='NOTICE_QUEUED';}
       else if(notice.state!=='SENT'){if(['UNCERTAIN','SENDING'].includes(notice.state))await review('NOTICE_UNCERTAIN');return;}
       else if(!notice.sentAt){await review('NOTICE_UNCERTAIN');return;}
       else if(now<due||now<notice.dueAt||now<days(notice.sentAt,R.noticeDays)){return;}
      }
      if(action!=='NOTICE_QUEUED'){
       const dependencies=Object.entries(u._count).some(([key,n])=>!['profile','sessions','accountTokens','inactivityNotices'].includes(key)&&n>0);
       if(dependencies||u.avatarKey){await review('ACCOUNT_DEPENDENCIES');return;}
       if(execute)await tx.user.delete({where:{id}});action='ACCOUNT_ERASED';
      }
     }
     count.planned++;
     if(execute){await tx.retentionEvent.create({data:{category,entityId:id,action,at:now}});await tx.retentionReview.deleteMany({where:{category,entityId:id}});count.changed++;}
     };
     if(execute)await this.db.$transaction(processEntity,{timeout:10000,maxWait:3000});else await processEntity(lease);
    }
   }
   return out;
  },{timeout:70000,maxWait:5000});
 }

 /** No send during simulation/run. A persisted claim prevents automatic duplicate delivery after a crash. */
 async notify(sender:Sender,batch:number=R.batch):Promise<{sent:number;uncertain:number;cancelled:number}>{
  if(!Number.isInteger(batch)||batch<1||batch>R.maxBatch)throw Error('Invalid notice batch');
  const result={sent:0,uncertain:0,cancelled:0};
  for(let i=0;i<batch;i++){
   const claimed=await this.db.$transaction(async tx=>{
    const [gate]=await tx.$queryRaw<{ok:boolean}[]>`SELECT pg_try_advisory_xact_lock(${RETENTION_LOCK}::int,0) AS ok`;
    if(!gate.ok)return null;
    const [n]=await tx.$queryRaw<{id:string;userId:string}[]>`SELECT id,"userId" FROM "InactivityNotice" WHERE state='QUEUED' ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED`;
    if(!n)return null;await tx.inactivityNotice.update({where:{id:n.id},data:{state:'SENDING'}});return n;
   });if(!claimed)break;
   try{
    const outcome=await this.db.$transaction(async tx=>{
     await tx.$queryRaw`SELECT id FROM "User" WHERE id=${claimed.userId}::uuid FOR UPDATE`;
     const user=await tx.user.findUnique({where:{id:claimed.userId},select:{id:true,email:true,emailVerifiedAt:true,status:true,role:true,lastLoginAt:true,retentionObservedAt:true}}),n=await tx.inactivityNotice.findUnique({where:{id:claimed.id}});
     if(!user||!n)return 'cancelled';
     const hold=await tx.retentionHold.count({where:{category:'INACTIVITY',entityId:user.id,untilAt:{gt:this.clock()}}});
     if(n.state!=='SENDING'||hold||!user.emailVerifiedAt||user.status!=='ACTIVE'||user.role==='ADMIN'||(user.lastLoginAt??user.retentionObservedAt).getTime()!==n.basisAt.getTime()){
      if(n.state==='SENDING')await tx.inactivityNotice.update({where:{id:n.id},data:{state:'CANCELLED'}});return 'cancelled';
     }
     const now=this.clock(),due=new Date(Math.max(n.dueAt.getTime(),days(now,R.noticeDays).getTime()));
     await sender({to:user.email,subject:'JokkoDev : préavis d’inactivité',text:`Sans nouvelle connexion, ton compte arrivera à l’échéance d’inactivité le ${due.toISOString().slice(0,10)}. Connecte-toi depuis l’adresse habituelle du site pour annuler ce préavis. Les contributions et droits des tiers peuvent nécessiter une revue manuelle avant clôture.`});
     await tx.inactivityNotice.update({where:{id:n.id},data:{state:'SENT',sentAt:this.clock(),dueAt:due}});return 'sent';
    },{timeout:30000});
    if(outcome==='sent')result.sent++;else result.cancelled++;
   }catch{result.uncertain++;await this.db.inactivityNotice.updateMany({where:{id:claimed.id,state:'SENDING'},data:{state:'UNCERTAIN'}});}
  }return result;
 }
}
