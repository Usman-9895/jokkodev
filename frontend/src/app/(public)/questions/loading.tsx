import {Suspense} from 'react';
import {ReadLoading} from '../../../components/jokkohelp/shared';
import {ListLoading} from '../../../components/jokkohelp/list-loading';
export default function Loading(){return <Suspense fallback={<ReadLoading/>}><ListLoading/></Suspense>;}
