'use client';
import {useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import type {components} from '@jokkodev/api-client';
import {HttpError} from '@jokkodev/api-client/http';
import {useSession} from '../accounts/session-provider';
import {apiFailure} from '../../lib/accounts/session';
import {validateReason} from '../../lib/reports/api';
import {Button,Card,Heading,TextArea} from '../ui';
import {containModalFocus,useAdminResource,ReportFailure,ReportLoading} from './live-shared';
import {HelpPages} from '../jokkohelp/live-list';
import {FailureMessage} from '../accounts/live-account-form';
import type {ApiFailure} from '../../lib/accounts/session';
type Account=components['schemas']['AdminUserDto'];
type Result=components['schemas']['ModerationActionDto'];
export function SuspendedAccounts(){
 const params=useSearchParams(),n=Number(params.get('page')),page=Number.isSafeInteger(n)&&n>0?n:1;
 const list=useAdminResource<components['schemas']['AdminUserPageDto']>('/admin/suspended-accounts',{page,pageSize:10});
 const {client}=useSession(),[selected,setSelected]=useState<Account|null>(null),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState<string>(),[failure,setFailure]=useState<ApiFailure|null>(null),[message,setMessage]=useState('');
 const dialog=useRef<HTMLDialogElement>(null),cancel=useRef<HTMLButtonElement>(null),trigger=useRef<HTMLElement|null>(null),lock=useRef(false);
 function close(){if(lock.current)return;dialog.current?.close();trigger.current?.focus();setSelected(null);}
 function open(account:Account){trigger.current=document.activeElement as HTMLElement;setSelected(account);setReason('');setError(undefined);setFailure(null);dialog.current?.showModal();cancel.current?.focus();}
 async function submit(){if(!selected||lock.current)return;const invalid=validateReason(reason);if(invalid){setError(invalid);document.getElementById('reactivation-reason')?.focus();return;}lock.current=true;setBusy(true);setFailure(null);try{
  const result=await client.mutate<Result>('/admin/accounts/'+encodeURIComponent(selected.id)+'/reactivate',{reason},'POST',true);
  if(!result||result.decision!=='REACTIVATE_ACCOUNT'||result.target.id!==selected.id)throw Error('Réponse serveur incomplète.');
  setMessage('Compte '+selected.username+' réactivé. Motif et décision enregistrés. Une nouvelle connexion est nécessaire.');list.retry();lock.current=false;close();
 }catch(e){setFailure(apiFailure(e));setMessage('Réactivation non confirmée. Actualise la liste avant toute nouvelle décision.');if(e instanceof HttpError&&e.status===403)void client.refresh();}finally{lock.current=false;setBusy(false);}}
 return <><Heading as="h1" size="page">Comptes suspendus</Heading><p className="moderation-intro">Réactive un compte après examen. Les anciennes sessions restent révoquées et les décisions sur ses contenus sont conservées.</p><p role="status">{message}</p>{list.error?<ReportFailure error={list.error} retry={list.retry}/>:!list.data?<ReportLoading/>:<><p>{list.data.meta.total} comptes suspendus</p>{!list.data.data.length?<Card><p>Aucun compte suspendu sur cette page.</p></Card>:list.data.data.map(account=><Card key={account.id} className="reactivation-account"><Heading as="h2" size="card">{account.username}</Heading><p>Compte suspendu</p><Button variant="secondary" onClick={()=>open(account)}>Examiner la réactivation de {account.username}</Button></Card>)}<HelpPages page={page} total={list.data.meta.total} pageSize={10} label="Pagination des comptes suspendus" href={p=>'/admin/comptes-suspendus?page='+p}/></>}<Button variant="quiet" onClick={()=>list.retry()}>Actualiser la liste</Button>
 <dialog ref={dialog} className="contribution-dialog" aria-labelledby="reactivation-title" onKeyDown={containModalFocus} onCancel={e=>{if(lock.current)e.preventDefault();else{trigger.current?.focus();setSelected(null);}}}>
 <Heading as="h2" id="reactivation-title" size="card">Réactiver le compte de {selected?.username} ?</Heading><p>Le membre pourra se reconnecter. Ses anciennes sessions et les décisions sur ses contenus ne seront pas rétablies.</p>
 {failure&&<FailureMessage failure={failure}/>}<TextArea id="reactivation-reason" label="Motif de la réactivation" required minLength={10} maxLength={1000} rows={4} value={reason} onChange={e=>{setReason(e.target.value);setError(undefined);}} error={error} disabled={busy} help="10 à 1 000 caractères. Conservé dans l’historique privé de modération."/>
 <div><Button ref={cancel} variant="secondary" onClick={close} disabled={busy}>Annuler</Button><Button loading={busy} onClick={()=>void submit()}>Réactiver le compte</Button></div></dialog></>;
}
