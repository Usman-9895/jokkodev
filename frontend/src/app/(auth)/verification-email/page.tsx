import {Suspense} from 'react';
import {AccountFrame} from '../../../components/accounts/frame';
import {AccountForm} from '../../../components/accounts/account-form';
import {LoadingIndicator} from '../../../components/ui';
export const metadata={title:"Vérification email | JokkoDev",description:'Compte JokkoDev : accès sécurisé et gestion de ton identité.'};
export default function Page(){return <AccountFrame screen="verify"><Suspense fallback={<LoadingIndicator label="Chargement du formulaire…"/>}><AccountForm screen="verify"/></Suspense></AccountFrame>;}
