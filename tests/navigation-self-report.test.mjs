import test from 'node:test';
import assert from 'node:assert/strict';
import {primaryNavigation} from '../frontend/src/lib/layout/navigation.ts';
import {canReportTarget} from '../frontend/src/lib/reports/api.ts';
test('only actual admin role receives one correctly active main destination',()=>{for(const role of [undefined,'MEMBER'])assert.ok(primaryNavigation(role,'/admin/signalements').every(l=>l.label!=='Administration'));for(const path of ['/','/questions/id','/projets/id','/espace','/admin','/admin/signalements/id']){const links=primaryNavigation('ADMIN',path);assert.deepEqual(links.map(l=>l.label),['Questions','Projets','Ressources','Contact','À propos','Administration']);const admin=links.find(l=>l.label==='Administration');assert.equal(admin.href,'/admin/signalements');assert.equal(admin.active,path==='/admin'||path.startsWith('/admin/'));}assert.equal(primaryNavigation('ADMIN','/questions-other').some(l=>l.active),false);});
test('report action waits for known session and target owner; ownership belongs to answer not parent',()=>{for(const phase of ['loading','unavailable'])assert.equal(canReportTarget(phase,'u','other'),false);assert.equal(canReportTarget('authenticated','u','u'),false);assert.equal(canReportTarget('authenticated','u',undefined),false);assert.equal(canReportTarget('authenticated',undefined,'other'),false);assert.equal(canReportTarget('guest',undefined,'other'),true);assert.equal(canReportTarget('authenticated','question-author','answer-author'),true);assert.equal(canReportTarget('authenticated','answer-author','answer-author'),false);});

test('information destinations remain available to guests and members with exact active sections',()=>{
 for(const role of [undefined,'MEMBER','ADMIN'])for(const pathname of ['/contact','/a-propos','/ressources']){
  const links=primaryNavigation(role,pathname);assert.equal(links.filter(l=>l.active).length,1);assert.equal(links.find(l=>l.active).href,pathname);
 }
 assert.equal(primaryNavigation(undefined,'/contact-autre').some(l=>l.active),false);
});
