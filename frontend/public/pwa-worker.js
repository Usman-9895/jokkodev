/* global self, caches, __JD_BUILD__, URL, Headers, Request, Response, fetch */
'use strict';
const VERSION=__JD_BUILD__;
const PREFIX='jokkodev-public-reading-v1-';
const CACHE=PREFIX+VERSION;
const META=PREFIX+'active';
const TTL=24*60*60*1000;
const MAX_BYTES=3*1024*1024;
const MAX_TOTAL=8*1024*1024;
const FILES=['/hors-connexion','/lecture-hors-connexion/ressources','/pwa/offline.css','/pwa/offline-ui.js','/pwa-client.js','/theme-init.js','/pwa/tokens.css','/pwa/inter.ttf','/pwa/serif.ttf','/brand/jokkodev-horizontal.svg','/brand/jokkodev-horizontal-fond-sombre.svg','/pwa/icon-192.png','/pwa/icon-512.png'];
const PUBLIC=new Set(['/','/ressources','/questions','/projets','/a-propos','/regles','/contact','/confidentialite','/hors-connexion','/lecture-hors-connexion/ressources']);
function admissible(request){
 const url=new URL(request.url);
 return request.method==='GET'&&url.origin===self.location.origin&&!url.search&&!request.headers.has('Authorization')&&request.cache!=='no-store'&&!request.headers.has('RSC')&&!request.headers.has('Next-Router-State-Tree')&&!request.headers.has('Next-Router-Prefetch')&&!(request.headers.get('Accept')||'').includes('text/x-component');
}
function alive(response){const at=Number(response?.headers.get('X-JD-Cached-At'));return !!at&&Date.now()>=at&&Date.now()-at<TTL;}
function offline(response){const headers=new Headers(response.headers);headers.delete('X-Request-Id');headers.delete('X-JD-Cached-At');headers.set('X-JokkoDev-Offline','1');headers.set('Cache-Control','no-store');return response.arrayBuffer().then(body=>new Response(body,{status:response.status,headers}));}
async function cached(path){if(refreshing)await refreshing;const cache=await caches.open(CACHE);const committed=await cache.match(FILES[0]);if(!alive(committed)){await caches.delete(CACHE);return null;}const response=await cache.match(path);if(response&&!alive(response)){await cache.delete(path);return null;}return response?offline(response):null;}
function expired(){return new Response('JokkoDev — Hors connexion. La copie de lecture est absente ou a expiré après 24 heures. Reviens avec une connexion pour télécharger les guides publics. Aucune connexion de compte ou publication ne peut être réalisée hors ligne.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-JokkoDev-Offline':'1'}});}
async function populate(){
 const cache=await caches.open(CACHE);let total=0;const entries=[];
  for(const path of FILES){
   // Only authored, fixed public documents/assets; never Next HTML, RSC or API responses.
   const response=await fetch(new Request(path,{credentials:'omit',cache:'reload',redirect:'error'}));
   const document=FILES.slice(0,2).includes(path)&&response.headers.get('X-JokkoDev-Public-Reading')==='1'&&(response.headers.get('Content-Type')||'').startsWith('text/html');
   if(!response.ok||response.type==='opaque'||/no-store|private/i.test(response.headers.get('Cache-Control')||'')||response.headers.has('Set-Cookie')||/cookie|authorization/i.test(response.headers.get('Vary')||'')||(/rsc/i.test(response.headers.get('Vary')||'')&&!document)||(response.headers.get('Content-Type')||'').includes('text/x-component'))throw Error('Public cache refused');
   const body=await response.arrayBuffer();total+=body.byteLength;
   if(body.byteLength>MAX_BYTES||total>MAX_TOTAL)throw Error('Public cache size exceeded');
   const headers=new Headers(response.headers);
   for(const name of ['X-Request-Id','Content-Encoding','Content-Length','Transfer-Encoding','Connection'])headers.delete(name);
   headers.set('X-JD-Cached-At',String(Date.now()));
   entries.push([path,new Response(body,{status:200,headers})]);
  }
 // The first document is the commit marker; readers never accept a partial renewal.
 for(const [path,response]of [...entries.slice(1),entries[0]])await cache.put(path,response);
}
let refreshing=null;
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();let active='';
 if(keys.includes(META)){const response=await(await caches.open(META)).match('/__jd_pwa_version__');if(response)active=await response.text();}
 // At most active + candidate snapshots; abandoned waiting versions cannot accumulate.
 for(const key of keys)if(key.startsWith(PREFIX)&&![CACHE,META,PREFIX+active].includes(key))await caches.delete(key);
 try{await populate();}catch(error){await caches.delete(CACHE);throw error;}
 // No skipWaiting: existing tabs retain their current worker until explicitly closed.
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 await(await caches.open(META)).put('/__jd_pwa_version__',new Response(VERSION));
 for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE&&key!==META)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{
 if(!event.source?.url||new URL(event.source.url).origin!==self.location.origin)return;
 if(event.data?.type==='ACTIVATE_UPDATE')event.waitUntil(self.skipWaiting());
 if(event.data?.type==='REFRESH_PUBLIC_READING')event.waitUntil((async()=>{
  const first=await(await caches.open(CACHE)).match(FILES[0]);
  if(!alive(first)){
   if(!refreshing)refreshing=populate().catch(()=>{}).finally(()=>{refreshing=null;});
   await refreshing;
  }
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request;if(!admissible(request))return;
 const url=new URL(request.url);
 if(request.mode==='navigate'&&PUBLIC.has(url.pathname)){
  event.respondWith((async()=>{
   try{return await fetch(request,{cache:'no-store'});}catch{
    const target=['/ressources','/lecture-hors-connexion/ressources'].includes(url.pathname)?'/lecture-hors-connexion/ressources':'/hors-connexion';
    return await cached(target)||expired();
   }
  })());
 }else if(FILES.includes(url.pathname)){
  event.respondWith((async()=>{try{return await fetch(request,{cache:'no-store'});}catch{return await cached(url.pathname)||expired();}})());
 }
});
