import {questionExamples} from '../fixtures';
import {draftFromQuestion} from './presentation';
/** Données publiques fictives ; aucune action ne modifie les exemples de consultation. */
export const questionDraftExample=draftFromQuestion(questionExamples.find(q=>q.id==='demo-react-render')!);
questionDraftExample.content=questionDraftExample.content.map(block=>block.kind==='paragraph'&&block.heading==='Ce que tu as essayé'?{...block,text:'J’ai vérifié les paramètres du composant et réduit le code pour isoler le problème.'}:block);
export const authorQuestionExamples=questionExamples.filter(q=>q.author.name==='Awa');
export const solutionQuestionExample=questionExamples.find(q=>q.id==='demo-session-nestjs')!;
