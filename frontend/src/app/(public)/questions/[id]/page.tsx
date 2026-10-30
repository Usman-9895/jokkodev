import {notFound} from 'next/navigation';
import {LiveQuestionDetail} from '../../../../components/jokkohelp/live-detail';
import {readQuestion} from '../../../../lib/seo/public-data';
import {pageMetadata,excerpt} from '../../../../lib/seo/metadata';
type Props={params:Promise<{id:string}>};
export async function generateMetadata({params}:Props){const {id}=await params;const result=await readQuestion(id);return result.kind==='ok'?pageMetadata('/questions/'+encodeURIComponent(id),result.data.title+' | JokkoDev',excerpt(result.data.context)):{title:result.kind==='missing'?'Contenu introuvable | JokkoDev':'Contenu momentanément indisponible | JokkoDev',robots:{index:false,follow:true}};}
export default async function Page({params}:Props){const {id}=await params;const result=await readQuestion(id);if(result.kind==='missing')notFound();return <LiveQuestionDetail key={id} id={id} initial={result.kind==='ok'?result.data:undefined}/>;}
