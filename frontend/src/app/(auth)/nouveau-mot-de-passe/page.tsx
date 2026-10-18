import {Suspense} from 'react';
import {AccountFrame} from '../../../components/accounts/frame';
import {AccountForm} from '../../../components/accounts/account-form';
import {LoadingIndicator} from '../../../components/ui';
export const metadata={title:"Nouveau mot de passe | JokkoDev",description:'Compte JokkoDev : accès sécurisé et gestion de ton identité.'};
export default function Page(){return <AccountFrame screen="reset"><Suspense fallback={<LoadingIndicator label="Chargement du formulaire…"/>}><AccountForm screen="reset"/></Suspense></AccountFrame>;}
