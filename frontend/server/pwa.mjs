import {readFileSync} from 'node:fs';
const files=new Map([
 ['/pwa/tokens.css',new URL('../src/styles/tokens.css',import.meta.url)],
 ['/pwa/inter.ttf',new URL('../src/styles/fonts/Inter-Variable.ttf',import.meta.url)],
 ['/pwa/serif.ttf',new URL('../src/styles/fonts/SourceSerif4-Variable.ttf',import.meta.url)],
]);
export function createPwaHandler({enabled,version,disabled=false}){
 // Operational retirement response: no fetch handler, no reload, only owned caches.
 const retire="self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('jokkodev-public-reading-v1-'))await caches.delete(key);await self.registration.unregister();})()));";
 const worker=enabled?(disabled?retire:readFileSync(new URL('../public/pwa-worker.js',import.meta.url),'utf8').replaceAll('__JD_BUILD__',JSON.stringify(version))):'';
 return (request,response)=>{
  const path=request.url?.split('?')[0];
  if(path!=='/sw.js'&&!files.has(path))return false;
  if(request.url.includes('?')||!['GET','HEAD'].includes(request.method)){response.writeHead(404,{'Cache-Control':'no-store'});response.end();return true;}
  if(path==='/sw.js'){
   response.writeHead(enabled?200:404,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store','Service-Worker-Allowed':'/','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; connect-src 'self'"});
   response.end(enabled&&request.method!=='HEAD'?worker:'');return true;
  }
  response.writeHead(200,{'Content-Type':path.endsWith('.css')?'text/css; charset=utf-8':'font/ttf','Cache-Control':'public, max-age=0, must-revalidate','X-Content-Type-Options':'nosniff'});
  response.end(request.method==='HEAD'?undefined:readFileSync(files.get(path)));return true;
 };
}
