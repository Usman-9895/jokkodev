import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {publicationTime,publicationHash,PUBLICATION_RETRY_MS} from '../src/modules/questions/publication-policy';
const now=Date.UTC(2026,10,4,12),key=`jdq1.${now}.${randomUUID()}`;
test('publication retry uses exact UTC seven-day bounds and refuses old keys even after receipt removal',()=>{
 assert.equal(publicationTime(key,now),now);assert.equal(publicationTime(key,now+PUBLICATION_RETRY_MS-1),now);
 assert.throws(()=>publicationTime(key,now+PUBLICATION_RETRY_MS));assert.throws(()=>publicationTime(key,now+PUBLICATION_RETRY_MS+1));
});
test('publication keys reject arbitrary formats and future clocks outside tolerance',()=>{
 assert.throws(()=>publicationTime(randomUUID(),now));assert.throws(()=>publicationTime(`jdq1.${now+300001}.${randomUUID()}`,now));
 assert.equal(publicationTime(`jdq1.${now+300000}.${randomUUID()}`,now),now+300000);
});
test('fingerprint ignores JSON object key order but preserves exact field text and technology order',()=>{
 const q={title:'Une question valide',context:'Contexte',expected:'Attendu',actual:'Obtenu',attempts:'Essais',technologyIds:['a','b']};
 assert.equal(publicationHash(q),publicationHash({...q,title:q.title}));assert.notEqual(publicationHash(q),publicationHash({...q,title:q.title+' '}));
 assert.notEqual(publicationHash(q),publicationHash({...q,technologyIds:['b','a']}));assert.notEqual(publicationHash(q),publicationHash({...q,code:null}));
});
