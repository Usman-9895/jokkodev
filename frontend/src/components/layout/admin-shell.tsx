import {PrimaryLinks} from './primary-links';
import {PublicHeader} from './public-header';
import Link from 'next/link';
import type {ReactNode} from 'react';
import {Brand} from './brand';
import {ThemeSelector} from './theme-selector';
export function AdminShell({children,preview=false}:{children:ReactNode;preview?:boolean}) {
  const href=preview?'/dev/moderation':'/admin/signalements';
  return <div className="admin-site">{preview?<header className="admin-header"><Link href="/" aria-label="JokkoDev — accueil"><Brand decorative/></Link><nav aria-label="Navigation principale"><PrimaryLinks/>{preview&&<span>Aperçu</span>}</nav><ThemeSelector/><Link className="jd-button jd-button--secondary" href="/">Retour au site</Link></header>:<PublicHeader/>}<div className="admin-space"><nav className="admin-sidebar" aria-label="Administration minimale"><Link href={href}>⚑ Signalements</Link>{!preview&&<Link href="/admin/comptes-suspendus">Comptes suspendus</Link>}</nav><main id="contenu" tabIndex={-1} className="admin-content">{children}</main></div><footer className="admin-footer">JokkoDev · Administration minimale{preview?' · démonstration uniquement':''}<Link href="/">Retour au site →</Link></footer></div>;
}
