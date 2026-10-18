export const metadata = {"title":"Mes candidatures — indisponibles | JokkoDev","description":"Interface préparée ; raccordement de cette page encore à réaliser."};
import Link from 'next/link';
import {Heading,Message} from '../../../../components/ui';
export default function ApplicationsUnavailable(){return <><Heading as="h1" size="page">Mes candidatures</Heading><Message title="Candidatures personnelles indisponibles">Cette interface n’est pas encore raccordée à l’API de candidatures. Aucune demande privée n’est chargée.</Message><Link className="jd-button jd-button--secondary" href="/projets">Explorer les projets</Link></>;}
