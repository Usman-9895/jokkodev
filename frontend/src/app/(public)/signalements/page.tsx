import {LiveReportPage} from '../../../components/reports/live-report';
import {Container} from '../../../components/layout/container';
export const metadata={title:'Signaler un contenu | JokkoDev',description:'Signalement privé d’un contenu.'};
export default function Page(){return <Container className="report-preview"><LiveReportPage/></Container>;}
