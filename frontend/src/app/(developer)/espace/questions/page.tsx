import {Suspense} from 'react';
import {LiveMyQuestions} from '../../../../components/jokkohelp/live-list';
import {ReadLoading} from '../../../../components/jokkohelp/shared';
export const metadata={title:'Mes questions | JokkoDev',description:'Tes questions, leur état et leur modification.'};
export default function Page(){return <Suspense fallback={<ReadLoading/>}><LiveMyQuestions/></Suspense>;}
