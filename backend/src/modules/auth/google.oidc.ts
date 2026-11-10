import {Inject,Injectable} from '@nestjs/common';
import * as oidc from 'openid-client';
import {isEmail} from 'class-validator';
import {ENVIRONMENT} from '../../config/config.module';
import type {Environment} from '../../config/environment';
import {ApiException} from '../../common/http/api-exception';
export interface GoogleClaims {sub:string;email:string}
export interface GoogleChecks {state:string;nonce:string;verifier:string}
/** All protocol exchanges and signature/issuer/audience/nonce checks stay on the server. */
@Injectable()
export class GoogleOidc {
 private pending?:Promise<oidc.Configuration>;
 constructor(@Inject(ENVIRONMENT) protected readonly env:Environment){}
 protected async configuration():Promise<oidc.Configuration>{
  if(!this.env.google)throw new ApiException(404,'GOOGLE_DISABLED','La connexion Google n’est pas disponible.');
  this.pending??=oidc.discovery(new URL('https://accounts.google.com'),this.env.google.clientId,{client_secret:this.env.google.clientSecret,id_token_signed_response_alg:'RS256'},oidc.ClientSecretPost(this.env.google.clientSecret),{timeout:10,execute:[oidc.enableNonRepudiationChecks]}).catch(()=>{this.pending=undefined;throw new ApiException(503,'GOOGLE_UNAVAILABLE','Google est temporairement indisponible.');});
  return this.pending;
 }
 async authorization(checks:GoogleChecks):Promise<string>{
  return oidc.buildAuthorizationUrl(await this.configuration(),{redirect_uri:this.env.google!.redirectUri,response_type:'code',scope:'openid email',state:checks.state,nonce:checks.nonce,code_challenge:await oidc.calculatePKCECodeChallenge(checks.verifier),code_challenge_method:'S256',prompt:'select_account'}).href;
 }
 async identity(url:URL,checks:GoogleChecks):Promise<GoogleClaims>{
  const tokens=await oidc.authorizationCodeGrant(await this.configuration(),url,{pkceCodeVerifier:checks.verifier,expectedState:checks.state,expectedNonce:checks.nonce,idTokenExpected:true});
  const claims=tokens.claims();
  if(!claims||typeof claims.sub!=='string'||!claims.sub.length||claims.sub.length>255||typeof claims.email!=='string'||claims.email.length>254||!isEmail(claims.email)||claims.email_verified!==true)throw new ApiException(400,'GOOGLE_IDENTITY_INVALID','Google n’a pas confirmé une adresse utilisable.');
  return {sub:claims.sub,email:claims.email};
 }
}
