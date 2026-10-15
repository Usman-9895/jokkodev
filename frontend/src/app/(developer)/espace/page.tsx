import Link from 'next/link';
import {Heading,Message} from '../../../components/ui';
export default function DeveloperPage() { return <><Heading as="h1" size="page">Espace développeur</Heading><Message title="Tableau de bord indisponible">La session et le résumé personnel ne sont pas encore disponibles. Aucune activité fictive n’est présentée comme tes données privées.</Message><Link className="jd-button jd-button--secondary" href="/projets">Explorer les projets publics</Link></>; }
