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
type Provider='google'|'github';
export function ExternalSignIns(){
 const {client}=useSession(),search=useSearchParams();
 const [enabled,setEnabled]=useState<Record<Provider,boolean>>({google:false,github:false});
 const [busy,setBusy]=useState<Provider|null>(null),[failure,setFailure]=useState<ApiFailure|null>(null);const lock=useRef(false);
 useEffect(()=>{
  const abort=new AbortController();
  for(const provider of ['google','github'] as const){void client.read<components['schemas']['GoogleStatusDto']>('/auth/'+provider+'/status',abort.signal).then(result=>setEnabled(previous=>({...previous,[provider]:result.enabled}))).catch(()=>{});}
  return()=>abort.abort();
 },[client]);
 async function start(provider:Provider){
  if(lock.current)return;lock.current=true;setBusy(provider);setFailure(null);
  try{
   const result=await client.mutate<components['schemas']['GoogleStartResultDto']>('/auth/'+provider+'/start',{returnTo:allowedReturnPath(search.get('retour')??undefined)});
   if(!result?.authorizationUrl)throw Error('Connexion externe indisponible');
   window.location.assign(result.authorizationUrl);
  }catch(error){setFailure(apiFailure(error));setBusy(null);lock.current=false;}
 }
 if(!enabled.google&&!enabled.github)return null;
 return <div className="account-google">{failure&&<FailureMessage failure={failure}/>}
 <div className="external-sign-in-row">{(['github','google'] as const).filter(provider=>enabled[provider]).map(provider=>{
  const label=provider==='google'?'Google':'GitHub';
  return <button key={provider} className={provider==='google'?'google-sign-in':'github-sign-in'} type="button" onClick={()=>void start(provider)} disabled={busy!==null} aria-busy={busy===provider} aria-label={busy===provider?'Ouverture de '+label+'…':'Continuer avec '+label}>
  {provider==='google'&&<span className="google-sign-in__mark" aria-hidden="true"><Image src="/brand/google-sign-in.png" width={40} height={40} alt=""/></span>}
  {provider==='github'&&<span className="github-sign-in__mark" aria-hidden="true"><Image className="github-sign-in__light" src="/brand/github-black.svg" width={20} height={20} alt=""/><Image className="github-sign-in__dark" src="/brand/github-white.svg" width={20} height={20} alt=""/></span>}
  <span>{label}{busy===provider?'…':''}</span></button>;
 })}</div>
 <p className="account-legal external-sign-in-legal">Tu seras redirigé vers le service choisi. Données échangées : {enabled.github&&<Link href="/confidentialite#github">GitHub</Link>}{enabled.github&&enabled.google?' · ':''}{enabled.google&&<Link href="/confidentialite#google">Google</Link>}.</p>
 <div className="account-google__divider"><span>ou avec ton adresse email</span></div></div>;
}
