import Link from 'next/link';
import {Icon} from '../ui';
import {developerPreviewHref} from '../../lib/applications/presentation';
export type DeveloperView = 'dashboard'|'profile'|'questions'|'projects'|'sent'|'received';
const productRoutes:Record<string,string>={dashboard:'/espace',profile:'/espace/profil',questions:'/espace/questions',projects:'/espace/projets',sent:'/espace/candidatures'};
const shortLabels:Record<string,string>={dashboard:'Tableau de bord',profile:'Profil',questions:'Questions',projects:'Projets',sent:'Candidatures'};
export function DeveloperNavigation({active,preview=true}:{active:DeveloperView;preview?:boolean}) {
  return <nav className={"developer-navigation"+(preview?"":" developer-navigation--product")} aria-label={preview?"Navigation de l’espace de démonstration":"Navigation de l’espace développeur"}>{[
    ['dashboard','Tableau de bord','target'],['profile','Mon profil','users'],['questions','Mes questions','info'],['projects','Mes projets','book'],['sent','Mes candidatures','code'],['received','Demandes reçues','users'],
  ].filter(([view])=>preview||view!=='received').map(([view,label,icon])=><Link key={view} href={preview?(view==='profile'?'/dev/comptes?view=profile':developerPreviewHref(view)):productRoutes[view]} aria-current={active===view?'page':undefined}><Icon name={icon as 'target'|'users'|'info'|'book'|'code'}/><span className={preview?undefined:"developer-nav-full"}>{label}</span>{!preview&&<span className="developer-nav-compact">{shortLabels[view]}</span>}</Link>)}</nav>;
}
