import test from 'node:test';
import assert from 'node:assert/strict';
import {DRAFT_TTL,DRAFT_MAX_BYTES,validateLocalDraft,readLocalDraft} from '../frontend/src/lib/jokkohelp/local-draft.ts';
const now=Date.UTC(2026,10,4,12),fields={title:'',context:'',expected:'',actual:'',attempts:'',code:'',codeLanguage:'',technologyIds:[]};
const record=()=>({schema:1,ownerId:'owner-a',version:'fixture-version',createdAt:now,savedAt:now,expiresAt:now+DRAFT_TTL,fields:{...fields},uncertain:false});
test('local drafts accept incomplete form fields with a seven-day UTC deadline',()=>{
 assert.equal(DRAFT_TTL,604800000);assert.equal(new Date(record().expiresAt).toISOString(),'2026-11-11T12:00:00.000Z');
 assert.equal(validateLocalDraft(record(),'owner-a',now).fields.title,'');
});
test('local drafts reject wrong identity, extra private fields and malformed schema',()=>{
 for(const r of [{...record(),ownerId:'owner-b'},{...record(),email:'private@example.test'},{...record(),fields:{...fields,password:'fictional'}},{...record(),fields:{...fields,technologyIds:['x',null]}},{...record(),schema:2}])assert.throws(()=>validateLocalDraft(r,'owner-a',now));
});
test('deadline is derived only from save time, future or malformed timestamps fail closed',()=>{
 for(const r of [{...record(),savedAt:now+1},{...record(),createdAt:now+1},{...record(),expiresAt:now+DRAFT_TTL+1},{...record(),createdAt:NaN}])assert.throws(()=>validateLocalDraft(r,'owner-a',now));
});
test('UTF-8 payload size is bounded without truncating entered text',()=>{
 const large={...record(),fields:{...fields,context:'🔐'.repeat(DRAFT_MAX_BYTES/4)}};assert.throws(()=>validateLocalDraft(large,'owner-a',now),e=>e.kind==='large');assert.equal(large.fields.context.length,DRAFT_MAX_BYTES/2);
});
test('unverified identity prevents even opening IndexedDB',async()=>{
 let opened=false;const original=globalThis.indexedDB;globalThis.indexedDB={open(){opened=true;throw Error('must not run')}};
 try{await assert.rejects(readLocalDraft('owner-a',()=>false),e=>e.kind==='identity');assert.equal(opened,false);}finally{globalThis.indexedDB=original;}
});
