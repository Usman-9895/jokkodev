import Image from 'next/image';
import Link from 'next/link';
import { Container } from './container';
export function PublicFooter() {
  return <footer className="public-footer"><Container className="public-footer__row"><div className="devteranga-signature"><Image src="/illustrations/africa-natural-earth.svg" width={24} height={24} alt="" /><span>DevTeranga</span></div><p>Pour une Afrique qui code, qui partage et qui construit ensemble.</p><nav aria-label="Informations"><Link href="/a-propos">À propos</Link><Link href="/ressources">Ressources</Link><Link href="/contact">Contact</Link></nav></Container></footer>;
}
