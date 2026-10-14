import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyQuestionDraft,validateQuestionDraft,validateReply,draftFromQuestion,normalizedDraft,previewActions,filterQuestionExamples} from '../frontend/src/lib/jokkohelp/contributions/presentation.ts';
import {questionExamples} from '../frontend/src/lib/jokkohelp/fixtures.ts';

test('la validation locale exige une description, sans confondre code seul ou rubrique facultative avec le contexte',()=>{
 const draft=emptyQuestionDraft();
 assert.deepEqual(Object.keys(validateQuestionDraft(draft)),['title','technologies','content']);
 draft.title='Titre fictif';draft.technologies=['React'];draft.content[1].text='Résultat seul';draft.content[3].text='const x = 1;';
 assert.deepEqual(Object.keys(validateQuestionDraft(draft)),['content']);
 draft.content[0].text='Description';assert.deepEqual(validateQuestionDraft(draft),{});
 draft.title='x'.repeat(10000);draft.technologies=Array.from({length:20},(_,i)=>String(i));
 assert.deepEqual(validateQuestionDraft(draft),{}); // Aucune limite métier déduite de la maquette.
 assert.ok(validateReply(' \n '));assert.equal(validateReply('<script>texte non interprété</script>'),'');
});
test('préremplissage et normalisation ne modifient jamais les données publiques de consultation',()=>{
 const original=questionExamples[0];const snapshot=JSON.stringify(original);const draft=draftFromQuestion(original);
 draft.title=' Titre modifié ';draft.technologies.push(draft.technologies[0]);draft.content[0].text='<img onerror="exemple">';draft.content.push({kind:'paragraph',text:' '});
 const result=normalizedDraft(draft);
 assert.equal(result.title,'Titre modifié');assert.equal(result.content[0].text,'<img onerror="exemple">');
 assert.equal(result.technologies.length,new Set(result.technologies).size);assert.ok(result.content.every(block=>block.text.trim()));
 assert.equal(JSON.stringify(original),snapshot);
 const simple=questionExamples.find(q=>q.id==='demo-postgresql-cloud');const simpleSnapshot=JSON.stringify(simple);
 const editable=draftFromQuestion(simple);
 assert.ok(editable.content.some(b=>b.kind==='code'&&b.text===''));
 assert.ok(editable.content.some(b=>b.kind==='paragraph'&&b.heading==='Ce que tu as essayé'&&b.text===''));
 assert.deepEqual(normalizedDraft(editable).content,simple.content);
 assert.equal(JSON.stringify(simple),simpleSnapshot);
});
test('les perspectives de démonstration réservent la solution et la modification à l’auteur, jamais au simple rôle administrateur',()=>{
 for(const perspective of ['visitor','suspended'])assert.equal(previewActions(perspective).respond,false);
 for(const perspective of ['member','author','administrator'])assert.equal(previewActions(perspective).respond,true);
 for(const perspective of ['visitor','member','suspended','administrator']){
  assert.equal(previewActions(perspective).chooseSolution,false);assert.equal(previewActions(perspective).editQuestion,false);
 }
 assert.equal(previewActions('author').chooseSolution,true);assert.equal(previewActions('author').editQuestion,true);
 assert.equal(previewActions('author').editAnswer,false); // Périmètre non confirmé.
});
test('les filtres personnels de démonstration portent sur toute la collection et ne perdent ni ne dupliquent les questions',()=>{
 const all=filterQuestionExamples(questionExamples,'all');const resolved=filterQuestionExamples(questionExamples,'resolved');const open=filterQuestionExamples(questionExamples,'open');
 assert.equal(all.length,questionExamples.length);assert.equal(resolved.length+open.length,all.length);
 assert.ok(resolved.every(q=>q.acceptedAnswerId));assert.ok(open.every(q=>!q.acceptedAnswerId));
 assert.equal(new Set([...resolved,...open].map(q=>q.id)).size,all.length);
});
