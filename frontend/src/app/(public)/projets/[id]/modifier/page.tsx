import {Container} from '../../../../../components/layout/container';
import {LiveProjectForm} from '../../../../../components/jokkoprojects/live-form';
export const metadata={robots:{index:false,follow:true},title:'Modifier le projet | JokkoDev',description:'Modification réservée au responsable du projet.'};
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <Container className="projects-page"><LiveProjectForm id={id}/></Container>;}
