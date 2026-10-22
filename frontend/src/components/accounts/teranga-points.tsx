'use client';
import {useEffect,useState} from 'react';
import {useHelpVersion} from '../jokkohelp/live-resource';
import {useSession} from './session-provider';
import {apiFailure,type OwnProfile} from '../../lib/accounts/session';
import {Button,LoadingIndicator} from '../ui';

/** Re-read when returning from another tab or browser history; no persistent profile cache. */
export function useProfileReturnVersion(){
 const [version,setVersion]=useState(0);
 useEffect(()=>{const refresh=()=>{if(document.visibilityState==='visible')setVersion(v=>v+1);};window.addEventListener('focus',refresh);window.addEventListener('pageshow',refresh);document.addEventListener('visibilitychange',refresh);return()=>{window.removeEventListener('focus',refresh);window.removeEventListener('pageshow',refresh);document.removeEventListener('visibilitychange',refresh);};},[]);
 return version;
}
export function TerangaPoints({points}:{points:number}){
 return <section className="profile-teranga" aria-label="Teranga Points"><p><strong>{points}</strong> <span>Teranga Points</span></p><p>Points obtenus grâce aux réponses acceptées par d’autres membres.</p></section>;
}
export function OwnTerangaPoints({initial}:{initial:OwnProfile}){
 const {client,revision,user}=useSession(),returned=useProfileReturnVersion(),changed=useHelpVersion();
 const [value,setValue]=useState<number|null>(initial.terangaPoints),[error,setError]=useState<string|null>(null),[retry,setRetry]=useState(0);
 useEffect(()=>{const abort=new AbortController();setValue(null);setError(null);client.read<OwnProfile>('/users/me',abort.signal,true).then(p=>{if(!abort.signal.aborted&&p.id===client.snapshot().user?.id)setValue(p.terangaPoints);}).catch(e=>{if(!abort.signal.aborted)setError(apiFailure(e).message);});return()=>abort.abort();},[client,revision,user?.id,returned,changed,retry]);
 if(error)return <section className="profile-teranga"><p role="alert">Teranga Points : {error}</p><Button variant="quiet" onClick={()=>setRetry(r=>r+1)}>Réessayer</Button></section>;
 return value===null?<LoadingIndicator label="Chargement des Teranga Points…"/>:<TerangaPoints points={value}/>;
}
