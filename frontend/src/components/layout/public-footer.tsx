import Link from 'next/link';
import { Container } from './container';
import {publicInformationLinks} from '../../lib/information/content';
export function PublicFooter() {
  return <footer className="public-footer"><Container className="public-footer__row"><p className="footer-signature">Une initiative de <strong>DevTeranga</strong> · JokkoDev · CADEV 2026</p><nav aria-label="Informations">{publicInformationLinks.map(link=><Link key={link.href} href={link.href}>{link.label}</Link>)}</nav><nav className="footer-links" aria-label="Autres liens utiles"><Link href="/a-propos">À propos</Link><Link href="/ressources">Ressources</Link><Link href="/">Retour à l’accueil</Link></nav></Container></footer>;
}
