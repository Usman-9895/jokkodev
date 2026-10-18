import {Container} from '../../../../components/layout/container';
import {LiveProjectForm} from '../../../../components/jokkoprojects/live-form';
export const metadata={title:'Proposer un projet | JokkoDev',description:'Présente ton objectif et les compétences recherchées.'};
export default function Page(){return <Container className="projects-page"><LiveProjectForm/></Container>;}
