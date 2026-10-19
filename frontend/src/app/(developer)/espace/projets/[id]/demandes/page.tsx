import {LiveProjectApplications} from '../../../../../../components/applications/live-lists';
export const metadata={title:'Demandes reçues | JokkoDev',description:'Demandes réservées au responsable du projet.'};
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <LiveProjectApplications id={id}/>;}
