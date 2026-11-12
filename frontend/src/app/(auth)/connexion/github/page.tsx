import {Suspense} from 'react';
import {AccountFrame} from '../../../../components/accounts/frame';
import {ExternalCompletion} from '../../../../components/accounts/external-completion';
import {LoadingIndicator} from '../../../../components/ui';
export const metadata={title:'Connexion GitHub | JokkoDev',robots:{index:false,follow:false}};
export default function Page(){return <AccountFrame screen="login"><Suspense fallback={<LoadingIndicator label="Vérification du retour GitHub…"/>}><ExternalCompletion provider="github"/></Suspense></AccountFrame>;}
