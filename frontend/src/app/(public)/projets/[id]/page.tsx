import {notFound} from 'next/navigation';
import {LiveProjectDetail} from '../../../../components/jokkoprojects/live-detail';
import {readProject} from '../../../../lib/seo/public-data';
import {pageMetadata,excerpt} from '../../../../lib/seo/metadata';
type Props={params:Promise<{id:string}>};
export async function generateMetadata({params}:Props){const {id}=await params;const result=await readProject(id);return result.kind==='ok'?pageMetadata('/projets/'+encodeURIComponent(id),result.data.title+' | JokkoDev',excerpt(result.data.objective)):{title:result.kind==='missing'?'Contenu introuvable | JokkoDev':'Contenu momentanément indisponible | JokkoDev',robots:{index:false,follow:true}};}
export default async function Page({params}:Props){const {id}=await params;const result=await readProject(id);if(result.kind==='missing')notFound();return <LiveProjectDetail key={id} id={id} initial={result.kind==='ok'?result.data:undefined}/>;}
