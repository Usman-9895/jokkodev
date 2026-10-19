import {AdminAccountMenu} from '../reports/admin-account-menu';
import Link from 'next/link';
import type {ReactNode} from 'react';
import {Brand} from './brand';
export function AdminShell({children,preview=false}:{children:ReactNode;preview?:boolean}) {
  const href=preview?'/dev/moderation':'/admin/signalements';
  return <div className="admin-site"><header className="admin-header"><Link href="/" aria-label="JokkoDev — accueil"><Brand decorative/></Link><nav aria-label="Navigation générale"><Link href="/questions">Questions</Link><Link href="/projets">Projets</Link><span>Administration{preview?' · aperçu':''}</span></nav>{!preview&&<AdminAccountMenu/>}<Link className="jd-button jd-button--secondary" href="/">Retour au site</Link></header><div className="admin-space"><nav className="admin-sidebar" aria-label="Administration minimale"><Link href={href} aria-current="page">⚑ Signalements</Link></nav><main id="contenu" tabIndex={-1} className="admin-content">{children}</main></div><footer className="admin-footer">JokkoDev · Administration minimale{preview?' · démonstration uniquement':''}<Link href="/">Retour au site →</Link></footer></div>;
}
