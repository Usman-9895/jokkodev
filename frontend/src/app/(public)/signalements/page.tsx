import {Suspense} from 'react';
import {LoadingIndicator} from '../../../components/ui';
import {LiveReportPage} from '../../../components/reports/live-report';
import {Container} from '../../../components/layout/container';
export const metadata={robots:{index:false,follow:true},title:'Signaler un contenu | JokkoDev',description:'Signalement privé d’un contenu.'};
export default function Page(){return <Container className="report-preview"><Suspense fallback={<LoadingIndicator label="Chargement du formulaire…"/>}><LiveReportPage/></Suspense></Container>;}
