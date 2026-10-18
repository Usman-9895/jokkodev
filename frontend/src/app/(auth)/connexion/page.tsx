import {Suspense} from 'react';
import {AccountFrame} from '../../../components/accounts/frame';
import {AccountForm} from '../../../components/accounts/account-form';
import {LoadingIndicator} from '../../../components/ui';
export const metadata={title:"Connexion | JokkoDev",description:'Compte JokkoDev : accès sécurisé et gestion de ton identité.'};
export default function Page(){return <AccountFrame screen="login"><Suspense fallback={<LoadingIndicator label="Chargement du formulaire…"/>}><AccountForm screen="login"/></Suspense></AccountFrame>;}
