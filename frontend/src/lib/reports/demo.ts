import {findPublicReportTarget} from './targets';
import type {PublicReportTarget} from './targets';
import type {DemoEffects, DemoModerationAction} from './presentation';
export type DemoModerationHistory = {action:DemoModerationAction; reason:string; actor:string; date:string};
export type DemoReport = DemoEffects & {id:string; target:PublicReportTarget; reporter:string; reason:string; date:string; history:DemoModerationHistory[]};
/** Signalements privés exclusivement fictifs, importés par l’aperçu de développement. */
export const reportExamples: DemoReport[] = [
  {id:'demo-report-question',target:findPublicReportTarget('question','demo-session-nestjs')!,reporter:'Binta',reason:'Publicité hors sujet — motif fictif.',date:'2026-10-13T09:00:00Z',status:'open',contentHidden:false,accountSuspended:false,history:[]},
  {id:'demo-report-answer',target:findPublicReportTarget('answer','demo-session-answer-2')!,reporter:'Awa',reason:'Propos inappropriés — scénario fictif sans jugement sur le contenu public.',date:'2026-10-13T10:00:00Z',status:'open',contentHidden:false,accountSuspended:false,history:[]},
  {id:'demo-report-project',target:findPublicReportTarget('project','demo-associations')!,reporter:'Moussa',reason:'Description trompeuse — motif fictif.',date:'2026-10-13T11:00:00Z',status:'open',contentHidden:false,accountSuspended:false,history:[]},
  {id:'demo-report-closed',target:findPublicReportTarget('question','demo-typescript')!,reporter:'Fatou',reason:'Doublon — motif fictif.',date:'2026-10-13T12:00:00Z',status:'closed',contentHidden:false,accountSuspended:false,history:[{action:'close',reason:'Exemple de clôture sans modification du contenu.',actor:'Relecteur fictif',date:'2026-10-13T13:00:00Z'}]},
];
export function createReportExamples(paginated=false,long=false): DemoReport[] {
  const data = paginated ? [...reportExamples, ...reportExamples.map((r,i)=>({...r,id:r.id+'-page2',reporter:'Déclarant fictif '+(i+5)}))] : reportExamples;
  return data.map(r=>({...r,history:r.history.map(h=>({...h})),target:{...r.target,
    ...(long?{title:'TitreLongSansEspaces'.repeat(15)}:{}),
    content:long?[
      {kind:'paragraph',text:'<img src=x onerror=window.__reportUnsafe=true>'+'TexteLongSansEspaces'.repeat(20)},
      {kind:'code',language:'TypeScript',text:'// Code fictif long, défilement horizontal uniquement\n'+'const exemple = "valeur"; '.repeat(30)},
    ]:r.target.content.map(b=>({...b})),
  }}));
}
