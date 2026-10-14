import type {ContentBlock,QuestionView} from '../model';
/** Types d’interface locale, jamais des DTO de mutation ni une session. */
export type QuestionDraft={title:string;technologies:string[];content:ContentBlock[]};
export type PreviewPerspective='visitor'|'member'|'author'|'suspended'|'administrator';
export function previewActions(perspective:PreviewPerspective){return {respond:perspective==='member'||perspective==='author'||perspective==='administrator',editQuestion:perspective==='author',chooseSolution:perspective==='author',editAnswer:false};}
export function validateQuestionDraft(draft:QuestionDraft){
 const errors:Record<string,string>={};
 if(!draft.title.trim())errors.title='Renseigne le titre pour cet aperçu.';
 if(!draft.technologies.length)errors.technologies='Choisis une technologie de démonstration.';
 if(!draft.content.find(block=>block.kind==='paragraph')?.text.trim())errors.content='Décris le contexte du problème.';
 return errors;
}
export function validateReply(text:string){return text.trim()?'':'Rédige une réponse de démonstration.';}
export function draftFromQuestion(question:QuestionView):QuestionDraft{
 const content=question.content.map(block=>({...block}));
 const optional:ContentBlock[]=[];
 if(!content.some(b=>b.kind==='paragraph'&&b.heading==='Résultat attendu'))optional.push({kind:'paragraph',heading:'Résultat attendu',text:''});
 if(!content.some(b=>b.kind==='paragraph'&&b.heading?.toLocaleLowerCase('fr').includes('essay')))optional.push({kind:'paragraph',heading:'Ce que tu as essayé',text:''});
 const codeIndex=content.findIndex(b=>b.kind==='code');
 content.splice(codeIndex<0?content.length:codeIndex,0,...optional);
 if(codeIndex<0)content.push({kind:'code',language:'TypeScript',text:''});
 return {title:question.title,technologies:[...question.technologies],content};
}
export function emptyQuestionDraft():QuestionDraft{return {title:'',technologies:[],content:[{kind:'paragraph',heading:'Contexte / description',text:''},{kind:'paragraph',heading:'Résultat attendu',text:''},{kind:'paragraph',heading:'Ce que tu as essayé',text:''},{kind:'code',language:'TypeScript',text:''}]};}
export function normalizedDraft(draft:QuestionDraft):QuestionDraft{return {...draft,title:draft.title.trim(),technologies:[...new Set(draft.technologies)],content:draft.content.filter(block=>block.text.trim()).map(block=>({...block}))};}
export function filterQuestionExamples(questions:QuestionView[],filter:'all'|'resolved'|'open'){return questions.filter(q=>filter==='all'||Boolean(q.acceptedAnswerId)===(filter==='resolved'));}
