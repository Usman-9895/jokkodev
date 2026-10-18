import {Suspense} from 'react';
import {LiveQuestionList} from '../../../components/jokkohelp/live-list';
import {ReadLoading} from '../../../components/jokkohelp/shared';
export const metadata={title:'Questions | JokkoDev',description:'Recherche des questions et solutions de la communauté JokkoDev.'};
export default function Page(){return <Suspense fallback={<ReadLoading/>}><LiveQuestionList/></Suspense>;}
