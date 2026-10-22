'use client';
import Link from 'next/link';
import {OwnTerangaPoints} from './teranga-points';
import {ProfilePhoto,ProfileContact} from './profile-media';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {Button,Card,Heading,LoadingIndicator,Message,SelectField,TextArea,TextField} from '../ui';
import {useSession} from './session-provider';
import {FailureMessage} from './live-account-form';
import {apiFailure} from '../../lib/accounts/session';
import type {ApiFailure,OwnProfile,Technology} from '../../lib/accounts/session';
import {countryCodes} from '../../lib/accounts/countries';
import {countryLabel,profileDraft,profilePayload,validateProfile} from '../../lib/accounts/profile';
import type {ProfileDraft} from '../../lib/accounts/profile';
export function ProfileEditor(){
 const {client,user,revision}=useSession();const [data,setData]=useState<{profile:OwnProfile;technologies:Technology[]}|null>(null),[failure,setFailure]=useState<ApiFailure|null>(null),[retry,setRetry]=useState(0);
 useEffect(()=>{const abort=new AbortController();setData(null);setFailure(null);Promise.all([client.read<OwnProfile>('/users/me',abort.signal,true),client.read<{data:Technology[]}>('/technologies',abort.signal)]).then(([profile,catalogue])=>{if(!abort.signal.aborted&&profile.id===client.snapshot().user?.id)setData({profile,technologies:catalogue.data});}).catch(error=>{if(!abort.signal.aborted)setFailure(apiFailure(error));});return()=>abort.abort();},[client,user?.id,revision,retry]);
 if(failure)return <><Heading as="h1">Impossible de charger le profil</Heading><FailureMessage failure={failure}/><Button onClick={()=>setRetry(r=>r+1)}>Réessayer</Button></>;
 if(!data)return <LoadingIndicator label="Chargement de ton profil…"/>;
 return <Editor key={data.profile.id} initial={data.profile} technologies={data.technologies}/>;
}
function Editor({initial,technologies}:{initial:OwnProfile;technologies:Technology[]}) {
 const {client}=useSession(),router=useRouter();const [saved,setSaved]=useState(()=>profileDraft(initial)),[draft,setDraft]=useState(()=>profileDraft(initial));const [errors,setErrors]=useState<Record<string,string>>({}),[failure,setFailure]=useState<ApiFailure|null>(null),[sending,setSending]=useState(false),[done,setDone]=useState(false);
 const summary=useRef<HTMLDivElement>(null),dialog=useRef<HTMLDialogElement>(null),safe=useRef<HTMLButtonElement>(null),trigger=useRef<HTMLElement|null>(null),to=useRef<string|null>(null),busy=useRef(false);
 const dirty=JSON.stringify(draft)!==JSON.stringify(saved);const publicPath='/profils/'+encodeURIComponent(saved.username);
 useEffect(()=>{function before(e:BeforeUnloadEvent){if(dirty){e.preventDefault();e.returnValue='';}}
 function navigate(e:MouseEvent){if(!dirty||busy.current||e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;const anchor=(e.target as Element)?.closest<HTMLAnchorElement>('a[href]');if(!anchor||anchor.target==='_blank'||anchor.origin!==location.origin||anchor.href===location.href||anchor.pathname===location.pathname&&anchor.search===location.search)return;e.preventDefault();trigger.current=anchor;to.current=anchor.pathname+anchor.search+anchor.hash;dialog.current?.showModal();safe.current?.focus();}
 window.addEventListener('beforeunload',before);document.addEventListener('click',navigate,true);return()=>{window.removeEventListener('beforeunload',before);document.removeEventListener('click',navigate,true);};},[dirty]);
 function close(){dialog.current?.close();trigger.current?.focus();}
 function cancel(button:HTMLButtonElement){if(dirty){trigger.current=button;to.current=null;dialog.current?.showModal();safe.current?.focus();}else{setDraft(saved);setErrors({});setFailure(null);setDone(false);}}
 function change(values:Partial<ProfileDraft>){setDraft(current=>({...current,...values}));setDone(false);}
 async function submit(){if(busy.current)return;setDone(false);const next=validateProfile(draft);setErrors(next);setFailure(null);if(Object.keys(next).length){requestAnimationFrame(()=>summary.current?.focus());return;}busy.current=true;setSending(true);
  try{const profile=await client.mutate<OwnProfile>('/users/me',profilePayload(draft),'PATCH',true);if(!profile)throw Error('Réponse absente');const updated=profileDraft(profile);setSaved(updated);setDraft(updated);setDone(true);await client.refresh();}
  catch(error){const failure=apiFailure(error);setFailure(failure);setErrors(failure.fields);requestAnimationFrame(()=>summary.current?.focus());}finally{busy.current=false;setSending(false);}}
 return <div className="profile-editor profile-editor--live"><section className="profile-editor-main"><Heading as="h1" size="page">Présente-toi à la communauté</Heading><p>Choisis les informations visibles sur ton profil public.</p><div className="profile-editor-grid"><Card><OwnTerangaPoints initial={initial}/><ProfilePhoto initial={initial}/>
 <form noValidate onSubmit={e=>{e.preventDefault();void submit();}}><fieldset disabled={sending}><p className="profile-dirty" role="status">{dirty?'Modifications non enregistrées':'Profil à jour'}</p>
 {(failure||Object.keys(errors).length>0)&&<div className="account-error-summary" ref={summary} tabIndex={-1}>{failure&&<FailureMessage failure={failure}/ >}{Object.keys(errors).length>0&&<ul role="alert">{Object.entries(errors).map(([name,message])=><li key={name}><a href={'#profile-'+name}>{message}</a></li>)}</ul>}</div>}
 <TextField id="profile-username" label="Pseudonyme" autoComplete="username" required maxLength={30} value={draft.username} onChange={e=>change({username:e.target.value})} error={errors.username} help="Ce pseudonyme sera visible sur ton profil public."/>
 <TextArea id="profile-bio" label="Biographie (facultatif)" value={draft.bio} onChange={e=>change({bio:e.target.value})} error={errors.bio} help={`Décris-toi en quelques mots. ${Array.from(draft.bio).length}/500 caractères.`}/>
 <SelectField id="profile-countryCode" label="Pays (facultatif)" value={draft.countryCode} onChange={e=>change({countryCode:e.target.value})} error={errors.countryCode}><option value="">Non renseigné</option>{[...countryCodes].sort((a,b)=>countryLabel(a).localeCompare(countryLabel(b),'fr')).map(code=><option key={code} value={code}>{countryLabel(code)}</option>)}</SelectField>
 <div className="profile-skills"><p>Compétences (facultatif)</p><div>{draft.skillIds.map(id=><Button key={id} variant="secondary" aria-label={'Retirer '+(technologies.find(t=>t.id===id)?.name??'la compétence')} onClick={()=>change({skillIds:draft.skillIds.filter(s=>s!==id)})}>{technologies.find(t=>t.id===id)?.name??'Compétence'} ×</Button>)}</div><SelectField id="profile-skillIds" label="Ajouter une compétence" value="" error={errors.skillIds} help="Jusqu’à 15 compétences." disabled={draft.skillIds.length>=15} onChange={e=>{if(e.target.value)change({skillIds:[...draft.skillIds,e.target.value]});}}><option value="">Choisir une compétence</option>{technologies.filter(t=>!draft.skillIds.includes(t.id)).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</SelectField></div>
 <div className="profile-links"><p id="profile-links">Liens professionnels (facultatif)</p>{draft.links.map((value,i)=><div key={i}><TextField id={'profile-link-'+i} label={'Lien '+(i+1)} type="url" value={value} error={errors['link-'+i]??errors.links} onChange={e=>change({links:draft.links.map((v,j)=>j===i?e.target.value:v)})}/><Button variant="quiet" iconOnly aria-label={'Retirer le lien '+(i+1)} onClick={()=>change({links:draft.links.filter((_,j)=>i!==j)})}>×</Button></div>)}<Button variant="quiet" disabled={draft.links.length>=3} onClick={()=>change({links:[...draft.links,'']})}>＋ Ajouter un lien</Button><p className="jd-field__help">Maximum 3 liens HTTPS.</p></div>
 <div className="profile-actions"><Button type="submit" disabled={!dirty} loading={sending} loadingLabel="Enregistrement en cours…">Enregistrer les modifications</Button><Button variant="secondary" onClick={e=>cancel(e.currentTarget)}>Annuler</Button><Link className="account-back" href={publicPath}>Voir mon profil public →</Link></div>
 </fieldset></form><ProfileContact initial={initial}/>{done&&<Message tone="success" role="status" title="Profil enregistré">Les modifications ont été confirmées par le serveur.</Message>}</Card><Card className="profile-privacy"><Heading as="h2" size="card">Tes informations en sécurité</Heading><p>Ton adresse email de connexion reste privée et n’est pas visible sur ton profil public.</p><hr/><p>Seuls les champs que tu renseignes sont affichés. Tu peux les modifier à tout moment.</p></Card></div></section>
 <dialog ref={dialog} className="account-discard" onCancel={()=>trigger.current?.focus()}><Heading as="h2" size="card">Abandonner les modifications ?</Heading><p>Elles ne sont pas enregistrées sur le serveur.</p><div><Button ref={safe} variant="secondary" onClick={close}>Continuer la modification</Button><Button onClick={()=>{const destination=to.current;setDraft(saved);setErrors({});setFailure(null);setDone(false);close();if(destination)router.push(destination);}}>Abandonner</Button></div></dialog></div>;
}
