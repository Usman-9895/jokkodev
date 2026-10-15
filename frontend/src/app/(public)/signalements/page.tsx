export const metadata = {"title":"Signaler — indisponible | JokkoDev","description":"Interface préparée ; opération backend encore indisponible."};
import Link from 'next/link';
import {Container} from '../../../components/layout/container';
import {Heading,Message} from '../../../components/ui';
import {findPublicReportTarget} from '../../../lib/reports/targets';
export default async function ReportingUnavailable({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const p=await searchParams,target=findPublicReportTarget(p.type,p.target);
  return <Container className="coming-soon"><Heading as="h1" size="page">Signaler un contenu</Heading><Message title="Signalement indisponible">La session et l’API de signalement ne sont pas encore intégrées. Aucun signalement n’est envoyé et aucun contenu n’est masqué.</Message>{target?<><p>Contenu fictif concerné : {target.title}</p><Link className="jd-button jd-button--secondary" href={target.href}>Retour au contenu</Link></>:<Link className="jd-button jd-button--secondary" href="/">Retour au site</Link>}</Container>;
}
