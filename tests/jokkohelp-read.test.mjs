import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCriteria,selectQuestions,listHref,detailHref} from '../frontend/src/lib/jokkohelp/query.ts';
import {questionExamples} from '../frontend/src/lib/jokkohelp/fixtures.ts';
test('paramètres absents, multiples et invalides sont normalisés',()=>{
  assert.deepEqual(parseCriteria({}),{q:'',technology:'',status:'all',page:1});
  assert.deepEqual(parseCriteria({q:['  NestJS ','autre'],technology:'inconnue',status:'admin',page:'-7'}),{q:'NestJS',technology:'',status:'all',page:1});
  for(const page of ['0','1.5','Infinity','99999999999999999999'])assert.equal(parseCriteria({page}).page,1);
  assert.equal(parseCriteria({q:'x'.repeat(300)}).q.length,200);
});
test('recherche globale sans accents, combinaisons et pagination bornée',()=>{
  const all=selectQuestions(parseCriteria({}),questionExamples);
  assert.equal(all.meta.total,9);assert.equal(all.data.length,3);assert.equal(all.meta.totalPages,3);
  const security=selectQuestions(parseCriteria({q:'securiser',technology:'NestJS',status:'resolved'}),questionExamples);
  assert.deepEqual(security.data.map(q=>q.id),['demo-session-nestjs']);
  const mongodb=selectQuestions(parseCriteria({q:'MongoDB'}),questionExamples);assert.equal(mongodb.meta.total,1);assert.equal(mongodb.data[0].id,'demo-mongodb');
  const page2=selectQuestions(parseCriteria({page:'2'}),questionExamples);assert.ok(!page2.data.some(q=>all.data.some(first=>first.id===q.id)));
  assert.equal(selectQuestions(parseCriteria({page:'999'}),questionExamples).meta.page,3);
  assert.equal(selectQuestions(parseCriteria({q:'aucunresultat'}),questionExamples).meta.sourceEmpty,false);
  assert.equal(selectQuestions(parseCriteria({}),[]).meta.sourceEmpty,true);
});
test('navigation préserve seulement les critères locaux et chaque solution appartient à sa question',()=>{
  const c=parseCriteria({q:'React & hooks',technology:'React',status:'open',page:'2'});
  assert.equal(listHref(c),'/questions?q=React+%26+hooks&technology=React&status=open&page=2');
  assert.equal(detailHref('demo/react',c),'/questions/demo%2Freact?q=React+%26+hooks&technology=React&status=open&page=2');
  assert.equal(listHref({...c,page:1}).includes('page='),false);
  for(const q of questionExamples){if(q.acceptedAnswerId)assert.ok(q.answers.some(a=>a.id===q.acceptedAnswerId));}
  for(const id of ['demo-jwt','demo-mongodb'])assert.ok(questionExamples.some(q=>q.id===id));
  assert.equal(new Set(questionExamples.map(q=>q.id)).size,questionExamples.length);
});
