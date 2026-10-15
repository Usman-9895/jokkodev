export const metadata = {"title":"Signalements — indisponibles | JokkoDev","description":"Interface préparée ; opération backend encore indisponible."};
import {Heading,Message} from '../../../../components/ui';
export default function Unavailable(){return <><Heading as="h1" size="page">Signalements</Heading><Message title="Administration indisponible">Session administrateur et API absentes. Aucune liste, identité de déclarant ou décision chargée.</Message></>;}
