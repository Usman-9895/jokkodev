import test from 'node:test';
import assert from 'node:assert/strict';
import {parseProjectCriteria,selectProjects,projectListHref,projectDetailHref} from '../frontend/src/lib/jokkoprojects/query.ts';
import {projectExamples} from '../frontend/src/lib/jokkoprojects/fixtures.ts';
import {projectDraftFrom,validateProjectDraft,emptyProjectDraft,canEditProject,selectPersonalExamples} from '../frontend/src/lib/jokkoprojects/presentation.ts';
test('les critères projets bornent les paramètres et préservent les filtres lors du retour',()=>{
 assert.deepEqual(parseProjectCriteria({q:['  activité  ','autre'],technology:'inconnue',status:'admin',page:'-1'}),{q:'activité',technology:'',status:'all',page:1});
 for(const page of ['0','1.5','Infinity','99999999999999999999'])assert.equal(parseProjectCriteria({page}).page,1);
 const c=parseProjectCriteria({q:'React & aide',technology:'React',status:'closed',page:'2'});
 assert.equal(projectListHref(c),'/projets?q=React+%26+aide&technology=React&status=closed&page=2');
 assert.equal(projectDetailHref('id/opaque',c),'/projets/id%2Fopaque?q=React+%26+aide&technology=React&status=closed&page=2');
 assert.equal(parseProjectCriteria({q:'x'.repeat(300)}).q.length,200);
});
test('recherche projets sur toute la collection, combinaison, pagination et distinction vide/sans résultat',()=>{
 const all=selectProjects(parseProjectCriteria({}),projectExamples);
 assert.equal(all.meta.total,9);assert.equal(all.data.length,4);assert.equal(all.meta.totalPages,3);
 const filtered=selectProjects(parseProjectCriteria({q:'associations',technology:'React',status:'open'}),projectExamples);
 assert.deepEqual(filtered.data.map(p=>p.id),['demo-associations']);
 const second=selectProjects(parseProjectCriteria({page:'2'}),projectExamples);assert.ok(second.data.every(p=>!all.data.some(first=>first.id===p.id)));
 assert.equal(selectProjects(parseProjectCriteria({page:'999'}),projectExamples).meta.page,3);
 assert.equal(selectProjects(parseProjectCriteria({q:'aucunrésultat'}),projectExamples).meta.sourceEmpty,false);
 assert.equal(selectProjects(parseProjectCriteria({}),[]).meta.sourceEmpty,true);
 assert.ok(selectProjects(parseProjectCriteria({status:'closed'}),projectExamples).data.every(p=>p.recruitment==='closed'));
});
test('le brouillon projet reste une copie locale, sans limites métier inventées ni mutation de la consultation',()=>{
 assert.deepEqual(Object.keys(validateProjectDraft(emptyProjectDraft())),['title','objective','technologies']);
 const p=projectExamples[0],snapshot=JSON.stringify(p),draft=projectDraftFrom(p);draft.title='x'.repeat(5000);draft.technologies.push('Compétence locale');draft.recruitment='closed';
 assert.deepEqual(validateProjectDraft(draft),{});assert.equal(JSON.stringify(p),snapshot);
 assert.deepEqual(validateProjectDraft({...draft,availability:''}),{}); // Obligation et format à confirmer dans le contrat.
});
test('gestion limitée au responsable et catégories personnelles sans chevauchement',()=>{
 assert.equal(canEditProject('owner'),true);
 for(const p of ['visitor','member','administrator','suspended'])assert.equal(canEditProject(p),false);
 const examples=[{relation:'created'},{relation:'joined'},{relation:'created'}];
 assert.equal(selectPersonalExamples(examples,'all').length,3);assert.equal(selectPersonalExamples(examples,'created').length,2);assert.equal(selectPersonalExamples(examples,'joined').length,1);
 assert.equal(new Set(projectExamples.map(p=>p.id)).size,projectExamples.length);
 for(const p of projectExamples){if(p.members)assert.ok(p.members.some(m=>m.name===p.owner.name));}
});
