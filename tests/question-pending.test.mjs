import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import {validatePending,pendingPayload,PENDING_RETRY_MS} from '../frontend/src/lib/jokkohelp/pending-publication.ts';
import {DRAFT_MAX_BYTES} from '../frontend/src/lib/jokkohelp/local-draft.ts';
const now=Date.UTC(2026,10,4),owner='f2-fixture';
const payload={title:'Une question fictive',context:'Contexte',expected:'Attendu',actual:'Obtenu',attempts:'Essais',technologyIds:['test'],code:null,codeLanguage:null};
const record=()=>({schema:1,ownerId:owner,version:'version',key:`jdq1.${now}.752718b5-704b-4d4d-9c16-32b28b55f441`,queuedAt:now,expiresAt:now+PENDING_RETRY_MS,state:'pending',attempted:false,payload:globalThis.structuredClone(payload),sourceDraftVersion:null});
test('pending copy retains the exact nulls, whitespace and ordered technology IDs',()=>{
 const r=record();r.payload={...payload,context:'  exact\r\ntext  ',technologyIds:['second','first'],code:'  ',codeLanguage:'ts'};
 assert.deepEqual(pendingPayload(validatePending(r,owner,now)),{idempotencyKey:r.key,question:r.payload});
});
test('pending identity, schema, key timestamp and fixed seven-day expiry are checked',()=>{
 for(const changes of [{ownerId:'other'},{schema:2},{key:record().key.replace('jdq1','jdq2')},{queuedAt:now-1},{expiresAt:now+PENDING_RETRY_MS+1},{version:''},{csrfToken:'must-never-be-stored'},{sourceDraftVersion:'x'.repeat(81)}])assert.throws(()=>validatePending({...record(),...changes},owner,now));
 assert.throws(()=>validatePending(record(),owner,now-1));
});
test('unconfirmed states cannot fabricate links and expired copies contain no payload',()=>{
 for(const changes of [{questionId:randomUUID()},{confirmedAt:new Date(now).toISOString()},{state:'sending'},{state:'uncertain'},{state:'expired'}])assert.throws(()=>validatePending({...record(),...changes},owner,now));
 const expired={...record(),state:'expired'};delete expired.payload;assert.equal(validatePending(expired,owner,now).state,'expired');assert.throws(()=>pendingPayload(expired));
 const confirmed={...expired,state:'confirmed',attempted:true,questionId:randomUUID(),confirmedAt:new Date(now).toISOString()};assert.equal(validatePending(confirmed,owner,now).state,'confirmed');
});
test('pending storage is bounded and rejects unknown payload fields',()=>{
 const r=record();r.payload.context='x'.repeat(DRAFT_MAX_BYTES);assert.throws(()=>validatePending(r,owner,now),e=>e.kind==='large');
 assert.throws(()=>validatePending({...record(),payload:{...payload,session:'not-allowed'}},owner,now));
});
