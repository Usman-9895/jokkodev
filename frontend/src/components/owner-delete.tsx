'use client';
import {useId,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {DecisionLock} from '../lib/applications/api';
import {mayDelete,readDeletion} from '../lib/owner-deletion';
import type {DeletionKind} from '../lib/owner-deletion';
import {apiFailure} from '../lib/accounts/session';
import type {ApiFailure} from '../lib/accounts/session';
import {useSession} from './accounts/session-provider';
import {FailureMessage} from './accounts/live-account-form';
import {invalidateHelp} from './jokkohelp/live-resource';
import {containModalFocus} from './reports/live-shared';
import {Button,Heading,Message} from './ui';

type Props={kind:DeletionKind;id:string;title:string;ownerId:string;deletedAt?:string|null};
export function OwnerDelete(props:Props){const {phase,user,revision}=useSession();return mayDelete(phase,user?.id,props.ownerId,props.deletedAt)?<DeleteAction key={user!.id+':'+revision} {...props}/>:null;}
function DeleteAction({kind,id,title}:Props){
  const {client}=useSession(),router=useRouter(),heading=useId(),dialog=useRef<HTMLDialogElement>(null),safe=useRef<HTMLButtonElement>(null),trigger=useRef<HTMLButtonElement>(null),notice=useRef<HTMLDivElement>(null);
  const [lock]=useState(()=>new DecisionLock()),[waiting,setWaiting]=useState(false),[uncertain,setUncertain]=useState(false),[failure,setFailure]=useState<ApiFailure|null>(null),[message,setMessage]=useState('');
  const noun=kind==='question'?'la question':'le projet';
  function focus(){requestAnimationFrame(()=>notice.current?.focus());}
  function close(){dialog.current?.close();trigger.current?.focus();}
  function completed(){close();invalidateHelp(true);router.replace(kind==='question'?'/espace/questions':'/espace/projets');router.refresh();}
  async function remove(){if(lock.busy||lock.needsRead)return;setWaiting(true);setFailure(null);setMessage('');try{const confirmed=await lock.run(async()=>{await client.mutate(kind==='question'?'/questions/'+encodeURIComponent(id):'/projects/'+encodeURIComponent(id),undefined,'DELETE',true);return true;});if(confirmed)completed();}catch(e){setFailure(apiFailure(e));setUncertain(lock.needsRead);setMessage(lock.needsRead?'Réponse perdue : la suppression peut avoir abouti. Relis l’état privé ; aucune suppression n’est rejouée.':'La suppression n’a pas été confirmée. Tu peux annuler ou réessayer explicitement.');focus();}finally{setWaiting(false);}}
  async function reread(){if(lock.busy)return;setWaiting(true);setFailure(null);try{const state=await lock.read(()=>readDeletion(kind,id,(path,query)=>client.read(path,undefined,true,query)));if(state==='deleted'){completed();return;}setUncertain(state!=='active');if(state==='unknown')lock.needsRead=true;setMessage(state==='active'?'Le serveur indique que ce contenu est encore actif. Tu peux confirmer un nouvel envoi explicitement.':'La référence privée n’a pas été retrouvée : suppression non confirmée. Aucun envoi rejoué.');invalidateHelp();focus();}catch(e){setFailure(apiFailure(e));focus();}finally{setWaiting(false);}}
  return <><Button ref={trigger} variant="secondary" className="owner-delete-button" onClick={()=>{dialog.current?.showModal();safe.current?.focus();}}>Supprimer {noun}</Button><dialog ref={dialog} className="contribution-dialog owner-delete-dialog" tabIndex={-1} aria-labelledby={heading} onKeyDown={containModalFocus} onCancel={e=>{if(waiting)e.preventDefault();else trigger.current?.focus();}}><Heading as="h2" id={heading} size="card">Supprimer {noun}{'\u00a0'}?</Heading><p><strong>{title}</strong></p><p>Ce contenu sera retiré des vues publiques. {kind==='question'?'Ses réponses ne seront plus publiques et la solution acceptée sera retirée. Les réponses et relations seront conservées en base.':'Le recrutement sera fermé. Les nouvelles candidatures et décisions seront bloquées ; membres et candidatures conserveront leurs relations et statuts.'}</p><p>Il s’agit d’une suppression logique, distincte d’une sanction. Aucune restauration n’est proposée dans l’interface actuelle.</p><div ref={notice} tabIndex={-1}>{failure&&<FailureMessage failure={failure}/>}<div role="status">{message&&<Message title={uncertain?'Résultat incertain':'État de la suppression'}>{message}</Message>}</div></div><div className="contribution-actions"><Button ref={safe} variant="secondary" disabled={waiting} onClick={close}>Annuler</Button>{uncertain?<Button loading={waiting} onClick={()=>void reread()}>Relire l’état privé</Button>:<Button className="owner-delete-confirm" loading={waiting} loadingLabel="Suppression en cours…" onClick={()=>void remove()}>Confirmer la suppression</Button>}</div></dialog></>;
}
