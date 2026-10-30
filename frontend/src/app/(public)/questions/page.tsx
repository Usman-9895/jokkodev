import type {components} from '@jokkodev/api-client';
import {LiveQuestionList} from '../../../components/jokkohelp/live-list';
import {helpCriteria,questionQuery} from '../../../lib/jokkohelp/api';
import {publicRead} from '../../../lib/seo/public-data';
import {staticMetadata} from '../../../lib/seo/metadata';
type Props={searchParams:Promise<Record<string,string|string[]|undefined>>};
export async function generateMetadata({searchParams}:Props){const values=await searchParams;const filtered=Object.keys(values).some(k=>values[k]!==undefined);return {...staticMetadata('/questions'),...(filtered?{robots:{index:false,follow:true}}:{})};}
export default async function Page({searchParams}:Props){const values=await searchParams,criteria=helpCriteria(values),query=questionQuery(criteria);const params=new URLSearchParams(Object.entries(query).filter(([,v])=>v!==undefined&&v!==null).map(([k,v])=>[k,String(v)]));const result=await publicRead<components['schemas']['QuestionSummaryPageDto']>('/questions?'+params);return <LiveQuestionList key={params.toString()} initial={result.kind==='ok'?result.data:undefined}/>;}
