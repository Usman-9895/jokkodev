import test from 'node:test';
import assert from 'node:assert/strict';
import {helpCriteria,questionQuery,emptyQuestion,questionDraft,questionPayload,questionPatch,validateQuestion,validateAnswer,questionView,detailView} from '../frontend/src/lib/jokkohelp/api.ts';
import {AccountClient,apiFailure} from '../frontend/src/lib/accounts/session.ts';
import {allowedReturnPath} from '../frontend/src/lib/accounts/presentation.ts';
const author={id:'author-id',username:'fictive_author',countryCode:'SN'};
const question={id:'question-id',title:'Une question de recette',context:'Contexte',expected:'Résultat attendu',actual:'Résultat obtenu',attempts:'Essais effectués',code:'  <script>exemple</script>\n',codeLanguage:'TypeScript',excerpt:'Contexte',technologies:[{id:'technology-id',name:'React',slug:'react'}],author,resolved:true,answerCount:42,createdAt:'2026-10-18T00:00:00Z',updatedAt:'2026-10-18T01:00:00Z',viewerIsAuthor:true,acceptedAnswerId:'accepted'};
test('login return permits only known internal Help paths, without query, encoded traversal or foreign origins',()=>{const path='/questions/123e4567-e89b-12d3-a456-426614174000/modifier';assert.equal(allowedReturnPath(path),path);assert.equal(allowedReturnPath('/espace/questions'),'/espace/questions');for(const value of [path+'?retour=https://example.test','//example.test','/questions/fake/modifier','/questions/%2e%2e/admin'])assert.equal(allowedReturnPath(value),'/espace');});
test('URL criteria keep real/unknown technologies and literal search; typed query delegates the entire selection to API',()=>{
 const criteria=helpCriteria({q:['  sécurité % _ \\ React  ','ignored'],technology:'unlisted_real_technology',status:'open',page:'7'});
 assert.deepEqual(questionQuery(criteria),{q:'sécurité % _ \\ React',technology:'unlisted_real_technology',status:'open',page:7,pageSize:3});
 assert.equal(helpCriteria({page:'0',status:'false'}).page,1);assert.equal(helpCriteria({page:'1e100'}).page,1);assert.equal(helpCriteria({q:'x'.repeat(201)}).q.length,201); // no silent truncation: server validation remains visible
});
test('summary mapping uses real count/resolution and public profile reference without fabricated answer records',()=>{
 const view=questionView({...question,author:{...author,email:'must-not-leak@example.test'}});assert.equal(view.answerCount,42);assert.equal(view.resolved,true);assert.equal(view.answers.length,0);assert.equal(view.author.reference,author.id);assert.equal(JSON.stringify(view).includes('must-not-leak'),false);
});
test('accepted answer is pinned once, even when absent from the current API page; text/code remain unparsed',()=>{
 const accepted={id:'accepted',author,body:'<img src=x onerror=alert(1)>',code:'  <html>  ',codeLanguage:'HTML',createdAt:question.createdAt,updatedAt:question.updatedAt};
 const view=detailView({...question,acceptedAnswer:accepted},[{...accepted,id:'other'},accepted]);assert.deepEqual(view.answers.map(a=>a.id),['accepted','other']);assert.equal(view.answers[0].content[0].text,accepted.body);assert.equal(view.answers[0].content[1].text,accepted.code);assert.equal(view.content.find(b=>b.heading==='Résultat obtenu').text,question.actual);
});
test('PATCH distinguishes unchanged fields, explicit nullable code clears and a valid technology collection',()=>{
 const initial=questionDraft(question);assert.deepEqual(questionPatch(initial,initial),{});assert.deepEqual(questionPatch({...initial,code:'',codeLanguage:''},initial),{code:null,codeLanguage:null});
 const patch=questionPatch({...initial,title:'Un titre réellement modifié',technologyIds:['another-id']},initial);assert.deepEqual(patch,{title:'Un titre réellement modifié',technologyIds:['another-id']});assert.equal('context'in patch,false);assert.equal(questionPayload(initial).code,question.code);
});
test('question validation covers all four required sections, combined UTF16 cap, technology minimum/duplicates and code language',()=>{
 const draft=questionDraft(question);assert.deepEqual(validateQuestion(draft),{});const invalid=validateQuestion({...emptyQuestion(),technologyIds:[],codeLanguage:'<script>'});for(const key of ['title','context','expected','actual','attempts','technologyIds','codeLanguage'])assert.ok(invalid[key]);
 assert.ok(validateQuestion({...draft,context:'🔐'.repeat(10000)}).context);assert.ok(validateQuestion({...draft,technologyIds:['duplicate','duplicate']}).technologyIds);assert.ok(validateQuestion({...draft,code:'x'.repeat(20001)}).code);
});
test('answer validation permits native plain-text/code input and rejects empty, NUL, oversized or invalid-language values',()=>{
 assert.deepEqual(validateAnswer({body:'Une réponse valide',code:'<script>fixture</script>',codeLanguage:'C++'}),{});assert.ok(validateAnswer({body:'court',code:'',codeLanguage:''}).body);assert.ok(validateAnswer({body:'x'.repeat(20001),code:'',codeLanguage:''}).body);assert.ok(validateAnswer({body:'Texte avec \0 caractère',code:'',codeLanguage:''}).body);
});
test('NOT_AUTHOR is a business refusal, not session expiration; true unauthorized response still hides identity',async()=>{
 const user={id:'owner',username:'owner',email:'owner@example.test',role:'MEMBER',emailVerified:true};let expired=false;const client=new AccountClient('/api',async(url)=>url.endsWith('/auth/me')?Response.json(user):url.endsWith('/csrf')?Response.json({csrfToken:'fixture'}):Response.json({code:expired?'UNAUTHORIZED':'NOT_AUTHOR',message:'refused',fieldErrors:{title:['invalid']}},{status:expired?401:403}));
 await client.refresh();await assert.rejects(client.mutate('/questions/other',{title:'A valid title'},'PATCH',true),e=>apiFailure(e).code==='NOT_AUTHOR');assert.equal(client.snapshot().phase,'authenticated');assert.equal(client.snapshot().user.id,user.id);
 expired=true;await assert.rejects(client.mutate('/questions/other',{title:'A valid title'},'PATCH',true));assert.equal(client.snapshot().user,null);assert.equal(client.snapshot().phase,'guest');
});
test('rechecking an already anonymous session does not churn public read identity; a lost authenticated session still invalidates',async()=>{
 let authenticated=false;const user={id:'author',username:'author',email:'author@example.test',role:'MEMBER',emailVerified:true};const client=new AccountClient('/api',async()=>authenticated?Response.json(user):Response.json({code:'UNAUTHORIZED'},{status:401}));
 await client.refresh();const anonymous=client.snapshot().revision;await client.refresh();assert.equal(client.snapshot().revision,anonymous);
 authenticated=true;await client.refresh();assert.equal(client.snapshot().user.id,user.id);authenticated=false;await client.refresh();assert.ok(client.snapshot().revision>anonymous);const expired=client.snapshot().revision;await client.refresh();assert.equal(client.snapshot().revision,expired);assert.equal(client.snapshot().user,null);
});
