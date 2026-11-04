import type {HelpSchemas,QuestionDraft} from './api';
import {DraftStorageError,DRAFT_MAX_BYTES,localQuestionTransaction,validateLocalDraft,DRAFT_TTL} from './local-draft.ts';
import {questionPayload} from './api.ts';
export const PENDING_RETRY_MS=7*24*60*60*1000;
export type PendingState='pending'|'sending'|'uncertain'|'confirmed'|'expired';
export type PendingPublication={schema:1;ownerId:string;version:string;key:string;queuedAt:number;expiresAt:number;state:PendingState;attempted:boolean;
 payload?:HelpSchemas['CreateQuestionDto'];sourceDraftVersion:string|null;questionId?:string;confirmedAt?:string};
const keyPattern=/^jdq1\.([0-9]{13})\.[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function validatePending(value:unknown,ownerId:string,now=Date.now()):PendingPublication{
 if(!value||typeof value!=='object')throw new DraftStorageError('invalid');const r=value as PendingPublication;
 if(r.schema!==1||r.ownerId!==ownerId||typeof r.key!=='string'||!keyPattern.test(r.key)||Number(keyPattern.exec(r.key)?.[1])!==r.queuedAt||
 !Number.isSafeInteger(r.queuedAt)||r.queuedAt>now||r.expiresAt!==r.queuedAt+PENDING_RETRY_MS||!r.version||typeof r.version!=='string'||r.version.length>80||typeof r.attempted!=='boolean'||
 !['pending','sending','uncertain','confirmed','expired'].includes(r.state)||!(r.sourceDraftVersion===null||typeof r.sourceDraftVersion==='string'&&r.sourceDraftVersion.length<=80)||
 Object.keys(r).some(k=>!['schema','ownerId','version','key','queuedAt','expiresAt','state','attempted','payload','sourceDraftVersion','questionId','confirmedAt'].includes(k)))throw new DraftStorageError('invalid');
 if(r.state!=='expired'&&(r.state!=='confirmed'||r.payload))validateLocalDraft({schema:1,ownerId,version:r.version,createdAt:r.queuedAt,savedAt:r.queuedAt,expiresAt:r.queuedAt+DRAFT_TTL,fields:{...r.payload,code:r.payload?.code??'',codeLanguage:r.payload?.codeLanguage??''},uncertain:false},ownerId,now);
 if(r.state==='expired'&&r.payload||['sending','uncertain','confirmed'].includes(r.state)&&!r.attempted)throw new DraftStorageError('invalid');
 if(r.state==='confirmed'){
  if(!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(r.questionId??'')||!Number.isFinite(Date.parse(r.confirmedAt??'')))throw new DraftStorageError('invalid');
 }else if(r.questionId!==undefined||r.confirmedAt!==undefined)throw new DraftStorageError('invalid');
 if(new TextEncoder().encode(JSON.stringify(r)).byteLength>DRAFT_MAX_BYTES)throw new DraftStorageError('large');return r;
}
export function pendingPayload(p:PendingPublication):HelpSchemas['PendingQuestionPublicationDto']{
 if(!p.payload)throw new DraftStorageError('invalid');return {idempotencyKey:p.key,question:p.payload};
}
function current(value:unknown,owner:string){return value===undefined?null:validatePending(value,owner);}
export function readPending(owner:string,permit:()=>boolean,now=Date.now()){
 return localQuestionTransaction('pending',owner,permit,(value,store)=>{
  if(value===undefined)return null;let r=validatePending(value,owner,now);
  if(now>=r.expiresAt&&r.payload){
   r={...r,state:r.state==='confirmed'?'confirmed':'expired',version:crypto.randomUUID()};delete r.payload;store.put(r);
  }else if(r.state==='sending'){r={...r,state:'uncertain',version:crypto.randomUUID()};store.put(r);}
  return r;
 });
}
export function enqueueQuestion(owner:string,fields:QuestionDraft,sourceDraftVersion:string|null,permit:()=>boolean,now=Date.now()){
 return localQuestionTransaction('pending',owner,permit,(value,store)=>{
  if(value!==undefined)throw new DraftStorageError('conflict');
  const r=validatePending({schema:1,ownerId:owner,version:crypto.randomUUID(),key:`jdq1.${now}.${crypto.randomUUID()}`,queuedAt:now,expiresAt:now+PENDING_RETRY_MS,state:'pending',attempted:false,payload:structuredClone(questionPayload(fields)),sourceDraftVersion},owner,now);
  store.add(r);return r;
 });
}
export function updatePending(owner:string,version:string,state:PendingState,permit:()=>boolean,confirmation?:HelpSchemas['QuestionPublicationResultDto']){
 return localQuestionTransaction('pending',owner,permit,(value,store)=>{
  const r=current(value,owner);if(!r||r.version!==version)throw new DraftStorageError('conflict');
  const next:PendingPublication={...r,state,version:crypto.randomUUID(),attempted:r.attempted||state==='sending',...(confirmation?{questionId:confirmation.questionId,confirmedAt:confirmation.confirmedAt}:{})};
  if(state==='expired')delete next.payload;
  validatePending(next,owner);store.put(next);return next;
 });
}
export function discardPending(owner:string,version:string,permit:()=>boolean){
 return localQuestionTransaction('pending',owner,permit,(value,store)=>{const r=current(value,owner);if(!r||r.version!==version)throw new DraftStorageError('conflict');store.delete(owner);});
}
