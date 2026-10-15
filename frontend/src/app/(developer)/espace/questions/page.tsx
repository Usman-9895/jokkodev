export const metadata = {"title":"Mes questions — indisponibles | JokkoDev","description":"Interface préparée ; opération backend encore indisponible."};
import Link from 'next/link';
import {Heading,Message} from '../../../../components/ui';
export default function MyQuestionsUnavailable(){return <><Heading as="h1">Mes questions</Heading><Message title="Consultation personnelle indisponible">Session et API absentes. Aucune liste fictive n’est présentée comme tes publications privées.</Message><Link className="jd-action-link" href="/questions">Consulter les questions publiques</Link></>;}
