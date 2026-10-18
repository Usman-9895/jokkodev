'use client';
import {useEffect,useRef,useId} from 'react';
import {useRouter} from 'next/navigation';
import {Button,Heading} from '../ui';
/** In-memory drafts only. Native dialog handles focus confinement and Escape. */
export function useDraftGuard(dirty:boolean){const titleId=useId();const router=useRouter(),dialog=useRef<HTMLDialogElement>(null),safe=useRef<HTMLButtonElement>(null),trigger=useRef<HTMLElement|null>(null),next=useRef<()=>void>(()=>{}),unsaved=useRef(dirty);useEffect(()=>{unsaved.current=dirty;},[dirty]);
 function close(){dialog.current?.close();trigger.current?.focus();}
 function ask(action:()=>void){if(!unsaved.current){action();return;}trigger.current=document.activeElement as HTMLElement;next.current=action;dialog.current?.showModal();safe.current?.focus();}
 useEffect(()=>{const before=(event:BeforeUnloadEvent)=>{if(unsaved.current){event.preventDefault();event.returnValue='';}};const navigate=(event:MouseEvent)=>{if(!unsaved.current||event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;const a=(event.target as Element)?.closest<HTMLAnchorElement>('a[href]');if(!a||a.target==='_blank'||a.origin!==location.origin||a.pathname===location.pathname&&a.search===location.search)return;event.preventDefault();trigger.current=a;next.current=()=>router.push(a.pathname+a.search+a.hash);dialog.current?.showModal();safe.current?.focus();};window.addEventListener('beforeunload',before);document.addEventListener('click',navigate,true);return()=>{window.removeEventListener('beforeunload',before);document.removeEventListener('click',navigate,true);};},[router]);
 return {allowExit:()=>{unsaved.current=false;},ask,dialog:<dialog ref={dialog} className="contribution-dialog" aria-labelledby={titleId} onCancel={()=>trigger.current?.focus()}><Heading as="h2" id={titleId} size="card">Abandonner les modifications ?</Heading><p>Elles ne sont pas enregistrées sur le serveur.</p><div><Button ref={safe} variant="secondary" onClick={close}>Continuer la saisie</Button><Button onClick={()=>{unsaved.current=false;close();next.current();}}>Abandonner</Button></div></dialog>};
}
