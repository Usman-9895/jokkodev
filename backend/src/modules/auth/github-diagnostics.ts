import {ResponseBodyError,WWWAuthenticateChallengeError} from 'openid-client';
import {ApiException} from '../../common/http/api-exception';

const stages=['token_exchange','granted_scope','identity_request','identity_response','emails_request','emails_response','verified_email','callback'] as const;
export type GitHubDiagnosticStage=typeof stages[number];
const reasons=['http_error','response_too_large','invalid_json','scope_missing','scope_unexpected','identity_invalid','emails_invalid','no_verified_email','client_rejected','redirect_rejected','code_rejected','provider_email_unverified','provider_rejected','token_response_invalid','network_error','flow_invalid','consent_denied','account_suspended','provider_disabled','database_error','unexpected_failure'] as const;
type Reason=typeof reasons[number];
export class GitHubDiagnosticError extends Error {
 constructor(readonly reason:Reason,readonly status?:number){super(reason==='response_too_large'?'GitHub response too large':'GitHub API unavailable');}
}
function property(value:unknown,key:string):unknown {
 try{return value&&typeof value==='object'?(value as Record<string,unknown>)[key]:undefined;}catch{return undefined;}
}
const providerReasons:Record<string,Reason>={incorrect_client_credentials:'client_rejected',redirect_uri_mismatch:'redirect_rejected',bad_verification_code:'code_rejected',invalid_grant:'code_rejected',unverified_user_email:'provider_email_unverified'};
function category(error:unknown):{reason:Reason;status?:number} {
 if(error instanceof GitHubDiagnosticError)return {reason:reasons.includes(error.reason)?error.reason:'unexpected_failure',status:error.status};
 if(error instanceof ResponseBodyError){
  return {reason:Object.hasOwn(providerReasons,error.error)?providerReasons[error.error]:'provider_rejected',status:error.status};
 }
 if(error instanceof WWWAuthenticateChallengeError)return {reason:'provider_rejected',status:error.status};
 if(error instanceof ApiException){
  const code=property(error.getResponse(),'code');
  const known:Record<string,Reason>={GITHUB_NO_VERIFIED_EMAIL:'no_verified_email',GITHUB_FLOW_INVALID:'flow_invalid',GITHUB_DENIED:'consent_denied',ACCOUNT_SUSPENDED:'account_suspended',GITHUB_DISABLED:'provider_disabled'};
  if(typeof code==='string'&&Object.hasOwn(known,code))return {reason:known[code]};
 }
 const code=property(error,'code'),causeCode=property(property(error,'cause'),'code');
 if(code==='OAUTH_RESPONSE_IS_NOT_CONFORM'){
  const response=property(error,'cause');
  return {reason:'http_error',status:response instanceof Response?response.status:undefined};
 }
 // OAuth errors returned with HTTP 200 can be wrapped as invalid token responses.
 // Read only the code to select an enum; never serialize the parsed body.
 if(code==='OAUTH_INVALID_RESPONSE'){
  let current:unknown=error;
  for(let depth=0;depth<3;depth++,current=property(current,'cause')){
   const bodyError=property(property(current,'body'),'error');
   if(typeof bodyError==='string')return {reason:Object.hasOwn(providerReasons,bodyError)?providerReasons[bodyError]:'provider_rejected'};
  }
 }
 if(['ENOTFOUND','EAI_AGAIN','ENETUNREACH','ECONNRESET','ECONNREFUSED','ETIMEDOUT','UND_ERR_CONNECT_TIMEOUT','CERT_HAS_EXPIRED','UNABLE_TO_VERIFY_LEAF_SIGNATURE','OAUTH_TIMEOUT'].some(c=>c===code||c===causeCode)||property(error,'name')==='TimeoutError')return {reason:'network_error'};
 if(typeof code==='string'&&['OAUTH_INVALID_RESPONSE','OAUTH_RESPONSE_IS_NOT_JSON','OAUTH_INVALID_SERVER_METADATA','OAUTH_PARSE_ERROR'].includes(code))return {reason:'token_response_invalid'};
 if(typeof code==='string'&&['P2000','P2002','P2003','P2010','P2021','P2022','P2024'].includes(code))return {reason:'database_error'};
 return {reason:'unexpected_failure'};
}
/** Allowlisted operational data only. Never stringify an exception or response. */
export function reportGitHubFailure(enabled:boolean|undefined,stage:GitHubDiagnosticStage,error:unknown):void {
 if(!enabled)return;
 try{
  const {reason,status}=category(error);
  const record:{event:string;stage:GitHubDiagnosticStage;reason:Reason;status?:number}={event:'github_auth_failed',stage:stages.includes(stage)?stage:'callback',reason};
  if(typeof status==='number'&&Number.isInteger(status)&&status>=100&&status<=599)record.status=status;
  console.warn(JSON.stringify(record));
 }catch{/* Diagnostics must never change the authentication result. */}
}
