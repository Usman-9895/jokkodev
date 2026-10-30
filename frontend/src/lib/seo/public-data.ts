import 'server-only';
import {cache} from 'react';
import type {components} from '@jokkodev/api-client';
import {apiInternalOrigin} from '../config/server';
type S=components['schemas'];
export type PublicResult<T>={kind:'ok';data:T}|{kind:'missing'}|{kind:'unavailable'};
// No cookies, authorization, Origin or forwarded headers from the incoming request.
// No persistent cache: removed/hidden content must not survive in SEO snapshots.
export const publicRead=cache(async <T,>(path:string):Promise<PublicResult<T>>=>{
 try{const response=await fetch(apiInternalOrigin+'/api/v1'+path,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(5000),headers:{Accept:'application/json'}});
 if(response.status===404)return {kind:'missing'};
 if(!response.ok)return {kind:'unavailable'};
 return {kind:'ok',data:await response.json() as T};
 }catch{return {kind:'unavailable'};}
});
export const readQuestion=cache(async(id:string)=>{
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return {kind:'missing'} as const;
 return publicRead<S['QuestionDetailDto']>('/questions/'+encodeURIComponent(id));
});
export const readProject=cache(async(id:string)=>{
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return {kind:'missing'} as const;
 return publicRead<S['ProjectDetailDto']>('/projects/'+encodeURIComponent(id));
});
