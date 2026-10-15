export const metadata = {"title":"Modifier une question — indisponible | JokkoDev","description":"Interface préparée ; opération backend encore indisponible."};
import Link from 'next/link';
import {Container} from '../../../../../components/layout/container';
import {Card,Heading,Message} from '../../../../../components/ui';
export default function EditQuestion(){return <Container className="contribution-page"><Card><Heading as="h1">Modification indisponible</Heading><Message title="Session auteur et API requises">Aucune donnée privée ou formulaire de modification n’est chargé. Les permissions devront être vérifiées par NestJS.</Message><Link className="jd-action-link" href="/questions">Retour aux questions</Link></Card></Container>;}
