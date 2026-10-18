import {Suspense} from 'react';
import {LiveQuestionDetail} from '../../../../components/jokkohelp/live-detail';
import {ReadLoading} from '../../../../components/jokkohelp/shared';
export const metadata={title:'Détail d’une question | JokkoDev',description:'Question et réponses de la communauté JokkoDev.'};
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <Suspense fallback={<ReadLoading detail/>}><LiveQuestionDetail id={id}/></Suspense>;}
