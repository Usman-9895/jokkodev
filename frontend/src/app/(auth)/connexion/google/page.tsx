import {Suspense} from 'react';
import {AccountFrame} from '../../../../components/accounts/frame';
import {GoogleCompletion} from '../../../../components/accounts/google-completion';
import {LoadingIndicator} from '../../../../components/ui';
export const metadata={title:'Connexion Google | JokkoDev',robots:{index:false,follow:false}};
export default function Page(){return <AccountFrame screen="login"><Suspense fallback={<LoadingIndicator label="Vérification du retour Google…"/>}><GoogleCompletion/></Suspense></AccountFrame>;}
