import {Inject,Injectable} from '@nestjs/common';
import * as oauth from 'openid-client';
import {isEmail} from 'class-validator';
import {ENVIRONMENT} from '../../config/config.module';
import type {Environment} from '../../config/environment';
import {ApiException} from '../../common/http/api-exception';
import type {GoogleChecks,GoogleClaims} from './google.oidc';
import {GitHubDiagnosticError,reportGitHubFailure,type GitHubDiagnosticStage} from './github-diagnostics';

/** GitHub OAuth is not OIDC. Identity comes only from the authenticated /user API. */
@Injectable()
export class GitHubOAuth {
 constructor(@Inject(ENVIRONMENT) protected readonly env:Environment){}
 protected configuration():oauth.Configuration {
  if(!this.env.github)throw new ApiException(404,'GITHUB_DISABLED','La connexion GitHub n’est pas disponible.');
  return new oauth.Configuration({issuer:'https://github.com',authorization_endpoint:'https://github.com/login/oauth/authorize',token_endpoint:'https://github.com/login/oauth/access_token'},this.env.github.clientId,{client_secret:this.env.github.clientSecret},oauth.ClientSecretPost(this.env.github.clientSecret));
 }
 async authorization(checks:GoogleChecks):Promise<string>{
  return oauth.buildAuthorizationUrl(this.configuration(),{response_type:'code',redirect_uri:this.env.github!.redirectUri,scope:'user:email',state:checks.state,code_challenge:await oauth.calculatePKCECodeChallenge(checks.verifier),code_challenge_method:'S256',prompt:'select_account'}).href;
 }
 protected async api(path:string,token:string):Promise<unknown>{
  // Endpoints fixed by this class; never follow a redirect with an access token.
  const response=await fetch('https://api.github.com'+path,{headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'JokkoDev'},redirect:'error',signal:AbortSignal.timeout(8000)});
  if(!response.ok||!response.body)throw new GitHubDiagnosticError('http_error',response.status);
  const reader=response.body.getReader();let size=0;const chunks:Uint8Array[]=[];
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>65536)throw new GitHubDiagnosticError('response_too_large');chunks.push(value);}}
  finally{await reader.cancel().catch(()=>{});}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;}catch{throw new GitHubDiagnosticError('invalid_json');}
 }
 async identity(url:URL,checks:GoogleChecks):Promise<GoogleClaims>{
  let stage:GitHubDiagnosticStage='token_exchange';
  try{
   const tokens=await oauth.authorizationCodeGrant(this.configuration(),url,{pkceCodeVerifier:checks.verifier,expectedState:checks.state});
   // A client previously authorized more broadly must not silently supply a repo token.
   const scopes=typeof tokens.scope==='string'?tokens.scope.split(/[ ,]+/).filter(Boolean):[];
   stage='granted_scope';
   if(!scopes.length)throw new GitHubDiagnosticError('scope_missing');
   if(scopes.length!==1||scopes[0]!=='user:email')throw new GitHubDiagnosticError('scope_unexpected');
   stage='identity_request';
   const user=await this.api('/user',tokens.access_token) as {id?:unknown};
   stage='identity_response';
   if(!user||!Number.isSafeInteger(user.id)||Number(user.id)<=0)throw new GitHubDiagnosticError('identity_invalid');
   const verified:{email:string;primary:boolean}[]=[];
   for(let page=1;page<=5;page++){
    stage='emails_request';
    const rows=await this.api('/user/emails?per_page=100&page='+page,tokens.access_token);
    stage='emails_response';
    if(!Array.isArray(rows))throw new GitHubDiagnosticError('emails_invalid');
    for(const row of rows){if(row&&typeof row==='object'&&row.verified===true&&typeof row.email==='string'&&row.email.length<=254&&isEmail(row.email))verified.push({email:row.email,primary:row.primary===true});}
    if(rows.length<100)break;
   }
   verified.sort((a,b)=>Number(b.primary)-Number(a.primary)||a.email.localeCompare(b.email));
   stage='verified_email';
   if(!verified.length)throw new ApiException(400,'GITHUB_NO_VERIFIED_EMAIL','GitHub ne fournit aucune adresse vérifiée. Vérifie une adresse dans GitHub, puis recommence, ou utilise ton adresse e-mail sur JokkoDev.');
   return {sub:String(user.id),email:verified[0].email};
  }catch(error){
   reportGitHubFailure(this.env.githubDiagnosticsEnabled,stage,error);
   if(error instanceof ApiException)throw error;
   // Never include an upstream error, URL, code, token or address in the error/log.
   throw new ApiException(503,'GITHUB_UNAVAILABLE','La connexion GitHub n’a pas abouti. Réessaie volontairement depuis la connexion.');
  }
 }
}
