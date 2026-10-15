import Link from 'next/link';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {PublicHeader} from '../../../../components/layout/public-header';
import {PublicFooter} from '../../../../components/layout/public-footer';
import {Container} from '../../../../components/layout/container';
import {Heading,Message} from '../../../../components/ui';
import {DemoReportDialog} from '../../../../components/reports/report-dialog';
import {QuestionContent} from '../../../../components/jokkohelp/content';
import {findPublicReportTarget} from '../../../../lib/reports/targets';
export const metadata:Metadata={title:'Signalement — aperçu local',robots:{index:false,follow:false}};
export default async function Preview({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  if(process.env.NODE_ENV!=='development')notFound();
  const p=await searchParams,target=findPublicReportTarget(p.type??'question',p.target??'demo-session-nestjs');
  const state=typeof p.state==='string'&&['already','unavailable','expired','sending','error','success'].includes(p.state)?p.state:'initial';
  return <div className="public-site"><PublicHeader/><main id="contenu" tabIndex={-1}><Container className="report-preview"><Heading as="h1" size="page">Signaler un contenu — démonstration</Heading><Message title="Données fictives uniquement">Aucun signalement, masquage, email ou opération backend. Le motif n’est jamais conservé dans le stockage du navigateur.</Message><details><summary>Choisir un état ou une cible de démonstration</summary><nav aria-label="États du signalement">{['initial','already','unavailable','expired','sending','error','success'].map(state=><Link key={state} href={'/dev/signalements?state='+state}>{state}</Link>)}<Link href="/dev/signalements?perspective=visitor">Visiteur</Link><Link href="/dev/signalements?type=answer&target=demo-session-answer-2">Réponse</Link><Link href="/dev/signalements?type=project&target=demo-associations">Projet</Link></nav></details>{target?<><p className="report-preview-target">{target.title}</p><DemoReportDialog key={state+target.id+p.perspective} target={target} state={state} perspective={p.perspective==='visitor'?'visitor':'developer'}/>{state!=='unavailable'&&<div className="report-preview-content"><QuestionContent blocks={target.content}/></div>}</>:<Message title="Contenu indisponible">Aucune cible reconnue dans les exemples publics. Aucun motif sur une cible inconnue n’est envoyé.</Message>}</Container></main><PublicFooter/></div>;
}
