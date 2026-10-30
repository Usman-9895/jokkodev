import {Container} from '../../../../../components/layout/container';
import {LiveQuestionForm} from '../../../../../components/jokkohelp/live-question-form';
export const metadata={robots:{index:false,follow:true},title:'Modifier ma question | JokkoDev',description:'Modification réservée à l’auteur de la question.'};
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <Container className="contribution-page"><LiveQuestionForm id={id}/></Container>;}
