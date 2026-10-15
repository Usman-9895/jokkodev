export const metadata = {"title":"Détail d’une question | JokkoDev","description":"Interface préparée ; opération backend encore indisponible."};
import {notFound} from 'next/navigation';
import {QuestionDetail} from '../../../../components/jokkohelp/question-detail';
import {helpSource} from '../../../../lib/jokkohelp/source';
import {parseCriteria} from '../../../../lib/jokkohelp/query';
import type {SearchValues} from '../../../../lib/jokkohelp/query';
import {questionExamples} from '../../../../lib/jokkohelp/fixtures';
export default async function DetailPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<SearchValues>}){
 const {id}=await params;const criteria=parseCriteria(await searchParams);const question=await helpSource.detail(id);if(!question)notFound();
 const similar=questionExamples.filter(other=>other.id!==id&&other.technologies.some(t=>question.technologies.includes(t))).slice(0,4);
 return <QuestionDetail question={question} criteria={criteria} similar={similar}/>;
}
