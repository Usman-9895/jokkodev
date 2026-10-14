'use client';
import {useState} from 'react';
import Link from 'next/link';
import {Container} from '../../../../components/layout/container';
import {PublicHeader} from '../../../../components/layout/public-header';
import {ReadState,ReadLoading,QuestionCard} from '../../../../components/jokkohelp/shared';
import {ReadError} from '../../../../components/jokkohelp/read-error';
import {QuestionContent} from '../../../../components/jokkohelp/content';
import {Card,Heading} from '../../../../components/ui';
import {questionExamples} from '../../../../lib/jokkohelp/fixtures';
import {parseCriteria,selectQuestions} from '../../../../lib/jokkohelp/query';
import type {QuestionView} from '../../../../lib/jokkohelp/model';
const states=['loading','detail-loading','empty','error','detail-error','not-found','long'];
export function HelpStatePreview({state}:{state:string}){
  const [questions,setQuestions]=useState<QuestionView[]|null>(null);
  const criteria=parseCriteria({});
  return <><PublicHeader/><main id="contenu" tabIndex={-1}><Container className="help-state-preview"><Heading as="h1" size="page">États de démonstration JokkoHelp</Heading><p>Développement uniquement. Cette page injecte des états visuels du jeu local ; aucune API ni opération métier.</p><nav className="help-pagination" aria-label="Choisir un état">{states.map(s=><Link key={s} href={'/dev/jokkohelp?state='+s}>{s}</Link>)}</nav>
    {state==='loading'||state==='detail-loading'?<ReadLoading detail={state==='detail-loading'}/>:state==='empty'?<ReadState kind="empty"/>:state==='not-found'?<ReadState kind="not-found" detail/>:state==='error'||state==='detail-error'?questions?<><p role="status">Relecture réussie des exemples locaux, sans opération métier.</p>{questions.map(q=><QuestionCard key={q.id} question={q} criteria={criteria}/>)}</>:<ReadError detail={state==='detail-error'} retry={()=>{setQuestions(selectQuestions(criteria,questionExamples).data);}}/>:<Card><QuestionContent blocks={[{kind:'paragraph',heading:'Contenus longs et HTML traité comme texte',text:'<img src=x onerror=alert(1)> — '+ 'https://exemple.invalid/'+ 'CheminSansEspaces'.repeat(40)},{kind:'code',language:'TypeScript',text:'const valeur = "'+ 'CodeSansEspaces'.repeat(50)+'";'}]}/></Card>}
  </Container></main></>;
}
