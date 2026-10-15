import {questionExamples} from '../jokkohelp/fixtures';
import {projectExamples} from '../jokkoprojects/fixtures';
import type {ContentBlock} from '../jokkohelp/model';
import type {ReportTargetKind} from './presentation';
/** Uniquement des contenus déjà publics et fictifs ; aucune donnée de signalement. */
export type PublicReportTarget = {kind:ReportTargetKind; id:string; title:string; author:string; href:string; content:ContentBlock[]};
export function findPublicReportTarget(kind: unknown, id: unknown): PublicReportTarget | undefined {
  if (typeof id !== 'string') return;
  if (kind === 'question') {
    const q = questionExamples.find(q => q.id === id);
    if (q) return {kind, id, title:q.title, author:q.author.name, href:'/questions/'+encodeURIComponent(q.id), content:q.content};
  }
  if (kind === 'answer') {
    for (const q of questionExamples) {
      const a = q.answers.find(a => a.id === id);
      if (a) return {kind, id, title:'Réponse à « '+q.title+' »', author:a.author.name, href:'/questions/'+encodeURIComponent(q.id)+'#reponse-'+encodeURIComponent(a.id), content:a.content};
    }
  }
  if (kind === 'project') {
    const p = projectExamples.find(p => p.id === id);
    if (p) return {kind, id, title:p.title, author:p.owner.name, href:'/projets/'+encodeURIComponent(p.id), content:[{kind:'paragraph',text:p.objective}]};
  }
}
