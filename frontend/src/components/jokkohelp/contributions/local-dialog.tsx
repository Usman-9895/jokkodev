'use client';
import {useEffect,useRef} from 'react';
import type {KeyboardEvent} from 'react';
import {Button,Heading} from '../../ui';
export function useLocalDraftWarning(dirty:boolean){
 const unsaved=useRef(dirty);
 useEffect(()=>{unsaved.current=dirty;},[dirty]);
 useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(unsaved.current){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[]);
 return ()=>{unsaved.current=false;};
}
export function LocalDialogAction({label,title,description,confirmLabel,onConfirm,skip=false}:{label:string;title:string;description:string;confirmLabel:string;onConfirm:()=>void;skip?:boolean}){
 const dialog=useRef<HTMLDialogElement>(null);const safe=useRef<HTMLButtonElement>(null);const trigger=useRef<HTMLButtonElement>(null);
 function close(){dialog.current?.close();trigger.current?.focus();}
 function containFocus(event:KeyboardEvent<HTMLDialogElement>){
  if(event.key!=='Tab')return;
  const buttons=event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
  const first=buttons[0],last=buttons[buttons.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
 }
 return <><Button ref={trigger} className="contribution-dialog-trigger" variant="secondary" onClick={()=>{if(skip){onConfirm();return;}dialog.current?.showModal();safe.current?.focus();}}>{label}</Button><dialog className="contribution-dialog" ref={dialog} aria-label={title} onKeyDown={containFocus} onCancel={()=>trigger.current?.focus()}><Heading as="h2" size="card">{title.replace(' ?', '\u00a0?')}</Heading><p>{description}</p><div><Button ref={safe} variant="secondary" onClick={close}>Annuler</Button><Button onClick={()=>{onConfirm();close();}}>{confirmLabel}</Button></div></dialog></>;
}
