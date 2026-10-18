export const metadata = {"title":"Espace développeur | JokkoDev","description":"Interface préparée ; opération backend encore indisponible."};
import Link from 'next/link';
import {Heading,Message} from '../../../components/ui';
export default function DeveloperPage() { return <><Heading as="h1" size="page">Espace développeur</Heading><Message title="Tableau de bord indisponible">Le résumé personnel n’est pas encore raccordé. Aucune activité fictive n’est présentée comme tes données privées.</Message><Link className="jd-button jd-button--secondary" href="/projets">Explorer les projets publics</Link><p><Link className="account-back" href="/espace/profil">Modifier mon profil →</Link></p></>; }
