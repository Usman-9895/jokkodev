export const metadata = {"title":"Mes projets — indisponibles | JokkoDev","description":"Interface préparée ; raccordement de cette page encore à réaliser."};
import Link from 'next/link';
import {Heading,Message} from '../../../../components/ui';
export default function MyProjects(){return <><Heading as="h1">Mes projets</Heading><Message title="Consultation personnelle indisponible">La liste personnelle sera raccordée dans un prochain lot. Aucun projet fictif n’est présenté comme tes données privées.</Message><Link className="jd-action-link" href="/projets">Explorer les projets publics</Link></>;}
