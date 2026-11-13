import {createServer,type Server} from 'node:http';
import {createHash,randomBytes} from 'node:crypto';
import * as oauth from 'openid-client';
export interface GitHubFixture {id?:number;email?:string;verified?:boolean;primary?:boolean;scope?:string;emails?:unknown[]}
/** Local OAuth/API simulator. Never imported by product code. */
export class SimulatedGitHub {
 private server?:Server;origin='';exchanges=0;
 private codes=new Map<string,{challenge:string;fixture:GitHubFixture}>();
 private tokens=new Map<string,GitHubFixture>();
 async start(port=0){
  this.server=createServer(async(req,res)=>{
   const url=new URL(req.url??'/',this.origin||'http://localhost');
   if(url.pathname==='/authorize'){
    res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','no-store');
    res.end('<!doctype html><html lang="fr"><meta charset="utf-8"><title>GitHub simulé — recette locale</title><h1>GitHub simulé — recette locale uniquement</h1><p>Aucun accès à GitHub. Utilise une adresse fictive et un identifiant numérique stable.</p><form action="/approve"><input type="hidden" name="authorization" value="'+encodeURIComponent(url.href)+'"><label>Identifiant GitHub fictif <input name="id" value="2001" required pattern="[1-9][0-9]*"></label><label>Adresse fictive <input name="email" type="email" value="github_preview@example.test" required></label><label><input type="checkbox" name="verified" value="1" checked>Adresse vérifiée</label><button name="choice" value="continue">Continuer</button><button name="choice" value="cancel">Annuler</button></form></html>');return;
   }
   if(url.pathname==='/approve'){
    const authorization=new URL(decodeURIComponent(url.searchParams.get('authorization')??''));
    res.statusCode=303;res.setHeader('Location',url.searchParams.get('choice')==='cancel'?this.cancel(authorization):this.callback(authorization,{id:Number(url.searchParams.get('id')),email:url.searchParams.get('email')??'',verified:url.searchParams.get('verified')==='1'}));res.end();return;
   }
   res.setHeader('Content-Type','application/json');
   if(url.pathname==='/token'&&req.method==='POST'){
    let body='';for await(const chunk of req)body+=chunk;
    const form=new URLSearchParams(body),entry=this.codes.get(form.get('code')??'');this.codes.delete(form.get('code')??'');
    const challenge=createHash('sha256').update(form.get('code_verifier')??'').digest('base64url');
    if(!entry||challenge!==entry.challenge||form.get('client_secret')!=='fixture-only'){res.statusCode=400;res.end(JSON.stringify({error:'invalid_grant'}));return;}
    this.exchanges++;const token=randomBytes(32).toString('hex');this.tokens.set(token,entry.fixture);
    res.end(JSON.stringify({access_token:token,token_type:'bearer',scope:entry.fixture.scope??'user:email'}));return;
   }
   const fixture=this.tokens.get(req.headers.authorization?.replace('Bearer ','')??'');
   if(!fixture){res.statusCode=401;res.end('{}');return;}
   if(url.pathname==='/user'){res.end(JSON.stringify({id:fixture.id??1001,login:'local-simulated'}));return;}
   if(url.pathname==='/user/emails'){res.end(JSON.stringify(fixture.emails??[{email:fixture.email??'github_local@example.test',verified:fixture.verified!==false,primary:fixture.primary!==false}]));return;}
   res.statusCode=404;res.end('{}');
  });
  await new Promise<void>(resolve=>this.server!.listen(port,'127.0.0.1',resolve));
  const address=this.server.address();if(!address||typeof address==='string')throw Error('No simulator port');this.origin='http://127.0.0.1:'+address.port;return this;
 }
 configuration(){const config=new oauth.Configuration({issuer:this.origin,authorization_endpoint:this.origin+'/authorize',token_endpoint:this.origin+'/token'},'local-github',{client_secret:'fixture-only'},oauth.ClientSecretPost('fixture-only'));oauth.allowInsecureRequests(config);return config;}
 callback(authorization:URL,fixture:GitHubFixture={}){const code=randomBytes(24).toString('hex');this.codes.set(code,{challenge:authorization.searchParams.get('code_challenge')??'',fixture});const url=new URL(authorization.searchParams.get('redirect_uri')!);url.searchParams.set('state',authorization.searchParams.get('state')!);url.searchParams.set('iss',this.origin);url.searchParams.set('code',code);return url.href;}
 cancel(authorization:URL){const url=new URL(authorization.searchParams.get('redirect_uri')!);url.searchParams.set('state',authorization.searchParams.get('state')!);url.searchParams.set('iss',this.origin);url.searchParams.set('error','access_denied');return url.href;}
 async api(path:string,token:string){const response=await fetch(this.origin+path,{headers:{Authorization:'Bearer '+token},redirect:'error'});if(!response.ok)throw Error('Simulated unavailable');return response.json() as Promise<unknown>;}
 async close(){await new Promise<void>((resolve,reject)=>this.server?.close(error=>error?reject(error):resolve()));}
}
