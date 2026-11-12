import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';
import type {Environment} from '../../config/environment';
import {DatabaseService} from '../../database/database.service';
import type {Prisma} from '../../generated/prisma/client';
import type {AuthContext} from '../../common/auth/auth-context';
import {ApiException} from '../../common/http/api-exception';
import {isUniqueViolation} from '../../common/auth/prisma-errors';
import {RateLimiter} from '../../common/rate-limit/rate-limiter.service';
import {normalizeEmail} from '../users/identity';
import {AuthService} from './auth.service';
import {SessionsService} from './sessions.service';
import {PasswordService} from './passwords.service';
import {hashToken,isTokenFormat,newToken} from './tokens';
import {SESSION_IDLE_MS} from './auth.constants';
import type {GoogleChecks,GoogleClaims} from './google.oidc';
export type ExternalProvider='google'|'github';
export interface ExternalProtocol {authorization(checks:GoogleChecks):Promise<string>;identity(url:URL,checks:GoogleChecks):Promise<GoogleClaims>}
import type {GoogleRegisterDto,GooglePendingDto} from './google.dto';
export const EXTERNAL_TTL_MS=10*60_000;
const userSelect={id:true,avatarKey:true,username:true,email:true,role:true,status:true,emailVerifiedAt:true,passwordHash:true} as const;
type Payload={checks?:GoogleChecks;claims?:GoogleClaims;returnTo:string};
export function externalReturnPath(value:string|undefined):string {
 const allowed=['/espace','/espace/profil','/espace/questions','/espace/projets','/espace/candidatures','/admin','/admin/signalements','/admin/comptes-suspendus','/questions','/questions/poser','/projets','/projets/proposer'];
 if(value&&allowed.includes(value))return value;
 if(value&&/^\/(?:questions|projets)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:\/modifier)?$/i.test(value))return value;
 return '/espace';
}
export class ExternalAuthService {
 private readonly key:Buffer;
 constructor(private readonly env:Environment,private readonly db:DatabaseService,private readonly oidc:ExternalProtocol,private readonly auth:AuthService,private readonly sessions:SessionsService,private readonly passwords:PasswordService,private readonly limiter:RateLimiter,private readonly provider:ExternalProvider){
  this.key=createHash('sha256').update(`jokkodev/${provider}-flow/v1\0`+env.csrfSecret).digest();
 }

 private findFlow(browserHash:Uint8Array<ArrayBuffer>){return this.provider==='google'?this.db.prisma.googleFlow.findUnique({where:{browserHash}}):this.db.prisma.gitHubFlow.findUnique({where:{browserHash}});}
 private deleteFlows(tx:Prisma.TransactionClient,where:{id?:string;browserHash?:Uint8Array<ArrayBuffer>;stateHash?:Uint8Array<ArrayBuffer>;stage?:string;expiresAt?:{gt:Date}}){return this.provider==='google'?tx.googleFlow.deleteMany({where}):tx.gitHubFlow.deleteMany({where});}
 private createFlow(tx:Prisma.TransactionClient,data:Prisma.GoogleFlowUncheckedCreateInput){return this.provider==='google'?tx.googleFlow.create({data}):tx.gitHubFlow.create({data});}
 private findIdentity(sub:string){const args={where:{sub},include:{user:{select:userSelect}}};return this.provider==='google'?this.db.prisma.googleIdentity.findUnique(args):this.db.prisma.gitHubIdentity.findUnique(args);}
 private createIdentity(tx:Prisma.TransactionClient,sub:string,userId:string){return this.provider==='google'?tx.googleIdentity.create({data:{sub,userId}}):tx.gitHubIdentity.create({data:{sub,userId}});}
 private enabled(){if(!this.env[this.provider])throw new ApiException(404,this.provider.toUpperCase()+'_DISABLED',`La connexion ${this.provider==='google'?'Google':'GitHub'} n’est pas disponible.`);}
 private invalid():never{throw new ApiException(400,this.provider.toUpperCase()+'_FLOW_INVALID',`Cette connexion ${this.provider==='google'?'Google':'GitHub'} a expiré ou n’est plus utilisable. Recommence depuis la connexion.`);}
 private seal(data:Payload){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',this.key,iv);const text=Buffer.concat([cipher.update(JSON.stringify(data),'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),text]).toString('base64url');}
 private unseal(value:string):Payload{try{const data=Buffer.from(value,'base64url'),cipher=createDecipheriv('aes-256-gcm',this.key,data.subarray(0,12));cipher.setAuthTag(data.subarray(12,28));return JSON.parse(Buffer.concat([cipher.update(data.subarray(28)),cipher.final()]).toString()) as Payload;}catch{return this.invalid();}}
 async start(oldBrowser:string|undefined,returnTo:string|undefined,context:AuthContext|undefined,ip:string){
  this.enabled();this.limiter.consume(this.provider+':start:'+ip,20,15*60_000);
  const browser=newToken(),state=newToken().token,checks={state,nonce:newToken().token,verifier:newToken().token};
  const authorizationUrl=await this.oidc.authorization(checks);
  await this.db.prisma.$transaction(async tx=>{
   if(isTokenFormat(oldBrowser))await this.deleteFlows(tx,{browserHash:hashToken(oldBrowser)});
   await this.createFlow(tx,{browserHash:browser.hash,stateHash:hashToken(state),stage:'AUTHORIZATION',payload:this.seal({checks,returnTo:externalReturnPath(returnTo)}),sessionId:context?.sessionId??null,expiresAt:new Date(Date.now()+EXTERNAL_TTL_MS)});
  });
  return {browserToken:browser.token,authorizationUrl};
 }
 async callback(browserToken:string|undefined,url:URL,context:AuthContext|undefined){
  this.enabled();if(!isTokenFormat(browserToken))return this.invalid();
  const state=url.searchParams.get('state');if(!isTokenFormat(state)||url.searchParams.getAll('state').length!==1)return this.invalid();
  const flow=await this.findFlow(hashToken(browserToken));
  if(!flow||flow.stage!=='AUTHORIZATION'||flow.expiresAt.getTime()<=Date.now()||flow.sessionId!==(context?.sessionId??null))return this.invalid();
  const payload=this.unseal(flow.payload);
  if(!payload.checks||payload.checks.state!==state)return this.invalid();
  // Consume before code exchange, even on cancellation or provider failure. No callback replay.
  const consumed=await this.deleteFlows(this.db.prisma,{id:flow.id,browserHash:hashToken(browserToken),stateHash:hashToken(state),expiresAt:{gt:new Date()}});
  if(consumed.count!==1)return this.invalid();
  if(url.searchParams.get('error')==='access_denied')throw new ApiException(400,this.provider.toUpperCase()+'_DENIED',`Tu as annulé la connexion ${this.provider==='google'?'Google':'GitHub'}.`);
  const claims=await this.oidc.identity(url,payload.checks);claims.email=normalizeEmail(claims.email);
  const identity=await this.findIdentity(claims.sub);
  if(identity){
   if(identity.user.status!=='ACTIVE')throw new ApiException(403,'ACCOUNT_SUSPENDED','Ce compte est suspendu.');
   const sessionToken=await this.db.prisma.$transaction(async tx=>{
    const token=await this.sessions.create(identity.userId,tx);
    if(context)await tx.session.updateMany({where:{id:context.sessionId,revokedAt:null},data:{revokedAt:new Date()}});
    return token;
   });
   return {kind:'connected' as const,sessionToken,returnTo:payload.returnTo};
  }
  const browser=newToken();
  await this.createFlow(this.db.prisma,{browserHash:browser.hash,stage:'PENDING',payload:this.seal({claims,returnTo:payload.returnTo}),expiresAt:new Date(Date.now()+EXTERNAL_TTL_MS)});
  return {kind:'pending' as const,browserToken:browser.token};
 }
 private async pending(token:string|undefined){
  this.enabled();if(!isTokenFormat(token))return this.invalid();
  const flow=await this.findFlow(hashToken(token));
  if(!flow||flow.stage!=='PENDING'||flow.expiresAt.getTime()<=Date.now())return this.invalid();
  const payload=this.unseal(flow.payload);if(!payload.claims)return this.invalid();
  return {flow,claims:payload.claims};
 }
 async status(token:string|undefined):Promise<GooglePendingDto>{
  const {claims}=await this.pending(token);
  const user=await this.db.prisma.user.findUnique({where:{email:claims.email},select:{id:true}});
  return {kind:user?'link':'register',email:claims.email};
 }
 private async consume(tx:Prisma.TransactionClient,id:string){
  const done=await this.deleteFlows(tx,{id,stage:'PENDING',expiresAt:{gt:new Date()}});
  if(done.count!==1)return this.invalid();
 }
 async register(token:string|undefined,input:GoogleRegisterDto,ip:string,context?:AuthContext){
  const {flow,claims}=await this.pending(token);
  try{return await this.auth.register({...input,email:claims.email},ip,async(tx,userId)=>{
   await this.consume(tx,flow.id);
   await this.createIdentity(tx,claims.sub,userId);
   if(context)await tx.session.updateMany({where:{id:context.sessionId,revokedAt:null},data:{revokedAt:new Date()}});
  });}catch(error){if(isUniqueViolation(error))throw new ApiException(409,this.provider.toUpperCase()+'_ALREADY_LINKED',`Ce compte ${this.provider==='google'?'Google':'GitHub'} est déjà lié. Recommence la connexion ${this.provider==='google'?'Google':'GitHub'}.`);throw error;}
 }
 async link(token:string|undefined,password:string,context:AuthContext,ip:string){
  const {flow,claims}=await this.pending(token);
  this.limiter.consume(this.provider+':link:'+context.user.id+':'+ip,5,15*60_000);
  const user=await this.db.prisma.user.findUnique({where:{id:context.user.id},select:userSelect});
  if(!user||user.email!==claims.email||!user.emailVerifiedAt)throw new ApiException(403,this.provider.toUpperCase()+'_ACCOUNT_CONTROL_REQUIRED',`Connecte-toi au compte JokkoDev correspondant et vérifie son adresse avant de lier ${this.provider==='google'?'Google':'GitHub'}.`);
  if(!await this.passwords.verify(user.passwordHash,password))throw new ApiException(401,'INVALID_CREDENTIALS','Mot de passe JokkoDev incorrect.');
  try{return await this.db.prisma.$transaction(async tx=>{
   await tx.$queryRaw`SELECT id FROM "User" WHERE id=${user.id}::uuid FOR UPDATE`;
   const current=await tx.user.findUniqueOrThrow({where:{id:user.id},select:userSelect});
   const session=await tx.session.findFirst({where:{id:context.sessionId,userId:user.id,revokedAt:null,expiresAt:{gt:new Date()},lastSeenAt:{gt:new Date(Date.now()-SESSION_IDLE_MS)}}});
   if(!session||current.passwordHash!==user.passwordHash||current.email!==claims.email||!current.emailVerifiedAt||current.status!=='ACTIVE')throw new ApiException(401,'UNAUTHORIZED','Le contrôle du compte doit être renouvelé.');
   await this.consume(tx,flow.id);
   await this.createIdentity(tx,claims.sub,user.id);
   const sessionToken=await this.sessions.create(user.id,tx);
   await tx.session.update({where:{id:context.sessionId},data:{revokedAt:new Date()}});
   return {user:current,sessionToken};
  });}catch(error){if(isUniqueViolation(error))throw new ApiException(409,this.provider.toUpperCase()+'_ALREADY_LINKED',`Cette identité ou ce compte possède déjà une liaison ${this.provider==='google'?'Google':'GitHub'}.`);throw error;}
 }
 async cancel(token:string|undefined){if(this.env[this.provider]&&isTokenFormat(token))await this.deleteFlows(this.db.prisma,{browserHash:hashToken(token)});}
}
