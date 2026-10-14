import Link from 'next/link';
import {Heading,Message} from '../../../../components/ui';
export default function OwnProfile(){return <><Heading as="h1">Modification du profil indisponible</Heading><Message title="Session propriétaire requise">L’authentification n’est pas encore intégrée. Aucun formulaire privé ni aucune donnée de compte n’est accessible sur cette page.</Message><Link className="account-back" href="/connexion">Voir le parcours de connexion</Link></>;}
