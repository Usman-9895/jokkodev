import test from 'node:test';
import assert from 'node:assert/strict';
import {publicPages,pageMetadata,staticMetadata,excerpt,SITE_ORIGIN,privateRobots,websiteSchema} from '../frontend/src/lib/seo/metadata.ts';
test('public metadata uses the approved HTTPS origin and unique descriptive titles',()=>{
 assert.equal(SITE_ORIGIN,'https://jokkodev.com');
 assert.equal(new Set(publicPages.map(p=>p.title)).size,publicPages.length);
 for(const p of publicPages){const m=staticMetadata(p.path);assert.equal(m.alternates.canonical,SITE_ORIGIN+p.path);assert.equal(m.robots.index,true);assert.equal(m.openGraph.url,m.alternates.canonical);assert.equal(m.twitter.title,p.title);}
 for(const path of ['/admin','/espace','/connexion','/questions/poser','/projets/proposer','/profils/private'])assert.throws(()=>staticMetadata(path));
});
test('metadata keeps untrusted titles as text, limits excerpts by Unicode codepoints and supports noindex',()=>{
 const text='<script>alert("x")</script> 😃';const m=pageMetadata('/questions/id',text,'description',false);assert.equal(m.title,text);assert.equal(m.robots.index,false);
 assert.equal(excerpt('  A\n  B  '),'A B');assert.equal(excerpt('😃😃😃',2),'😃😃');assert.deepEqual(privateRobots,{index:false,follow:false});
});

test('website identity names the actual brand without invented ratings or search actions',()=>{assert.equal(websiteSchema.name,'JokkoDev');assert.equal(websiteSchema.url,'https://jokkodev.com/');assert.equal(websiteSchema['@type'],'WebSite');assert.equal(websiteSchema.potentialAction,undefined);assert.equal(websiteSchema.aggregateRating,undefined);});

test('sitemap follows actual REST page limits and never exposes private URLs',async()=>{
 const {buildSitemap}=await import('../frontend/src/lib/seo/sitemap.ts');const calls=[];
 const result=await buildSitemap(async path=>{calls.push(path);const url=new URL(path,'http://fixture');const page=Number(url.searchParams.get('page'));assert.equal(url.searchParams.get('pageSize'),'50');return {kind:'ok',data:{data:page===1?Array.from({length:50},(_,i)=>({id:'11111111-1111-4111-8111-'+String(i).padStart(12,'0'),updatedAt:'2026-10-30T00:00:00Z'})):[{id:'22222222-2222-4222-8222-222222222222',updatedAt:'2026-10-30T00:00:00Z'}],meta:{total:51,page,pageSize:50}}};});
 assert.equal(calls.length,4);assert.equal((result.match(/<loc>/g)||[]).length,publicPages.length+102);assert.ok(result.includes('<loc>https://jokkodev.com/cadev</loc>'));assert.ok(!/espace|admin|profils|connexion/.test(result));assert.ok(result.includes('<lastmod>2026-10-30T00:00:00.000Z</lastmod>'));
});
test('sitemap fails closed on missing API, corrupt pagination, empty partial page and time budget',async()=>{
 const {buildSitemap}=await import('../frontend/src/lib/seo/sitemap.ts');
 for(const read of [async()=>({kind:'unavailable'}),async()=>({kind:'missing'}),async()=>({kind:'ok',data:{data:[],meta:{total:1,page:1,pageSize:50}}}),async()=>({kind:'ok',data:{data:[],meta:{total:0,page:2,pageSize:50}}})])assert.equal(await buildSitemap(read),null);
 let n=0;assert.equal(await buildSitemap(async()=>{throw Error('Must not call after budget');},()=>n++===0?0:20001),null);
});
