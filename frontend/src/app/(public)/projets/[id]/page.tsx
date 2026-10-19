import {LiveProjectDetail} from '../../../../components/jokkoprojects/live-detail';
export const metadata={title:'Détail du projet | JokkoDev',description:'Objectif, compétences recherchées et membres publics du projet.'};
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <LiveProjectDetail id={id}/>;}
