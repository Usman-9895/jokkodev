export const metadata = {"title":"Profil public — indisponible | JokkoDev","description":"Interface préparée ; opération backend encore indisponible."};
import Link from 'next/link';
import {Container} from '../../../../components/layout/container';
import {Card,Heading,Message} from '../../../../components/ui';
export default function PublicProfile(){return <Container className="profile-unavailable"><Card><Heading as="h1">Profil public indisponible</Heading><Message title="Consultation à venir">Le contrat de profil public n’est pas encore disponible. Aucun compte n’est recherché et aucune donnée personnelle n’est affichée.</Message><Link className="account-back" href="/questions">Explorer les questions</Link></Card></Container>;}
