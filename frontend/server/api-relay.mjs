import http from 'node:http';
import https from 'node:https';
import {isIP} from 'node:net';
import {isRequestId} from './observability.mjs';

export function apiOrigin(value=process.env.API_INTERNAL_ORIGIN??'http://127.0.0.1:3001') {
 let url;try{url=new URL(value);}catch{throw Error('Invalid API_INTERNAL_ORIGIN');}
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('Invalid API_INTERNAL_ORIGIN');
 return url;
}
export function isApiPath(url) { return /^\/api\/v1(?:\/|\?|$)/.test(url??''); }
const hopHeaders=['connection','keep-alive','proxy-authenticate','proxy-authorization','te','trailer','transfer-encoding','upgrade'];
function endToEnd(headers) {
 const copy={...headers};
 for(const key of [...hopHeaders,...String(headers.connection??'').split(',').map(s=>s.trim().toLowerCase())])delete copy[key];
 return copy;
}
function unavailable(response) {
 if(response.headersSent){response.destroy();return;}
 response.writeHead(502,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
 response.end(JSON.stringify({statusCode:502,code:'API_UNAVAILABLE',message:'La réponse ne peut pas être confirmée. Vérifie l’état avant tout nouvel envoi.'}));
}

/** First trusted HTTP entry only. Never derive an address from incoming proxy headers. */
export function apiRelay(origin) {
 const target=apiOrigin(String(origin));
 return (request,response)=>{
  if(!isApiPath(request.url)){response.writeHead(404);response.end();return;}
  const address=request.socket.remoteAddress;
  if(!address||!isIP(address)){unavailable(response);return;}
  const headers=endToEnd(request.headers);
  delete headers['x-request-id']; // Never promote a visitor-chosen correlation identifier.
  for(const key of Object.keys(headers))if(key==='forwarded'||key.startsWith('x-forwarded-')||['x-real-ip','x-client-ip','true-client-ip','cf-connecting-ip','fastly-client-ip','x-cluster-client-ip'].includes(key))delete headers[key];
  // Replace after Connection-nominated headers were removed; Host never selects the upstream.
  headers.host=target.host;
  headers['x-forwarded-for']=address;
  headers['x-forwarded-proto']=request.socket.encrypted?'https':'http';
  const upstream=(target.protocol==='https:'?https:http).request({protocol:target.protocol,hostname:target.hostname.replace(/^\[|\]$/g,''),port:target.port||undefined,method:request.method,path:request.url,headers},reply=>{
   const responseHeaders=endToEnd(reply.headers);
   if(!isRequestId(responseHeaders['x-request-id']))delete responseHeaders['x-request-id'];
   response.writeHead(reply.statusCode??502,responseHeaders);
   reply.on('error',()=>response.destroy());
   reply.pipe(response);
  });
  upstream.setTimeout(30_000,()=>upstream.destroy());
  upstream.on('error',()=>unavailable(response));
  request.on('aborted',()=>upstream.destroy());
  request.on('error',()=>upstream.destroy());
  response.on('close',()=>{if(!response.writableEnded)upstream.destroy();});
  // Stream once: no automatic retry, buffering, JSON conversion or multipart boundary changes.
  request.pipe(upstream);
 };
}
