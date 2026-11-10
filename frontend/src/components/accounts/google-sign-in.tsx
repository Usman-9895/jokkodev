'use client';
import {useEffect,useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type {components} from '@jokkodev/api-client';
import {useSession} from './session-provider';
import {apiFailure} from '../../lib/accounts/session';
import type {ApiFailure} from '../../lib/accounts/session';
import {allowedReturnPath} from '../../lib/accounts/presentation';
import {FailureMessage} from './live-account-form';
export function GoogleSignIn(){
 const {client}=useSession(),search=useSearchParams();const [enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[failure,setFailure]=useState<ApiFailure|null>(null);const lock=useRef(false);
 useEffect(()=>{const abort=new AbortController();void client.read<components['schemas']['GoogleStatusDto']>('/auth/google/status',abort.signal).then(status=>setEnabled(status.enabled)).catch(()=>{});return()=>abort.abort();},[client]);
 async function start(){
  if(lock.current)return;lock.current=true;setBusy(true);setFailure(null);
  try{const result=await client.mutate<components['schemas']['GoogleStartResultDto']>('/auth/google/start',{returnTo:allowedReturnPath(search.get('retour')??undefined)});if(!result?.authorizationUrl)throw Error('Google indisponible');window.location.assign(result.authorizationUrl);}
  catch(error){setFailure(apiFailure(error));setBusy(false);lock.current=false;}
 }
 if(!enabled)return null;
 return <div className="account-google">{failure&&<FailureMessage failure={failure}/>}<button className="google-sign-in" type="button" onClick={()=>void start()} disabled={busy} aria-busy={busy}><span className="google-sign-in__mark" aria-hidden="true"><Image src="/brand/google-sign-in.png" width={40} height={40} alt=""/></span><span>{busy?'Ouverture de Google…':'Continuer avec Google'}</span></button><p className="account-legal">Tu seras redirigé vers Google. <Link href="/confidentialite#google">Données échangées</Link></p><div className="account-google__divider"><span>ou avec ton adresse email</span></div></div>;
}
