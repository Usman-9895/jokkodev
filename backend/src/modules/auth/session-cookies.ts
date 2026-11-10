import type {Request,Response} from 'express';
import type {Environment} from '../../config/environment';
import {cookieNames,SESSION_ABSOLUTE_MS} from './auth.constants';
import type {Csrf} from './csrf';
/** Same session and CSRF rotation for password and external authentication. */
export function openSession(token:string,request:Request,response:Response,env:Environment,csrf:Csrf):string{
 const names=cookieNames(env.sessionCookieSecure),cookie={httpOnly:true,secure:env.sessionCookieSecure,sameSite:'lax' as const,path:'/'};
 response.cookie(names.session,token,{...cookie,maxAge:SESSION_ABSOLUTE_MS});response.clearCookie(names.preSession,cookie);
 request.cookies={...request.cookies,[names.session]:token};delete request.cookies[names.preSession];
 return csrf.issue(request,response,{renew:true});
}
