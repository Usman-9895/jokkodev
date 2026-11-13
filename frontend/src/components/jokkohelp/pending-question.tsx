'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {HttpError} from '@jokkodev/api-client/http';
import type {HelpSchemas,QuestionDraft} from '../../lib/jokkohelp/api';
import {questionPayload} from '../../lib/jokkohelp/api';
import {apiFailure} from '../../lib/accounts/session';
import type {ApiFailure} from '../../lib/accounts/session';
import {DraftStorageError} from '../../lib/jokkohelp/local-draft';
import {enqueueQuestion,readPending,updatePending,discardPending,pendingPayload} from '../../lib/jokkohelp/pending-publication';
import type {PendingPublication} from '../../lib/jokkohelp/pending-publication';
import {detailHref} from '../../lib/jokkohelp/query';
import {useSession} from '../accounts/session-provider';
import {Button,Heading,Message} from '../ui';
import {FailureMessage} from '../accounts/live-account-form';
import {invalidateHelp} from './live-resource';

export function usePendingQuestion(owner:string|null,fields:QuestionDraft,technologies:HelpSchemas['TechnologyDto'][],blocked:boolean,onQueue:()=>void,onFinish:()=>void,afterConfirmed:(version:string|null)=>Promise<boolean>,capturesSelected=false){
 const {client,phase}=useSession();const [record,setRecord]=useState<PendingPublication|null>(null),[sending,setSending]=useState(false),[notice,setNotice]=useState(''),[failure,setFailure]=useState<ApiFailure|null>(null);
 const current=useRef<PendingPublication|null>(null),busy=useRef(false),dialog=useRef<HTMLDialogElement>(null),safe=useRef<HTMLButtonElement>(null),trigger=useRef<HTMLElement|null>(null);
 const permit=()=>!!owner&&client.snapshot().draftOwnerId===owner;
 const verified=()=>permit()&&client.snapshot().phase==='authenticated';
 const remember=(r:PendingPublication|null)=>{current.current=r;setRecord(r);};
 const storageError=(e:unknown)=>{if(e instanceof DraftStorageError&&e.kind==='identity')return;
  setNotice(e instanceof DraftStorageError&&e.kind==='conflict'?'La question en attente a changé dans un autre onglet. Relis son état avant de continuer.':e instanceof DraftStorageError&&e.kind==='large'?'La copie dépasse 256 Kio ; aucune mise en attente confirmée.':'Le stockage local est indisponible ou plein. Aucun nouvel envoi ne part si sa copie ne peut pas être enregistrée. Ta saisie reste ouverte.');};
 useEffect(()=>{if(!owner||phase!=='authenticated')return;let live=true;
  void client.refresh().then(()=>readPending(owner,()=>live&&client.snapshot().user?.id===owner&&client.snapshot().phase==='authenticated')).then(r=>{if(live)remember(r);}).catch(e=>{if(live&&!(e instanceof DraftStorageError&&e.kind==='identity'))setNotice('Impossible de lire la mise en attente. Vérifie le stockage et tes publications avant de recommencer.');});
  return()=>{live=false;};
 },[client,owner,phase]);
 async function reload(){if(!owner)return;await client.refresh();if(!verified())return;try{remember(await readPending(owner,verified));}catch(e){storageError(e);}}
 async function enqueue(copy:QuestionDraft,sourceVersion:string|null){
  if(!owner||!permit()||busy.current)return;busy.current=true;setSending(true);setFailure(null);setNotice('');
  try{remember(await enqueueQuestion(owner,copy,sourceVersion,permit));setNotice('Question mise en attente sur cet appareil. Rien n’a été envoyé.');}
  catch(e){storageError(e);if(verified())try{remember(await readPending(owner,verified));}catch{/* Preserve typing on read failure. */}}
  finally{busy.current=false;setSending(false);}
 }
 async function send(){
  if(!owner||!permit()||busy.current)return;busy.current=true;setSending(true);setFailure(null);setNotice('');let claim:PendingPublication|null=null;
  try{
   await client.refresh();if(!verified()){setNotice('Reconnecte-toi ou rétablis le réseau pour vérifier ton compte. Aucun envoi automatique.');return;}
   const displayed=current.current,latest=await readPending(owner,verified);remember(latest);
   if(!displayed||latest?.key!==displayed.key){setNotice('La demande a changé dans un autre onglet. Relis la copie affichée avant de choisir de l’envoyer. Aucun envoi n’est parti.');return;}
   if(!latest||latest.state==='confirmed'||latest.state==='expired')return;
   claim=await updatePending(owner,latest.version,'sending',verified);remember(claim);
   const result=await client.mutate<HelpSchemas['QuestionPublicationResultDto']>('/questions/publications',pendingPayload(claim),'POST',true);
   if(!result?.questionId||!result.confirmedAt)throw new HttpError('protocol','Confirmation de publication absente.');
   try{remember(await updatePending(owner,claim.version,'confirmed',verified,result));}
   catch(e){storageError(e);remember({...claim,state:'confirmed',...result});setNotice('Publication confirmée par le serveur ; sa confirmation locale n’a pas pu être conservée. Une reprise avec la même clé retrouvera le résultat.');}
   invalidateHelp();await afterConfirmed(claim.sourceDraftVersion);
  }catch(e){
   const f=apiFailure(e);setFailure(f);
   if(claim&&permit())try{remember(await updatePending(owner,claim.version,e instanceof HttpError&&e.status===410?'expired':'uncertain',permit));}catch{/* A concurrent version or failed storage must never cause a new key. */}
   else if(e instanceof DraftStorageError)storageError(e);
  }finally{busy.current=false;setSending(false);}
 }
 async function remove(){if(!owner||!verified()||busy.current)return false;busy.current=true;setSending(true);try{const r=current.current;if(r)await discardPending(owner,r.version,verified);remember(null);setNotice('Attente retirée de cet appareil. Aucune publication n’a été supprimée du serveur.');return true;}catch(e){storageError(e);return false;}finally{busy.current=false;setSending(false);}}
 function askRemove(){trigger.current=document.activeElement as HTMLElement;dialog.current?.showModal();requestAnimationFrame(()=>safe.current?.focus());}
 function close(){dialog.current?.close();trigger.current?.focus();}
 const matchesCurrent=!!record?.payload&&JSON.stringify(record.payload)===JSON.stringify(questionPayload(fields));
 const labels={pending:'Question en attente',sending:'Envoi en cours',uncertain:'Résultat de l’envoi incertain',confirmed:'Publication confirmée',expired:'Période de reprise expirée'};
 return {record,sending,matchesCurrent,enqueue,remove,
  mayPublishDirect:async()=>{if(!owner)return true;await client.refresh();if(!verified())return false;
   try{const latest=await readPending(owner,verified);remember(latest);if(latest)setNotice('Une attente existe déjà. Envoie ou résous cette même demande avant une publication directe.');return latest===null;}
   catch(e){storageError(e);setNotice('Impossible de vérifier les envois en attente. Rétablis l’accès au stockage et vérifie Mes questions avant de publier.');return false;}},
  panel:owner?<section className="question-local-draft question-pending" aria-label="Question en attente sur cet appareil">
   <Heading as="h2" size="card">{record?labels[record.state]:'Mettre une question en attente'}</Heading>
   <p>Une seule question en attente par compte et profil navigateur. Copie figée, 256 Kio maximum ; reprise pendant <strong>7 jours</strong>, sans prolongation. Le retour du réseau n’envoie rien.</p>
   {capturesSelected&&<Message tone="warning" title="Captures : connexion nécessaire">L’attente conserve uniquement le texte. <a href="#question-images">Retire explicitement les captures sélectionnées</a> avant de mettre cette question en attente. Elles ne seront pas retirées automatiquement.</Message>}
   {!record&&<Button variant="secondary" disabled={blocked||sending} onClick={onQueue}>Mettre en attente sur cet appareil</Button>}
   {record&&<>
    {record.payload&&<p><strong>Copie à envoyer :</strong> {record.payload.title}</p>}
    {record.payload&&<details className="question-pending-copy"><summary>Relire la copie en attente</summary><dl>{([['Contexte','context'],['Résultat attendu','expected'],['Résultat obtenu','actual'],['Ce que tu as essayé','attempts']] as const).map(([label,key])=><div key={key}><dt>{label}</dt><dd>{record.payload![key]}</dd></div>)}<div><dt>Technologies</dt><dd>{record.payload.technologyIds.map(id=>technologies.find(t=>t.id===id)?.name??'Technologie retirée du catalogue').join(', ')}</dd></div></dl>{record.payload.code&&<><p>Extrait de code · {record.payload.codeLanguage||'Texte'}</p><pre><code>{record.payload.code}</code></pre></>}</details>}
    <p>Reprise jusqu’au <time dateTime={new Date(record.expiresAt).toISOString()}>{new Date(record.expiresAt).toLocaleString('fr-FR',{timeZone:'UTC'})} UTC</time>. Modifier le formulaire ne change pas cette copie.</p>
    {record.state==='expired'?<Message tone="warning" title="Ne recommence pas sans vérifier">La copie de contenu a été retirée. Vérifie <Link href="/espace/questions">Mes questions</Link> avant de retirer cette attente et préparer une nouvelle demande. Sa clé ne sera pas régénérée automatiquement.</Message>:
     record.state==='confirmed'?<><Message tone="success" title="Confirmation reçue du serveur"><Link href={detailHref(record.questionId!)}>Voir la question publiée</Link></Message><Button disabled={sending} onClick={onFinish}>Terminer cette attente</Button></>:
     <><p>{record.state==='uncertain'?'La première tentative a pu réussir. Reprendre utilise exactement la même clé et le même contenu pour éviter un doublon.':'La copie doit être envoyée volontairement après vérification de ton compte.'}</p><Button disabled={sending||blocked} loading={sending} loadingLabel="Envoi en cours…" onClick={()=>void send()}>{record.state==='uncertain'?'Reprendre le même envoi':'Envoyer la question'}</Button></>}
    {record.state!=='confirmed'&&<Button variant="quiet" disabled={sending||phase!=='authenticated'} onClick={askRemove}>Retirer cette attente</Button>}
   </>}
   <Button variant="quiet" disabled={sending||phase!=='authenticated'} onClick={()=>void reload()}>Relire l’état local</Button>
   {failure&&<FailureMessage failure={failure}/>}<p role="status">{notice}</p>
   <dialog ref={dialog} className="contribution-dialog" aria-label="Retirer la question en attente" onCancel={()=>trigger.current?.focus()}><Heading as="h2" size="card">Retirer cette attente ?</Heading><p>{record?.attempted?'Un envoi a été tenté et peut avoir réussi. Vérifie Mes questions avant de retirer cette clé. Une nouvelle demande aura une autre clé et pourrait créer un doublon.':'Cette action retire seulement la copie en attente. Elle ne supprime pas la saisie du formulaire ni une question sur le serveur.'}</p><div className="contribution-actions"><Button ref={safe} variant="secondary" onClick={close}>Conserver l’attente</Button><Button onClick={()=>{close();void remove();}}>{record?.attempted?'J’ai vérifié, retirer cette attente':'Retirer de cet appareil'}</Button></div></dialog>
  </section>:null};
}
