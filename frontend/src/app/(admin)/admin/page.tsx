import Link from 'next/link';
import {Heading,Message} from '../../../components/ui';
export default function AdminPage() { return <><Heading as="h1" size="page">Administration minimale</Heading><Message title="Accès administrateur indisponible">Le contrôle des sessions et des permissions doit être fourni par le backend. Aucun signalement ni donnée privée sur cette page publique.</Message><Link className="jd-button jd-button--secondary" href="/admin/signalements">Signalements — indisponibles</Link></>; }
