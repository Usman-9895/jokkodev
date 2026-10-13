import Link from 'next/link';
import { Container } from './container';
import { Heading } from '../ui';
export function ComingSoon({ title, children }: { title: string; children: string }) {
  return <Container className="coming-soon"><p className="coming-soon__label">Page d’attente · fonctionnalité à venir</p><Heading as="h1" size="page">{title}</Heading><p>{children}</p><Link href="/" className="jd-button jd-button--secondary">Retour à l’accueil</Link></Container>;
}
