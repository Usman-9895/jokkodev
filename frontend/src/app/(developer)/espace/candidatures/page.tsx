export const metadata = {"title":"Mes candidatures — indisponibles | JokkoDev","description":"Interface préparée ; opération backend encore indisponible."};
import Link from 'next/link';
import {Heading,Message} from '../../../../components/ui';
export default function ApplicationsUnavailable(){return <><Heading as="h1" size="page">Mes candidatures</Heading><Message title="Candidatures personnelles indisponibles">Session et API de candidatures absentes. Aucune demande privée n’est chargée.</Message><Link className="jd-button jd-button--secondary" href="/projets">Explorer les projets</Link></>;}
