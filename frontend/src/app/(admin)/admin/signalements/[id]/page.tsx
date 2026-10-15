export const metadata = {"title":"Signalement — indisponible | JokkoDev","description":"Interface préparée ; opération backend encore indisponible."};
import Link from 'next/link';
import {Heading,Message} from '../../../../../components/ui';
export default function Unavailable(){return <><Heading as="h1" size="page">Examiner un signalement</Heading><Message title="Traitement indisponible">Aucun accès administrateur opérationnel. Aucun contenu signalé, motif privé ou historique affiché.</Message><Link className="jd-button jd-button--secondary" href="/admin/signalements">Retour aux signalements</Link></>;}
