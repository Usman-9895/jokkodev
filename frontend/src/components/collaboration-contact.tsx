'use client';
import {useEffect,useId,useRef,useState} from 'react';
import type {components} from '@jokkodev/api-client';
import {Button,Heading,LoadingIndicator} from './ui';
import {useSession} from './accounts/session-provider';
import {apiFailure} from '../lib/accounts/session';
import type {ApiFailure} from '../lib/accounts/session';
import {FailureMessage} from './accounts/live-account-form';
import {containModalFocus} from './reports/live-shared';

export function CollaborationContact(props:{projectId:string;userId:string;name:string}) {const {phase,user,revision}=useSession();return phase==='authenticated'&&user?<Contact key={user.id+':'+revision} {...props}/>:null;}
function Contact({projectId,userId,name}:{projectId:string;userId:string;name:string}) {
 const {client}=useSession(),heading=useId(),dialog=useRef<HTMLDialogElement>(null),safe=useRef<HTMLButtonElement>(null),trigger=useRef<HTMLButtonElement>(null);const [open,setOpen]=useState(false),[retry,setRetry]=useState(0),[result,setResult]=useState<{contact:string|null}|null>(null),[failure,setFailure]=useState<ApiFailure|null>(null);
 useEffect(()=>{if(!open)return;const abort=new AbortController();setResult(null);setFailure(null);client.read<components['schemas']['CollaborationContactDto']>('/projects/'+encodeURIComponent(projectId)+'/members/'+encodeURIComponent(userId)+'/contact',abort.signal,true).then(v=>{if(!abort.signal.aborted)setResult(v);}).catch(e=>{if(!abort.signal.aborted)setFailure(apiFailure(e));});const hide=()=>{if(document.visibilityState==='hidden'){dialog.current?.close();setOpen(false);setResult(null);}};document.addEventListener('visibilitychange',hide);return()=>{abort.abort();document.removeEventListener('visibilitychange',hide);};},[client,open,retry,projectId,userId]);
 function close(){dialog.current?.close();setOpen(false);setResult(null);trigger.current?.focus();}
 const contact=result?.contact,href=contact?(contact.startsWith('https://')?contact:'mailto:'+encodeURIComponent(contact)):null;
 return <><Button ref={trigger} variant="secondary" onClick={()=>{setOpen(true);dialog.current?.showModal();safe.current?.focus();}}>Contacter<span className="sr-only"> {name}</span></Button><dialog ref={dialog} className="contribution-dialog" aria-labelledby={heading} onKeyDown={containModalFocus} onCancel={()=>{setOpen(false);setResult(null);trigger.current?.focus();}}><Heading as="h2" size="card" id={heading}>Contacter {name}</Heading><p>Contact privé partagé pour ce projet. Aucun message n’est envoyé automatiquement.</p>{failure?<><FailureMessage failure={failure}/><Button variant="secondary" onClick={()=>setRetry(v=>v+1)}>Vérifier à nouveau l’accès</Button></>:!result?<LoadingIndicator label="Vérification de l’accès au contact…"/>:href?<a className="jd-button jd-button--primary collaboration-link" href={href} target="_blank" rel="noopener noreferrer">{contact}</a>:<p role="status">Contact non renseigné ou partage désactivé.</p>}<div className="contribution-actions"><Button ref={safe} variant="secondary" onClick={close}>Fermer</Button></div></dialog></>;
}
