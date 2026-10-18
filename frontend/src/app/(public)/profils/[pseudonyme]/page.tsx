import {Suspense} from 'react';
import {PublicProfilePage} from '../../../../components/accounts/public-profile';
import {LoadingIndicator} from '../../../../components/ui';
export const metadata={title:'Profil public | JokkoDev',description:'Contributions et informations publiques du profil JokkoDev.'};
export default async function Page({params}:{params:Promise<{pseudonyme:string}>}){const {pseudonyme}=await params;return <Suspense fallback={<LoadingIndicator label="Chargement du profil…"/>}><PublicProfilePage reference={pseudonyme}/></Suspense>;}
