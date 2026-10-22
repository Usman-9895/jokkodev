'use client';
import {useEffect,useState,useSyncExternalStore} from 'react';
import type {HttpQuery} from '@jokkodev/api-client/http';
import {useSession} from '../accounts/session-provider';
let version=0,discardEpoch=0;const listeners=new Set<()=>void>();
export function invalidateHelp(discard=false){version++;if(discard)discardEpoch++;listeners.forEach(fn=>fn());}
const subscribe=(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};};
export function useHelpVersion(){return useSyncExternalStore(subscribe,()=>version,()=>0);}
/** No data cache: abort + identity/key guard also rejects transports that ignore abort. */
export function useHelpResource<T>(path:string,query?:HttpQuery,privateData=false,options:{focus?:boolean;keep?:boolean}={}){
 const {client,revision,user}=useSession();const changed=useHelpVersion();const [retry,setRetry]=useState(0);
 const serialized=JSON.stringify(query??{}),identity=JSON.stringify([path,serialized,privateData,revision,user?.id,discardEpoch]),key=JSON.stringify([identity,changed,retry]);
 const [result,setResult]=useState<{key:string;identity?:string;data?:T;error?:unknown}>({key:''});
 useEffect(()=>{if(options.focus===false)return;const reload=()=>{if(document.visibilityState==='visible')setRetry(v=>v+1);};window.addEventListener('focus',reload);document.addEventListener('visibilitychange',reload);return()=>{window.removeEventListener('focus',reload);document.removeEventListener('visibilitychange',reload);};},[options.focus]);
 useEffect(()=>{const abort=new AbortController();client.read<T>(path,abort.signal,privateData,JSON.parse(serialized)).then(data=>{if(!abort.signal.aborted)setResult({key,identity,data});}).catch(error=>{if(!abort.signal.aborted)setResult({key,identity,error});});return()=>abort.abort();},[client,path,serialized,privateData,key,identity]);
 return {data:result.key===key||options.keep!==false&&result.identity===identity?result.data:undefined,error:result.key===key?result.error:undefined,retry:()=>setRetry(v=>v+1)};
}
