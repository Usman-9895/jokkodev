import Link from 'next/link';
import {Container} from '../../../../components/layout/container';
import {Card,Heading,Message} from '../../../../components/ui';
export const metadata={robots:{index:false,follow:true},title:'Contribuer à JokkoHelp | JokkoDev',description:'Questions, réponses et solutions de la communauté.'};
export default function Page(){return <Container className="contribution-page"><Card><Heading as="h1">Contribuer à JokkoHelp</Heading><p>Une session réelle permet de poser une question et de répondre. L’auteur d’un contenu peut le modifier ; seul l’auteur d’une question choisit ou retire sa solution.</p><Link className="jd-action-link" href="/questions">Consulter les questions</Link><Message title="Signaler un contenu">Utilise l’entrée Signaler sur la question, la réponse ou le projet concerné. Une session réelle est nécessaire ; le signalement ne masque pas automatiquement le contenu.</Message></Card></Container>;}
