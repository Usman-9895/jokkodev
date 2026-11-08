import {Suspense} from 'react';
import {GlobalSearch} from '../../../components/global-search';
export const metadata={title:'Recherche · JokkoDev',description:'Recherche les questions et projets publics de JokkoDev.',robots:{index:false,follow:true}};
export default function Page(){return <Suspense fallback={<p role="status">Chargement de la recherche…</p>}><GlobalSearch/></Suspense>;}
