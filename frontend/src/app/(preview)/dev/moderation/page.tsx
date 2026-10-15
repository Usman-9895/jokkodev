import Link from 'next/link';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {AdminShell} from '../../../../components/layout/admin-shell';
import {ModerationWorkspace} from '../../../../components/reports/moderation-workspace';
import {Message} from '../../../../components/ui';
import {parseReportCriteria} from '../../../../lib/reports/presentation';
import type {DemoModerationOutcome,DemoModerationRole,ReportSearch} from '../../../../lib/reports/presentation';
export const metadata:Metadata={title:'Modération — aperçu local',robots:{index:false,follow:false}};
export default async function Preview({searchParams}:{searchParams:Promise<ReportSearch>}) {
  if(process.env.NODE_ENV!=='development')notFound();
  const p=await searchParams,criteria=parseReportCriteria(p);
  const role:DemoModerationRole=p.role===undefined?'administrator':p.role==='administrator'||p.role==='visitor'||p.role==='expired'?p.role:'developer';
  const state=typeof p.state==='string'&&['loading','empty','error','no-results','paginated','long','sending'].includes(p.state)?p.state:'initial';
  const outcome:DemoModerationOutcome=p.outcome==='error'||p.outcome==='conflict'||p.outcome==='expired'||p.outcome==='denied'?p.outcome:'success';
  return <AdminShell preview><div className="moderation-demo-tools"><Message title="Administration fictive — développement uniquement">Aucune session administrateur réelle. Données, historique et décisions simulés ; aucun effet externe. Aucun accès aux candidatures privées.</Message><details><summary>Choisir un scénario de démonstration</summary><nav aria-label="Scénarios de modération">{['initial','loading','empty','error','no-results','paginated','long'].map(state=><Link key={state} href={'/dev/moderation?state='+state}>{state}</Link>)}<Link href="/dev/moderation?view=detail&id=demo-report-answer">Détail</Link><Link href="/dev/moderation?view=detail&id=demo-report-closed">Clôturé</Link></nav><nav aria-label="Permissions de démonstration">{['administrator','developer','visitor','expired'].map(role=><Link key={role} href={'/dev/moderation?role='+role}>{role}</Link>)}</nav><nav aria-label="Résultats fictifs">{['success','error','conflict','expired','denied'].map(outcome=><Link key={outcome} href={'/dev/moderation?view=detail&id=demo-report-answer&outcome='+outcome}>{outcome}</Link>)}</nav></details></div><ModerationWorkspace key={state+role+outcome} view={p.view==='detail'?'detail':'list'} id={typeof p.id==='string'?p.id:undefined} criteria={criteria} state={state} role={role} outcome={outcome}/></AdminShell>;
}
