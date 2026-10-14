import {notFound} from 'next/navigation';
import {ProjectDetail} from '../../../../components/jokkoprojects/detail';
import {projectSource} from '../../../../lib/jokkoprojects/source';
import {parseProjectCriteria} from '../../../../lib/jokkoprojects/query';
import type {SearchValues} from '../../../../lib/jokkohelp/query';
export default async function Detail({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<SearchValues>}){const {id}=await params,project=await projectSource.detail(id);if(!project)notFound();return <ProjectDetail project={project} criteria={parseProjectCriteria(await searchParams)}/>;}
