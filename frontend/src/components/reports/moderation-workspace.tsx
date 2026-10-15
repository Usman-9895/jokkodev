'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {Avatar,Card,Heading,Message,StatusBadge} from '../ui';
import {QuestionContent} from '../jokkohelp/content';
import {displayDate} from '../../lib/jokkohelp/presentation';
import {createReportExamples} from '../../lib/reports/demo';
import type {DemoReport} from '../../lib/reports/demo';
import {actionLabels,canDemonstrateModeration,moderationHref,selectReportExamples,simulateModerationEffect,targetLabels} from '../../lib/reports/presentation';
import type {DemoModerationAction,DemoModerationOutcome,DemoModerationRole,ReportCriteria} from '../../lib/reports/presentation';
import {DemoDecisionForm} from './decision-form';
import {ModerationReadState} from './read-state';

export function ModerationWorkspace({view='list',id,criteria,state='initial',role='administrator',outcome='success'}:{view?:string;id?:string;criteria:ReportCriteria;state?:string;role?:DemoModerationRole;outcome?:DemoModerationOutcome}) {
  const router=useRouter(),[examples,setExamples]=useState(()=>state==='empty'?[]:createReportExamples(state==='paginated',state==='long'));
  const [busy,setBusy]=useState(false),[feedback,setFeedback]=useState(''),[access,setAccess]=useState(''),[conflicted,setConflicted]=useState(false);
  const lock=useRef(false),result=useRef<HTMLDivElement>(null);
  const context:Record<string,string>={...(state!=='initial'?{state}:{}),...(outcome!=='success'?{outcome}:{})};
  const listHref=moderationHref(criteria,context),retryHref=moderationHref(criteria,{...context,state:state==='paginated'?'paginated':'initial'});
  const report=examples.find(r=>r.id===id),readState=access||(['visitor','expired'].includes(role)?role:role!=='administrator'?'denied':['loading','empty','error','no-results'].includes(state)?state:'');
  async function decide(action:DemoModerationAction,reason:string) {
    if(!report||!canDemonstrateModeration(role,report.status,lock.current)||conflicted||access||state==='sending'||action==='hide'&&report.contentHidden||action==='suspend'&&report.accountSuspended)return;
    lock.current=true;setBusy(true);setFeedback('Décision simulée en cours…');
    try {
      await new Promise(resolve=>setTimeout(resolve,400));
      if(outcome==='success') {
        setExamples(current=>current.map(r=>r.id===report.id?{...r,...simulateModerationEffect(r,action,outcome),history:[...r.history,{action,reason,actor:'Administration fictive',date:new Date().toISOString()}]}:r));
        setFeedback('Simulation locale affichée : '+actionLabels[action]+'. Aucun effet serveur ou changement des contenus publics.');
      } else if(outcome==='expired'||outcome==='denied') {
        setAccess(outcome);setFeedback('Démonstration : accès interrompu, aucune décision enregistrée.');
      } else if(outcome==='conflict') {
        setConflicted(true);setFeedback('Conflit simulé : un autre traitement est intervenu. Aucune réussite annoncée ; relire l’état avant toute nouvelle décision.');
      } else setFeedback('Erreur simulée : aucune décision enregistrée. La saisie du motif est conservée.');
    } finally {lock.current=false;setBusy(false);requestAnimationFrame(()=>result.current?.focus());}
  }
  const selected=selectReportExamples(examples,criteria),data=state==='no-results'?[]:selected.data;
  const canonicalHref=moderationHref({...criteria,page:selected.meta.page},context);
  useEffect(()=>{if(role==='administrator'&&!readState&&view!=='detail'&&criteria.page!==selected.meta.page)router.replace(canonicalHref);},[canonicalHref,criteria.page,selected.meta.page,role,readState,view,router]);
  return <>
    {view==='detail'&&<nav className="help-breadcrumb" aria-label="Fil d’Ariane"><Link href={listHref}>Signalements</Link><span>/</span><span>Détail</span></nav>}
    <div className="moderation-heading"><Heading as="h1" size="page">{view==='detail'?'Examiner un signalement':'Signalements'}</Heading>{!readState&&view==='detail'&&report&&<ReportStatus report={report}/>}</div>
    {view!=='detail'&&<p className="moderation-intro">Examine les contenus signalés et conserve les décisions.</p>}
    {view!=='detail'&&role==='administrator'&&!access&&<div className="moderation-filters"><label htmlFor="report-status">État<select id="report-status" className="jd-control" value={criteria.status} onChange={event=>router.push(moderationHref({status:event.target.value as ReportCriteria['status'],page:1},context))}><option value="all">Tous les états</option><option value="open">Ouverts</option><option value="closed">Clôturés</option></select></label><nav className="moderation-tabs" aria-label="État des signalements">{(['all','open','closed'] as const).map(status=><Link key={status} href={moderationHref({status,page:1},context)} aria-current={criteria.status===status?'page':undefined}>{status==='all'?'Tous':status==='open'?'Ouverts':'Clôturés'}{!['loading','error','no-results'].includes(state)&&<> ({examples.filter(r=>status==='all'||r.status===status).length})</>}</Link>)}</nav></div>}
    {readState?<ModerationReadState state={readState} retry={retryHref}/>:view==='detail'?!report?<ModerationReadState state="not-found" retry={listHref}/>:<>
      <div className="moderation-detail-grid"><ReportContext report={report}/><div>{report.status==='closed'?<Card><Heading as="h2" size="card">Signalement clôturé — lecture seule</Heading><p>Aucune nouvelle décision proposée sur cet exemple.</p></Card>:conflicted?<Card><Heading as="h2" size="card">État à relire</Heading><Message tone="warning" title="Conflit de démonstration">Aucun nouvel état serveur n’est connu. Les décisions restent bloquées jusqu’à relecture.</Message><button className="jd-button jd-button--secondary" onClick={()=>{setExamples(createReportExamples(state==='paginated',state==='long'));setConflicted(false);setFeedback('Exemples relus localement, sans réponse serveur.');}}>Relire les exemples</button></Card>:<DemoDecisionForm key={report.id+report.history.length} report={report} busy={busy||state==='sending'} onDecision={(a,r)=>{void decide(a,r);}}/>}</div></div>
      <ModerationHistory report={report}/>
    </>:<>

      {!data.length?<ModerationReadState state={selected.meta.sourceEmpty?'empty':'no-results'} retry={moderationHref({status:'all',page:1},context)}/>:<Card className="moderation-table-card"><table className="moderation-table"><caption className="sr-only">Signalements fictifs, réservés à la démonstration d’administration</caption><thead><tr>{['Contenu','Type','Motif','État','Date','Action'].map(label=><th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{data.map(r=><tr key={r.id}><td data-label="Contenu"><strong>{r.target.title}</strong></td><td data-label="Type"><span className="jd-badge jd-tone--info">{targetLabels[r.target.kind]}</span></td><td data-label="Motif">{r.reason}</td><td data-label="État"><ReportStatus report={r}/></td><td data-label="Date"><time dateTime={r.date}>{displayDate(r.date)}</time></td><td data-label="Action"><Link className={'jd-button jd-button--'+(r.status==='open'?'primary':'secondary')} href={moderationHref({...criteria,page:selected.meta.page},{...context,view:'detail',id:r.id})}>{r.status==='open'?'Examiner':'Voir la décision'}</Link></td></tr>)}</tbody></table><nav className="moderation-pagination" aria-label="Pagination des signalements">{selected.meta.page>1?<Link className="jd-button jd-button--secondary" aria-label="Page précédente" href={moderationHref({...criteria,page:selected.meta.page-1},context)}>←</Link>:<button className="jd-button jd-button--secondary" disabled aria-label="Page précédente">←</button>}{Array.from({length:selected.meta.totalPages},(_,i)=><Link key={i} className={'jd-button jd-button--'+(selected.meta.page===i+1?'primary':'secondary')} aria-current={selected.meta.page===i+1?'page':undefined} href={moderationHref({...criteria,page:i+1},context)}>{i+1}</Link>)}{selected.meta.page<selected.meta.totalPages?<Link className="jd-button jd-button--secondary" aria-label="Page suivante" href={moderationHref({...criteria,page:selected.meta.page+1},context)}>→</Link>:<button className="jd-button jd-button--secondary" disabled aria-label="Page suivante">→</button>}<span>{(selected.meta.page-1)*4+1} à {Math.min(selected.meta.page*4,selected.meta.total)} sur {selected.meta.total} signalements fictifs</span></nav></Card>}
    </>}
    {(feedback||state==='sending')&&<Message ref={result} tabIndex={-1} role="status" title="Démonstration uniquement">{feedback||'Décision simulée en cours ; actions désactivées.'}</Message>}
  </>;
}
function ReportStatus({report}:{report:DemoReport}){return <StatusBadge tone={report.status==='open'?'warning':'success'}>{report.status==='open'?'Ouvert':'Clôturé'}</StatusBadge>;}
function ReportContext({report}:{report:DemoReport}) {
  return <Card className="moderation-report-context"><Heading as="h2" size="card">Contenu signalé</Heading><dl><div><dt>Type de contenu</dt><dd>{targetLabels[report.target.kind]}</dd></div><div><dt>Contenu associé</dt><dd><Link href={report.target.href}>{report.target.title}</Link></dd></div><div><dt>Auteur du contenu fictif</dt><dd className="moderation-person"><Avatar name={report.target.author} decorative/><span>{report.target.author}</span></dd></div><div><dt>Aperçu du contenu public fictif</dt><dd><QuestionContent blocks={report.target.content}/></dd></div><div><dt>Motif du signalement fictif</dt><dd className="moderation-reason">{report.reason}</dd></div><div><dt>Déclarant fictif</dt><dd className="moderation-person"><Avatar name={report.reporter} decorative/>{report.reporter}</dd></div><div><dt>Date du signalement fictif</dt><dd><time dateTime={report.date}>{displayDate(report.date)}</time></dd></div></dl>{report.contentHidden&&<Message title="Masquage simulé">Le contenu public n’a pas changé. Le signalement n’a pas été clôturé par ce masquage.</Message>}{report.accountSuspended&&<Message title="Suspension simulée">Aucun compte ni session réelle affecté ; aucun masquage automatique.</Message>}</Card>;
}
function ModerationHistory({report}:{report:DemoReport}) {
  return <Card className="moderation-history"><Heading as="h2" size="card">Historique fictif</Heading>{report.history.length?<ol>{report.history.map((h,i)=><li key={i}><strong>{actionLabels[h.action]}</strong><p>{h.reason}</p><p>{h.actor} · <time dateTime={h.date}>{displayDate(h.date)}</time></p></li>)}</ol>:<p>Aucune décision dans ce scénario de démonstration.</p>}</Card>;
}
