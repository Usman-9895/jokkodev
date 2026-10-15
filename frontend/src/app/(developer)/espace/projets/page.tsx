export const metadata = {"title":"Mes projets — indisponibles | JokkoDev","description":"Interface préparée ; opération backend encore indisponible."};
import Link from 'next/link';
import {Heading,Message} from '../../../../components/ui';
export default function MyProjects(){return <><Heading as="h1">Mes projets</Heading><Message title="Consultation personnelle indisponible">Sans session ni API personnelle, aucun projet fictif n’est présenté comme tes données privées.</Message><Link className="jd-action-link" href="/projets">Explorer les projets publics</Link></>;}
