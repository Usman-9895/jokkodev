export const metadata = {"title":"Mes questions — indisponibles | JokkoDev","description":"Interface préparée ; raccordement de cette page encore à réaliser."};
import Link from 'next/link';
import {Heading,Message} from '../../../../components/ui';
export default function MyQuestionsUnavailable(){return <><Heading as="h1">Mes questions</Heading><Message title="Consultation personnelle indisponible">La liste personnelle sera raccordée dans un prochain lot. Aucune liste fictive n’est présentée comme tes publications privées.</Message><Link className="jd-action-link" href="/questions">Consulter les questions publiques</Link></>;}
