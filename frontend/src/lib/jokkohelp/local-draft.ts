import type {QuestionDraft} from './api';

export const DRAFT_TTL = 7 * 24 * 60 * 60 * 1000;
export const DRAFT_MAX_BYTES = 256 * 1024;
export const DRAFT_DATABASE = 'jokkodev-question-drafts-v1';
export type LocalQuestionDraft = {
 schema:1; ownerId:string; version:string; createdAt:number; savedAt:number; expiresAt:number;
 fields:QuestionDraft; uncertain:boolean;
};
export class DraftStorageError extends Error {
 readonly kind:'unavailable'|'invalid'|'large'|'conflict'|'identity';
 constructor(kind:DraftStorageError['kind']){super(kind);this.kind=kind;}
}
const strings=['title','context','expected','actual','attempts','code','codeLanguage'] as const;
export function validateLocalDraft(value:unknown,ownerId:string,now:number):LocalQuestionDraft {
 if(!value||typeof value!=='object')throw new DraftStorageError('invalid');
 const r=value as LocalQuestionDraft;
 if(r.schema!==1||r.ownerId!==ownerId||!r.version||typeof r.version!=='string'||r.version.length>80||
    !Number.isSafeInteger(r.createdAt)||!Number.isSafeInteger(r.savedAt)||!Number.isSafeInteger(r.expiresAt)||
    r.createdAt>r.savedAt||r.savedAt>now||r.expiresAt!==r.savedAt+DRAFT_TTL||typeof r.uncertain!=='boolean'||
    !r.fields||strings.some(k=>typeof r.fields[k]!=='string')||!Array.isArray(r.fields.technologyIds)||
    r.fields.technologyIds.length>5||r.fields.technologyIds.some(t=>typeof t!=='string'||t.length>128)||
    Object.keys(r.fields).some(k=>![...strings,'technologyIds'].includes(k))||
    Object.keys(r).some(k=>!['schema','ownerId','version','createdAt','savedAt','expiresAt','fields','uncertain'].includes(k)))throw new DraftStorageError('invalid');
 if(new TextEncoder().encode(JSON.stringify(r)).byteLength>DRAFT_MAX_BYTES)throw new DraftStorageError('large');
 return r;
}
/** No content is read until the caller grants access to this verified owner.
 * Each operation uses a read/write transaction: version checks and deletion are atomic across tabs. */
export async function draftTransaction<T>(ownerId:string,permit:()=>boolean,work:(current:unknown,store:IDBObjectStore)=>T):Promise<T>{
 const guard=()=>{if(!ownerId||ownerId.length>128||!permit())throw new DraftStorageError('identity');};guard();
 return new Promise<T>((resolve,reject)=>{
  let request:IDBOpenDBRequest,finished=false;
  const fail=(e:unknown)=>{if(!finished){finished=true;reject(e instanceof DraftStorageError?e:new DraftStorageError('unavailable'));}};
  try{request=indexedDB.open(DRAFT_DATABASE,2);}catch(e){fail(e);return;}
  request.onupgradeneeded=()=>{
   const store=request.result.objectStoreNames.contains('drafts')?request.transaction!.objectStore('drafts'):request.result.createObjectStore('drafts',{keyPath:'ownerId'});
   if(!store.indexNames.contains('expiresAt'))store.createIndex('expiresAt','expiresAt');
  };
  request.onerror=()=>fail(request.error);request.onblocked=()=>fail(null);
  request.onsuccess=()=>{
   const db=request.result;if(finished){db.close();return;}
   let tx:IDBTransaction,result:T;
   try{guard();tx=db.transaction('drafts','readwrite');const store=tx.objectStore('drafts'),read=store.get(ownerId);
    tx.oncomplete=()=>{db.close();try{guard();if(!finished){finished=true;resolve(result);}}catch(e){fail(e);}};
    tx.onabort=tx.onerror=()=>{db.close();fail(tx.error);};
    read.onsuccess=()=>{try{guard();result=work(read.result,store);}catch(e){fail(e);tx.abort();}};
   }catch(e){db.close();fail(e);}
  };
 });
}
export function readLocalDraft(ownerId:string,permit:()=>boolean,now=Date.now()){
 return draftTransaction(ownerId,permit,(value,store)=>{
  // Key-only expiry index: never read another account's fields while cleaning.
  const expired=store.index('expiresAt').openKeyCursor(IDBKeyRange.upperBound(now));
  expired.onsuccess=()=>{const cursor=expired.result;if(cursor){store.delete(cursor.primaryKey);cursor.continue();}};
  if(value===undefined)return null;const r=validateLocalDraft(value,ownerId,now);if(r.expiresAt<=now){store.delete(ownerId);return null;}return r;
 });
}
export function saveLocalDraft(ownerId:string,fields:QuestionDraft,expectedVersion:string|null,uncertain:boolean,permit:()=>boolean,now=Date.now()){
 return draftTransaction(ownerId,permit,(value,store)=>{
  const previous=value===undefined?null:validateLocalDraft(value,ownerId,now);
  if(previous?.version!==expectedVersion&&!(previous===null&&expectedVersion===null))throw new DraftStorageError('conflict');
  const next=validateLocalDraft({schema:1,ownerId,version:crypto.randomUUID(),createdAt:previous?.createdAt??now,savedAt:now,expiresAt:now+DRAFT_TTL,fields,uncertain},ownerId,now);
  store.put(next);return next;
 });
}
export function removeLocalDraft(ownerId:string,version:string,permit:()=>boolean){
 return draftTransaction(ownerId,permit,(value,store)=>{if(value===undefined)return false;if((value as LocalQuestionDraft).version!==version)throw new DraftStorageError('conflict');store.delete(ownerId);return true;});
}
export function markDraftUncertain(ownerId:string,version:string,permit:()=>boolean){
 return draftTransaction(ownerId,permit,(value,store)=>{if(value===undefined||(value as LocalQuestionDraft).version!==version)return;store.put({...value as LocalQuestionDraft,uncertain:true});});
}
