import {Container} from '../../../../components/layout/container';
import {LiveQuestionForm} from '../../../../components/jokkohelp/live-question-form';
export const metadata={title:'Poser une question | JokkoDev',description:'Décris ton problème et publie une question à la communauté.'};
export default function Page(){return <Container className="contribution-page"><LiveQuestionForm/></Container>;}
