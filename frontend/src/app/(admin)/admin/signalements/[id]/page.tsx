import {LiveReportDetail} from '../../../../../components/reports/live-moderation';
export const metadata={title:'Examiner un signalement | JokkoDev',description:'Traitement privé d’un signalement.'};
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <LiveReportDetail key={id} id={id}/>;}
