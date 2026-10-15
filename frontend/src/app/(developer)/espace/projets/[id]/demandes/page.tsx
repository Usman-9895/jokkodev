export const metadata = {"title":"Demandes reçues — indisponibles | JokkoDev","description":"Interface préparée ; opération backend encore indisponible."};
import Link from 'next/link';
import {Heading,Message} from '../../../../../../components/ui';
export default function ReceivedUnavailable(){return <><Heading as="h1" size="page">Demandes reçues</Heading><Message title="Traitement des candidatures indisponible">La session, l’autorisation du responsable et les contrats de lecture/décision ne sont pas encore disponibles. Aucun candidat ni message privé affiché.</Message><Link className="jd-button jd-button--secondary" href="/espace/projets">Retour à Mes projets</Link></>;}
