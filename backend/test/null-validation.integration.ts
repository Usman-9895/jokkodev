import assert from 'node:assert/strict';
import {after,before,test} from 'node:test';
import type {Client} from 'pg';
import {createTestDatabase,sqlClient,type TestDatabase} from './support/database';
import {startApp,type TestApp} from './support/app';
import {registerMember,seedCatalogue,type Member} from './support/fixtures';
let database:TestDatabase,server:TestApp,sql:Client,member:Member;
let questionId:string,answerId:string,projectId:string,technologyId:string;
before(async()=>{
 database=await createTestDatabase();sql=await sqlClient(database);const catalogue=await seedCatalogue(sql);technologyId=catalogue.get('nestjs')!;
 server=await startApp(database.url);member=await registerMember(server.api,'null_validation');
 const question=await member.browser.post('/questions',{title:'Question de validation locale',context:'Contexte.',expected:'Une réponse 400.',actual:'Vérification.',attempts:'Test dédié.',technologyIds:[technologyId],code:'const example = true;',codeLanguage:'TypeScript'});assert.equal(question.status,201);questionId=question.body.id;
 const answer=await member.browser.post(`/questions/${questionId}/answers`,{body:'Réponse de validation locale.'});assert.equal(answer.status,201);answerId=answer.body.id;
 const project=await member.browser.post('/projects',{title:'Projet de validation locale',objective:'Un projet jetable de validation des champs facultatifs.',technologyIds:[technologyId]});assert.equal(project.status,201);projectId=project.body.id;
});
after(async()=>{await sql?.end();await server?.close();await database?.drop();});
async function rejectNull(route:string,fields:string[]){for(const field of fields){const response=await member.browser.patch(route,{[field]:null});assert.equal(response.status,400,`${route} ${field}`);assert.equal(response.body.code,'VALIDATION_ERROR');assert.ok(response.body.fieldErrors[field]);}}
test('PATCH question : null refusé pour les champs non nullables',async()=>{await rejectNull(`/questions/${questionId}`,['title','context','expected','actual','attempts','technologyIds']);});
test('PATCH réponse : corps null refusé',async()=>{await rejectNull(`/answers/${answerId}`,['body']);});
test('PATCH projet : null refusé pour les champs non nullables',async()=>{await rejectNull(`/projects/${projectId}`,['title','objective','recruitmentStatus','technologyIds']);});
test('PATCH profil : null refusé pour pseudonyme et collections',async()=>{await rejectNull('/users/me',['username','links','skillIds']);});
test('absence, effacement nullable et collections vides restent conformes au contrat',async()=>{
 assert.equal((await member.browser.patch(`/questions/${questionId}`,{})).status,200);
 const cleared=await member.browser.patch(`/questions/${questionId}`,{code:null});assert.equal(cleared.status,200);assert.equal(cleared.body.code,null);assert.equal(cleared.body.codeLanguage,null);
 assert.equal((await member.browser.patch(`/projects/${projectId}`,{availability:null})).status,200);
 assert.equal((await member.browser.patch('/users/me',{bio:null,countryCode:null,links:[],skillIds:[]})).status,200);
 const project=await member.browser.post('/projects',{title:'Autre projet de validation',objective:'Un objectif assez long pour vérifier un statut nul.',technologyIds:[technologyId],recruitmentStatus:null});assert.equal(project.status,400);assert.ok(project.body.fieldErrors.recruitmentStatus);
});

test('PATCH conserve les champs absents et applique chaque valeur valide', async () => {
 const qInput={title:'Titre modifié de validation',context:'Contexte modifié.',expected:'Attendu modifié.',actual:'Actuel modifié.',attempts:'Essais modifiés.',technologyIds:[technologyId],code:'const updated = 1;',codeLanguage:'JavaScript'};
 const q=await member.browser.patch(`/questions/${questionId}`,qInput);assert.equal(q.status,200);
 for(const field of ['title','context','expected','actual','attempts','code','codeLanguage'] as const)assert.equal(q.body[field],qInput[field]);
 assert.deepEqual(q.body.technologies.map((t:{id:string})=>t.id),[technologyId]);
 const qAbsent=await member.browser.patch(`/questions/${questionId}`,{});for(const field of ['title','context','expected','actual','attempts','code','codeLanguage','technologies'])assert.deepEqual(qAbsent.body[field],q.body[field]);
 const a=await member.browser.patch(`/answers/${answerId}`,{body:'Une réponse modifiée et valide.',code:'const answer = 2;',codeLanguage:'TypeScript'});assert.equal(a.status,200);assert.equal(a.body.body,'Une réponse modifiée et valide.');
 const aAbsent=await member.browser.patch(`/answers/${answerId}`,{});for(const field of ['body','code','codeLanguage'])assert.equal(aAbsent.body[field],a.body[field]);
 const pInput={title:'Titre de projet modifié',objective:'Un objectif modifié suffisamment long pour la validation.',availability:'Deux heures par semaine',technologyIds:[technologyId],recruitmentStatus:'CLOSED'};
 const p=await member.browser.patch(`/projects/${projectId}`,pInput);assert.equal(p.status,200);
 for(const field of ['title','objective','availability','recruitmentStatus'] as const)assert.equal(p.body[field],pInput[field]);
 assert.deepEqual(p.body.technologies.map((t:{id:string})=>t.id),[technologyId]);
 const pAbsent=await member.browser.patch(`/projects/${projectId}`,{});for(const field of ['title','objective','availability','recruitmentStatus','technologies'])assert.deepEqual(pAbsent.body[field],p.body[field]);
 const profile=await member.browser.patch('/users/me',{username:'null_validation_updated',bio:'Biographie de test.',countryCode:'SN',links:['https://example.test/profile'],skillIds:[technologyId]});assert.equal(profile.status,200);assert.equal(profile.body.username,'null_validation_updated');assert.equal(profile.body.bio,'Biographie de test.');assert.equal(profile.body.countryCode,'SN');assert.deepEqual(profile.body.links,['https://example.test/profile']);assert.deepEqual(profile.body.skills.map((t:{id:string})=>t.id),[technologyId]);
 const profileAbsent=await member.browser.patch('/users/me',{});for(const field of ['username','bio','countryCode','links','skills'])assert.deepEqual(profileAbsent.body[field],profile.body[field]);
 // A single-field update must not overwrite the other fields either.
 const partial=await member.browser.patch('/users/me',{bio:'Autre bio.'});assert.equal(partial.body.username,profile.body.username);assert.deepEqual(partial.body.skills,profile.body.skills);assert.deepEqual(partial.body.links,profile.body.links);
});
test('PATCH effacement explicite de tous les champs nullables, sans effacement global',async()=>{
 for(const route of [`/questions/${questionId}`,`/answers/${answerId}`]){
  const language=await member.browser.patch(route,{codeLanguage:null});assert.equal(language.status,200);assert.equal(language.body.codeLanguage,null);assert.ok(language.body.code);
  const cleared=await member.browser.patch(route,{code:null});assert.equal(cleared.status,200);assert.equal(cleared.body.code,null);assert.equal(cleared.body.codeLanguage,null);
 }
 const project=await member.browser.patch(`/projects/${projectId}`,{availability:null});assert.equal(project.status,200);assert.equal(project.body.availability,null);assert.equal(project.body.recruitmentStatus,'CLOSED');
 const profile=await member.browser.patch('/users/me',{bio:null,countryCode:null,links:[],skillIds:[]});assert.equal(profile.status,200);assert.equal(profile.body.bio,null);assert.equal(profile.body.countryCode,null);assert.deepEqual(profile.body.links,[]);assert.deepEqual(profile.body.skills,[]);assert.equal(profile.body.username,'null_validation_updated');
});
