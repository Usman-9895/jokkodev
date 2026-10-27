import fs from 'node:fs/promises';import{createRequire}from'node:module';import{fileURLToPath}from'node:url';import{randomBytes}from'node:crypto';
const require=createRequire(import.meta.url),{createPrismaClient}=require('../backend/dist/src/database/database.service.js'),{PasswordService}=require('../backend/dist/src/modules/auth/passwords.service.js'),{ReputationService}=require('../backend/dist/src/modules/reputation/reputation.service.js');
async function run(){
 const raw=process.env.RETENTION_DATABASE_URL;if(!raw||process.env.RETENTION_FIXTURE_CONFIRM!=='new-empty-local-database'||process.env.NODE_ENV!=='test')throw Error('Dedicated fixture confirmation required');
 const url=new URL(raw);if(url.hostname!=='127.0.0.1'||url.pathname!=='/retention_app')throw Error('Only dedicated local retention_app accepted');
 const db=createPrismaClient(raw);try{
  const [target]=await db.$queryRaw`SELECT current_database() AS name`;if(target.name!=='retention_app'||await db.user.count())throw Error('Fixture requires a fresh dedicated database');
  const destination=fileURLToPath(new URL('../.cache/retention-fixture-accounts.json',import.meta.url));
  try{await fs.access(destination);throw Error('Fixture account file exists');}catch(e){if(e.code!=='ENOENT')throw e;}
  const password=randomBytes(24).toString('base64url'),passwordHash=await new PasswordService().hash(password),now=new Date(),days=n=>new Date(now.getTime()+n*86400000);
  const accounts=await db.$transaction(async tx=>{
   const create=async(name,verified,createdAt=now)=>tx.user.create({data:{email:`${name}@example.test`,username:name,usernameKey:name,passwordHash,createdAt,emailVerifiedAt:verified?now:null,retentionObservedAt:now,profile:{create:{}}}});
   const owner=await create('retention_owner',true),member=await create('retention_member',true),expired=await create('retention_unverified',false,days(-31));
   const q=await tx.question.create({data:{authorId:owner.id,title:'Question fictive éligible à conservation',context:'Contexte fictif à effacer',expected:'Attendu fictif',actual:'Observé fictif',attempts:'Essai fictif',deletedAt:days(-31)}});
   const useful=await tx.question.create({data:{authorId:owner.id,title:'Contribution utile conservée',context:'Contexte public fictif utile',expected:'Attendu',actual:'Observé',attempts:'Essai'}});
   const answer=await tx.answer.create({data:{questionId:useful.id,authorId:member.id,body:'Réponse fictive acceptée par un autre membre.'}});await tx.question.update({where:{id:useful.id},data:{acceptedAnswerId:answer.id}});const rep=new ReputationService({prisma:db});await rep.lockMutation(tx);await rep.syncQuestion(tx,useful.id);
   const p=await tx.project.create({data:{ownerId:owner.id,title:'Projet collaboratif conservé',objective:'Objectif fictif toujours utile'}});await tx.projectMember.create({data:{projectId:p.id,userId:member.id}});
   await tx.application.create({data:{projectId:p.id,applicantId:member.id,message:'Texte privé fictif devenu inutile après six mois.',status:'ACCEPTED',decidedAt:days(-220)}});
   await tx.project.create({data:{ownerId:owner.id,title:'Projet supprimé à traiter',objective:'Ancien objectif fictif',deletedAt:days(-31),recruitmentStatus:'CLOSED'}});
   await tx.session.create({data:{userId:owner.id,tokenHash:randomBytes(32),createdAt:days(-70),lastSeenAt:days(-70),expiresAt:days(-63)}});
   await tx.accountToken.create({data:{userId:owner.id,tokenHash:randomBytes(32),purpose:'EMAIL_VERIFICATION',createdAt:days(-20),expiresAt:days(-19)}});
   return {owner:{email:owner.email,password},member:{email:member.email,password},expiredId:expired.id,erasedQuestionId:q.id};
  });
  await fs.mkdir(fileURLToPath(new URL('../.cache/',import.meta.url)),{recursive:true});await fs.writeFile(destination,JSON.stringify(accounts),{flag:'wx',mode:0o600});console.log(JSON.stringify({result:'dedicated_fixture_created',accounts:3,expectedMemberScore:10}));
 }finally{await db.$disconnect();}
}
run().catch(()=>{console.error('Fixture refusée ou incomplète : vérifier la base locale et les fichiers dédiés, sans publier les comptes.');process.exitCode=1;});
