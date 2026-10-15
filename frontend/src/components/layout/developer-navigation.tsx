import Link from 'next/link';
import {Icon} from '../ui';
import {developerPreviewHref} from '../../lib/applications/presentation';
export type DeveloperView = 'dashboard'|'profile'|'questions'|'projects'|'sent'|'received';
export function DeveloperNavigation({active}:{active:DeveloperView}) {
  return <nav className="developer-navigation" aria-label="Navigation de l’espace de démonstration">{[
    ['dashboard','Tableau de bord','target'],['profile','Mon profil','users'],['questions','Mes questions','info'],['projects','Mes projets','book'],['sent','Mes candidatures','code'],['received','Demandes reçues','users'],
  ].map(([view,label,icon])=><Link key={view} href={view==='profile'?'/dev/comptes?view=profile':developerPreviewHref(view)} aria-current={active===view?'page':undefined}><Icon name={icon as 'target'|'users'|'info'|'book'|'code'}/><span>{label}</span></Link>)}</nav>;
}
