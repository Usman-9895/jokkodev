import test from 'node:test';
import assert from 'node:assert/strict';
import {parseReportCriteria,selectReportExamples,moderationHref,reportEntryHref,validateReportReason,validateModerationDecision,canDemonstrateModeration,simulateModerationEffect} from '../frontend/src/lib/reports/presentation.ts';
test('critères et pagination des signalements filtrent la collection entière et bornent les pages',()=>{
 for(const page of ['-1','0','1.2','Infinity','9007199254740992'])assert.equal(parseReportCriteria({page}).page,1);
 assert.deepEqual(parseReportCriteria({status:['closed','open'],page:'2'}),{status:'closed',page:2});
 const data=Array.from({length:9},(_,i)=>({id:i,status:i%2?'closed':'open'}));
 const result=selectReportExamples(data,{status:'open',page:2});assert.equal(result.meta.total,5);assert.deepEqual(result.data.map(r=>r.id),[8]);
 assert.equal(selectReportExamples(data,{status:'all',page:999}).meta.page,3);
 assert.equal(selectReportExamples([],{status:'all',page:2}).meta.sourceEmpty,true);
});
test('liens de retour et de signalement encodent les cibles et conservent le filtre',()=>{
 assert.equal(reportEntryHref('answer','id/a?x'),'/signalements?type=answer&target=id%2Fa%3Fx');
 assert.equal(moderationHref({status:'closed',page:2},{view:'detail',id:'id/opaque'}),'/dev/moderation?view=detail&id=id%2Fopaque&status=closed&page=2');
});
test('motifs requis sans inventer une limite métier ou une taxonomie serveur',()=>{
 assert.ok(validateReportReason(' \n'));assert.equal(validateReportReason('x'.repeat(5000)),undefined);
 assert.deepEqual(Object.keys(validateModerationDecision('','')),['action','reason']);
 assert.ok(validateModerationDecision('delete','motif').action);
 assert.deepEqual(validateModerationDecision('suspend','Motif explicite.'),{});
});
test('décisions réservées à ADMIN, au signalement ouvert, hors envoi',()=>{
 assert.equal(canDemonstrateModeration('administrator','open',false),true);
 for(const role of ['developer','visitor','expired'])assert.equal(canDemonstrateModeration(role,'open',false),false);
 assert.equal(canDemonstrateModeration('administrator','closed',false),false);
 assert.equal(canDemonstrateModeration('administrator','open',true),false);
});
test('clôture, masquage et suspension restent indépendants et ne mutent pas les exemples sources',()=>{
 const source={status:'open',contentHidden:false,accountSuspended:false},copy=JSON.stringify(source);
 assert.deepEqual(simulateModerationEffect(source,'close','success'),{...source,status:'closed'});
 assert.deepEqual(simulateModerationEffect(source,'hide','success'),{...source,contentHidden:true});
 assert.deepEqual(simulateModerationEffect(source,'suspend','success'),{...source,accountSuspended:true});
 assert.equal(JSON.stringify(source),copy);
 for(const outcome of ['error','conflict','expired','denied'])assert.deepEqual(simulateModerationEffect(source,'hide',outcome),source);
 const closed={...source,status:'closed'};assert.deepEqual(simulateModerationEffect(closed,'suspend','success'),closed);
});
