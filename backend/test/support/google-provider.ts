import {createServer,type Server} from 'node:http';
import {createHash,generateKeyPairSync,randomUUID,sign} from 'node:crypto';
import type {AddressInfo} from 'node:net';
import * as oidc from 'openid-client';
/** Protocol-only fixture: signed JWT/JWKS and real HTTP exchange. Never imported by src/. */
export class SimulatedGoogle {
 private readonly key=generateKeyPairSync('rsa',{modulusLength:2048});
 private readonly codes=new Map<string,{parameters:URLSearchParams;claims:Record<string,unknown>}>();
 private server?:Server;
 origin='';exchanges=0;
 async start(port=0){
  this.server=createServer(async(req,res)=>{
   const url=new URL(req.url??'/',this.origin);res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');
   if(url.pathname==='/jwks'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({keys:[{...this.key.publicKey.export({format:'jwk'}),kid:'recipe',alg:'RS256',use:'sig'}]}));return;}
   if(url.pathname==='/token'){
    this.exchanges++;let raw='';for await(const part of req)raw+=part;
    const input=new URLSearchParams(raw),code=input.get('code')??'',pending=this.codes.get(code);this.codes.delete(code);
    res.setHeader('Content-Type','application/json');
    if(!pending||input.get('redirect_uri')!==pending.parameters.get('redirect_uri')||createHash('sha256').update(input.get('code_verifier')??'').digest('base64url')!==pending.parameters.get('code_challenge')){res.statusCode=400;res.end(JSON.stringify({error:'invalid_grant'}));return;}
    const now=Math.floor(Date.now()/1000),claims={iss:'https://accounts.google.com',aud:pending.parameters.get('client_id'),sub:'recipe-sub',email:'recipe@example.test',email_verified:true,iat:now,exp:now+300,nonce:pending.parameters.get('nonce'),...pending.claims};
    const header=Buffer.from(JSON.stringify({alg:'RS256',kid:'recipe'})).toString('base64url'),payload=Buffer.from(JSON.stringify(claims)).toString('base64url'),data=header+'.'+payload;
    const signature=sign('RSA-SHA256',Buffer.from(data),this.key.privateKey);if(pending.claims.recipe_invalid_signature)signature[0]^=1;
    res.end(JSON.stringify({access_token:'local-recipe-not-a-google-token',token_type:'Bearer',expires_in:300,id_token:data+'.'+signature.toString('base64url')}));return;
   }
   if(url.pathname==='/authorize'){
    res.setHeader('Content-Type','text/html; charset=utf-8');
    const escape=(v:string)=>v.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
    if(url.searchParams.has('recipe_email')){
     const redirect=this.callback(url,{email:url.searchParams.get('recipe_email')!,sub:url.searchParams.get('recipe_sub')||'preview-sub'});res.writeHead(303,{Location:redirect});res.end();return;
    }
    const hidden=[...url.searchParams].map(([key,value])=>'<input type="hidden" name="'+escape(key)+'" value="'+escape(value)+'">').join('');
    res.end('<!doctype html><html lang="fr"><meta name="viewport" content="width=device-width"><title>Fournisseur simulé — recette locale</title><body><main><h1>Google simulé — recette locale uniquement</h1><p>Aucun échange avec Google. Utilise une adresse fictive example.test et aucun vrai mot de passe.</p><form action="/authorize">'+hidden+'<p><label>Adresse fictive <input name="recipe_email" type="email" value="google_recette@example.test" required></label></p><p><label>Identifiant stable fictif <input name="recipe_sub" value="google-preview-member" required></label></p><button>Simuler le consentement</button></form><p><a href="'+escape(this.cancel(url))+'">Refuser le consentement</a></p></main></body></html>');return;
   }
   res.writeHead(404).end();
  });
  await new Promise<void>(resolve=>this.server!.listen(port,'127.0.0.1',resolve));
  this.origin='http://127.0.0.1:'+(this.server.address() as AddressInfo).port;return this;
 }
 configuration(clientId:string):oidc.Configuration{
  const config=new oidc.Configuration({issuer:'https://accounts.google.com',authorization_endpoint:this.origin+'/authorize',token_endpoint:this.origin+'/token',jwks_uri:this.origin+'/jwks',id_token_signing_alg_values_supported:['RS256']},clientId,{client_secret:'fixture-only',id_token_signed_response_alg:'RS256'},oidc.ClientSecretPost('fixture-only'));
  oidc.allowInsecureRequests(config);oidc.enableNonRepudiationChecks(config);return config;
 }
 callback(authorization:URL,claims:Record<string,unknown>={}):string{
  const code=randomUUID();this.codes.set(code,{parameters:new URLSearchParams(authorization.search),claims});
  const callback=new URL(authorization.searchParams.get('redirect_uri')!);callback.searchParams.set('code',code);callback.searchParams.set('state',authorization.searchParams.get('state')!);return callback.href;
 }
 cancel(authorization:URL):string{const u=new URL(authorization.searchParams.get('redirect_uri')!);u.searchParams.set('state',authorization.searchParams.get('state')!);u.searchParams.set('error','access_denied');return u.href;}
 async close(){await new Promise<void>((resolve,reject)=>this.server?.close(error=>error?reject(error):resolve()));}
}
