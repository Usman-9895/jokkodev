import {notFound} from 'next/navigation';
import Link from 'next/link';
import type {Metadata} from 'next';
import {PublicHeader} from '../../../../components/layout/public-header';
import {PublicFooter} from '../../../../components/layout/public-footer';
import {Container} from '../../../../components/layout/container';
import {Card,Heading,Message} from '../../../../components/ui';
import {QuestionForm} from '../../../../components/jokkohelp/contributions/question-form';
import {ReplyForm} from '../../../../components/jokkohelp/contributions/reply-form';
import {MyQuestions} from '../../../../components/jokkohelp/contributions/my-questions';
import {SolutionAction} from '../../../../components/jokkohelp/contributions/solution-action';
import {QuestionDetail} from '../../../../components/jokkohelp/question-detail';
import {questionExamples} from '../../../../lib/jokkohelp/fixtures';
import {questionDraftExample,solutionQuestionExample} from '../../../../lib/jokkohelp/contributions/demo';
import {draftFromQuestion,emptyQuestionDraft,previewActions} from '../../../../lib/jokkohelp/contributions/presentation';
import type {PreviewPerspective} from '../../../../lib/jokkohelp/contributions/presentation';
import {parseCriteria} from '../../../../lib/jokkohelp/query';
export const metadata:Metadata={title:'Contributions JokkoHelp — aperçu local',robots:{index:false,follow:false}};
const views=['create','edit','mine','detail','reply'];
const perspectives=['visitor','member','author','suspended','administrator'];
const statesByView:Record<string,string[]>={create:['initial','empty','sending','error','success','long'],edit:['initial','empty','sending','error','success','long'],mine:['initial','loading','empty','error','unavailable'],detail:['initial','sending','error','success'],reply:['initial','sending','error','success']};
export default async function Preview({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 if(process.env.NODE_ENV!=='development')notFound();const params=await searchParams;
 const view=typeof params.view==='string'&&views.includes(params.view)?params.view:'create';const states=statesByView[view];const state=typeof params.state==='string'&&states.includes(params.state)?params.state:'initial';const perspective:PreviewPerspective=typeof params.perspective==='string'&&perspectives.includes(params.perspective)?params.perspective as PreviewPerspective:view==='mine'||view==='edit'||view==='detail'?'author':'member';
 const filter=params.filter==='resolved'||params.filter==='open'?params.filter:'all';const question=questionExamples.find(q=>q.id===params.question)??solutionQuestionExample;const actions=previewActions(perspective);
 const initial=state==='empty'?emptyQuestionDraft():state==='long'?{...questionDraftExample,title:'TitreLongDeDémonstration'.repeat(20),content:[{kind:'paragraph' as const,heading:'Contexte',text:'TexteLongSansEspaces'.repeat(80)},{kind:'code' as const,language:'TypeScript',text:'const exemple = "'+'CodeLongSansEspaces'.repeat(60)+'";'}]}:view==='edit'?draftFromQuestion(question):questionDraftExample;
 return <div className="public-site"><PublicHeader/><main id="contenu" tabIndex={-1}><Container className="contribution-preview-tools"><p>Développement uniquement · exemples publics fictifs · aucune session ni mutation réelle</p><details><summary>Choisir un écran, un état et une perspective fictive</summary><nav aria-label="Écrans de contribution">{views.map(v=><Link key={v} href={'/dev/jokkohelp-contributions?view='+v}>{({create:'Créer',edit:'Modifier',mine:'Mes questions',detail:'Détail et solutions',reply:'Répondre'} as Record<string,string>)[v]}</Link>)}</nav><nav aria-label="États de contribution">{states.map(s=><Link key={s} href={'/dev/jokkohelp-contributions?view='+view+'&state='+s+'&perspective='+perspective}>{s}</Link>)}</nav><nav aria-label="Perspectives fictives">{perspectives.map(p=><Link key={p} href={'/dev/jokkohelp-contributions?view='+view+'&perspective='+p}>{p}</Link>)}</nav></details></Container>
 {view==='mine'?<MyQuestions state={actions.editQuestion?state:'unavailable'} filter={filter}/>:view==='detail'?<QuestionDetail question={question} criteria={parseCriteria({})} similar={questionExamples.filter(q=>q.id!==question.id).slice(0,2)} reply={<ReplyForm key={state+perspective} demo perspective={perspective} state={state}/>} answerActions={actions.chooseSolution?Object.fromEntries(question.answers.map(answer=>[answer.id,<SolutionAction key={answer.id} accepted={question.acceptedAnswerId===answer.id}/>])):{}}/>:view==='reply'?<Container className="contribution-page"><Heading as="h1">Réponse de démonstration</Heading><ReplyForm key={state+perspective} demo state={state} perspective={perspective}/></Container>:<Container className="contribution-page">{view==='edit'&&!actions.editQuestion?<Card><Heading as="h1">Modification non proposée dans cette perspective</Heading><Message title="Permission auteur requise">Ni un visiteur ni un administrateur ne reçoit automatiquement le droit de modifier cette question. Aucun contrôle serveur n’est implémenté ici.</Message></Card>:<QuestionForm key={view+state+question.id} mode={view==='edit'?'edit':'create'} demo state={state} initial={initial}/>}</Container>}
 </main><PublicFooter/></div>;
}
