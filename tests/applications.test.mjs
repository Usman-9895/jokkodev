import test from 'node:test';
import assert from 'node:assert/strict';
import {parseApplicationFilter,selectApplicationExamples,canDemonstrateDecision,canDemonstrateApplication,applyDemoDecision,validateApplicationMessage,developerPreviewHref} from '../frontend/src/lib/applications/presentation.ts';

test('filtres de candidature et navigation tolèrent les valeurs invalides sans perdre le contexte',()=>{
 assert.equal(parseApplicationFilter('accepted'),'accepted');
 for(const value of [undefined,['pending'],'administrator','',7])assert.equal(parseApplicationFilter(value),'all');
 const items=[{status:'pending'},{status:'accepted'},{status:'pending'}];
 assert.equal(selectApplicationExamples(items,'pending').length,2);assert.equal(selectApplicationExamples(items,'all').length,3);
 assert.equal(developerPreviewHref('received',{filter:'pending',outcome:'conflict'}),'/dev/espace?view=received&filter=pending&outcome=conflict');
});
test('une décision fictive est réservée au responsable, en attente et hors envoi',()=>{
 assert.equal(canDemonstrateDecision('owner','pending',false),true);
 for(const role of ['eligible','visitor','pending','member','closed','administrator','expired'])assert.equal(canDemonstrateDecision(role,'pending',false),false);
 for(const status of ['accepted','refused','withdrawn'])assert.equal(canDemonstrateDecision('owner',status,false),false);
 assert.equal(canDemonstrateDecision('owner','pending',true),false);
});
test('une erreur, un conflit, une expiration ou une demande traitée ne produisent pas de faux succès',()=>{
 for(const outcome of ['error','conflict','expired'])assert.equal(applyDemoDecision('pending','accepted',outcome),'pending');
 assert.equal(applyDemoDecision('pending','refused','success'),'refused');
 assert.equal(applyDemoDecision('accepted','refused','success'),'accepted');
});
test('candidature locale : validation sans limite inventée et prévention des variantes non admissibles',()=>{
 assert.ok(validateApplicationMessage('  \n'));assert.equal(validateApplicationMessage('x'.repeat(5000)),undefined);
 assert.equal(canDemonstrateApplication('eligible',false),true);assert.equal(canDemonstrateApplication('eligible',true),false);
 for(const role of ['visitor','pending','member','owner','closed','administrator','expired'])assert.equal(canDemonstrateApplication(role,false),false);
});
