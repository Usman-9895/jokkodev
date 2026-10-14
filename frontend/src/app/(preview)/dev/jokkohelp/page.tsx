import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {HelpStatePreview} from './preview';
export const metadata:Metadata={title:'États de consultation — démonstration locale',robots:{index:false,follow:false}};
export default async function Preview({searchParams}:{searchParams:Promise<{state?:string}>}){if(process.env.NODE_ENV!=='development')notFound();const state=(await searchParams).state??'loading';return <HelpStatePreview key={state} state={state}/>;}
