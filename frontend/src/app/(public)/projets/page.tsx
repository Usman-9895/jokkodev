import type {components} from '@jokkodev/api-client';
import {LiveProjectList} from '../../../components/jokkoprojects/live-list';
import {liveProjectCriteria,projectQuery} from '../../../lib/jokkoprojects/api';
import {publicRead} from '../../../lib/seo/public-data';
import {staticMetadata} from '../../../lib/seo/metadata';
type Props={searchParams:Promise<Record<string,string|string[]|undefined>>};
export async function generateMetadata({searchParams}:Props){const values=await searchParams;const filtered=Object.keys(values).some(k=>values[k]!==undefined);return {...staticMetadata('/projets'),...(filtered?{robots:{index:false,follow:true}}:{})};}
export default async function Page({searchParams}:Props){const values=await searchParams,criteria=liveProjectCriteria(values),query=projectQuery(criteria);const params=new URLSearchParams(Object.entries(query).filter(([,v])=>v!==undefined&&v!==null).map(([k,v])=>[k,String(v)]));const result=await publicRead<components['schemas']['ProjectSummaryPageDto']>('/projects?'+params);return <LiveProjectList key={params.toString()} initial={result.kind==='ok'?result.data:undefined}/>;}
