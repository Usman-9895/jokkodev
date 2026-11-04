'use client';
import {useEffect,useRef,useState} from 'react';
import {useSession} from '../accounts/session-provider';
import {Button,Heading} from '../ui';
import type {QuestionDraft} from '../../lib/jokkohelp/api';
import {DraftStorageError,readLocalDraft,saveLocalDraft,removeLocalDraft,markDraftUncertain} from '../../lib/jokkohelp/local-draft';
import type {LocalQuestionDraft} from '../../lib/jokkohelp/local-draft';

export function useLocalQuestionDraft(ownerId:string|null,fields:QuestionDraft,restore:(fields:QuestionDraft,uncertain:boolean)=>void,uncertain:boolean){
 const {client,phase}=useSession();const [record,setRecord]=useState<LocalQuestionDraft|null>(null),[feedback,setFeedback]=useState(''),[busy,setBusy]=useState(false),[action,setAction]=useState<'resume'|'save'|'delete'|null>(null);
 const known=useRef<LocalQuestionDraft|null>(null),dialog=useRef<HTMLDialogElement>(null),safe=useRef<HTMLButtonElement>(null),trigger=useRef<HTMLElement|null>(null),locked=useRef(false);
 const permit=()=>!!ownerId&&client.snapshot().draftOwnerId===ownerId;
 const verified=()=>permit()&&client.snapshot().phase==='authenticated';
 function remember(r:LocalQuestionDraft|null){known.current=r;setRecord(r);}
 const problem=(e:unknown)=>{if(e instanceof DraftStorageError&&e.kind==='identity')return;
  setFeedback(e instanceof DraftStorageError&&e.kind==='conflict'?'Un autre onglet a modifié ce brouillon. Vérifie la version enregistrée avant de la remplacer.':e instanceof DraftStorageError&&e.kind==='large'?'Le brouillon dépasse 256 Kio. Réduis le contenu ; ta saisie reste ouverte.':'Le stockage local est indisponible, plein ou illisible. Ta saisie reste ouverte ; aucun enregistrement confirmé.');};
 useEffect(()=>{
  if(!ownerId||phase!=='authenticated')return;
  let live=true;
  const access=()=>live&&client.snapshot().phase==='authenticated'&&client.snapshot().user?.id===ownerId;
  void client.refresh().then(()=>readLocalDraft(ownerId,access)).then(r=>{if(live){known.current=r;setRecord(r);}}).catch(e=>{if(live&&!(e instanceof DraftStorageError&&e.kind==='identity'))setFeedback('Impossible de lire le stockage local. Tu peux continuer la saisie sans enregistrement local.');});
  return()=>{live=false;};
 },[client,ownerId,phase]);
 async function run(task:()=>Promise<void>){if(locked.current)return;locked.current=true;setBusy(true);try{await task();}catch(e){
  if(e instanceof DraftStorageError&&e.kind==='conflict'&&ownerId&&verified())try{remember(await readLocalDraft(ownerId,verified));}catch{/* Keep current typing if reading also fails. */}
  problem(e);
 }finally{locked.current=false;setBusy(false);}}
 function close(){dialog.current?.close();setAction(null);trigger.current?.focus();}
 function ask(next:'resume'|'save'|'delete'){trigger.current=document.activeElement as HTMLElement;setAction(next);dialog.current?.showModal();requestAnimationFrame(()=>safe.current?.focus());}
 async function save(){if(!ownerId||!permit())return;await run(async()=>{const r=await saveLocalDraft(ownerId,fields,known.current?.version??null,uncertain,permit);remember(r);setFeedback('Brouillon enregistré sur cet appareil.');});}
 async function resume(){if(!ownerId||!verified())return;await run(async()=>{await client.refresh();if(!verified())return;const r=await readLocalDraft(ownerId,verified);if(!r){remember(null);setFeedback('Le brouillon a expiré ou a été supprimé.');return;}remember(r);restore(r.fields,r.uncertain);setFeedback('Brouillon repris. Rien n’a été publié.');});}
 async function remove(){if(!ownerId||!verified())return;await run(async()=>{await client.refresh();if(!verified())return;const current=known.current;if(current)await removeLocalDraft(ownerId,current.version,verified);remember(null);setFeedback('Brouillon supprimé de cet appareil. La saisie ouverte est conservée.');});}
 async function confirm(){const next=action;close();if(next==='save')await save();if(next==='resume')await resume();if(next==='delete')await remove();}
 const isSaved=!!record&&JSON.stringify(record.fields)===JSON.stringify(fields)&&record.uncertain===uncertain;
 return {
  isSaved,version:()=>known.current?.version??null,changed:()=>setFeedback(''),
  afterPublished:async(version:string|null)=>{if(!ownerId||!version)return true;try{await removeLocalDraft(ownerId,version,verified);remember(null);return true;}catch(e){problem(e);setFeedback('La question est publiée, mais le brouillon local est conservé (stockage indisponible ou version modifiée). Ne republie pas cette question.');return false;}},
  afterUncertain:async(version:string|null)=>{if(!ownerId||!version)return;try{await markDraftUncertain(ownerId,version,permit);if(known.current?.version===version)remember({...known.current,uncertain:true});}catch(e){problem(e);}},
  panel:ownerId?<section className="question-local-draft" aria-label="Brouillon local de question">
   <Heading as="h2" size="card">Ton brouillon sur cet appareil</Heading>
   <p>Un brouillon par compte, conservé <strong>7 jours après le dernier enregistrement</strong> (256 Kio maximum). Pas de sauvegarde automatique ni d’envoi hors connexion. Évite les secrets et les appareils partagés.</p>
   {phase==='unavailable'&&<p role="status">La session ne peut pas être revérifiée au réseau. Tu peux continuer cette rédaction déjà ouverte et l’enregistrer ; reprendre un autre brouillon ou publier exige le retour de la connexion.</p>}
   {record&&phase==='authenticated'&&<><p>Un brouillon est disponible jusqu’au <time dateTime={new Date(record.expiresAt).toISOString()}>{new Date(record.expiresAt).toLocaleString('fr-FR',{timeZone:'UTC'})} UTC</time>.</p><div className="contribution-actions"><Button variant="secondary" disabled={busy} onClick={()=>ask('resume')}>Reprendre le brouillon</Button><Button variant="quiet" disabled={busy} onClick={()=>ask('delete')}>Supprimer le brouillon</Button></div><p>Si un précédent envoi était incertain, vérifie Mes questions avant de publier à nouveau.</p></>}
   <Button variant="secondary" disabled={busy} onClick={()=>{if(known.current&&!isSaved)ask('save');else void save();}}>Enregistrer le brouillon sur cet appareil</Button>
   <p role="status">{feedback|| (isSaved?'Cette saisie correspond au brouillon enregistré.':'Les changements restent en mémoire tant que tu ne les enregistres pas.')}</p>
   <dialog ref={dialog} className="contribution-dialog" aria-label="Confirmer l’action sur le brouillon" onCancel={()=>{setAction(null);trigger.current?.focus();}}>
    <Heading as="h2" size="card">{action==='resume'?'Reprendre le brouillon ?':action==='save'?'Remplacer le brouillon enregistré ?':'Supprimer le brouillon ?'}</Heading>
    <p>{action==='resume'?'Le brouillon remplacera la saisie actuellement ouverte. Choisis de conserver ta saisie si tu ne veux pas la remplacer.':action==='save'?'La saisie ouverte remplacera le brouillon déjà enregistré sur cet appareil.':'Seul le brouillon enregistré sera supprimé. La saisie ouverte ne sera pas effacée.'}</p>
    <div className="contribution-actions"><Button ref={safe} variant="secondary" onClick={close}>Conserver ma saisie</Button><Button onClick={()=>void confirm()}>{action==='resume'?'Reprendre et remplacer la saisie':action==='save'?'Remplacer le brouillon':'Supprimer de cet appareil'}</Button></div>
   </dialog>
  </section>:null,
 };
}
