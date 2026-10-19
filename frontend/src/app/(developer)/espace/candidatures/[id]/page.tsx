import {LiveApplicationDetail} from '../../../../../components/applications/live-lists';
export const metadata={title:'Candidature | JokkoDev',description:'Lecture privée réservée au candidat et au responsable.'};
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <LiveApplicationDetail id={id}/>;}
