import { questionExamples } from '../jokkohelp/fixtures';
import { displayDate } from '../jokkohelp/presentation';
/** Une seule source locale pour l’accueil, la liste et les détails. */
export const homeQuestionExamples = ['demo-jwt','demo-mongodb'].map(id => {
  const question = questionExamples.find(question => question.id === id)!;
  return { ...question, resolved: Boolean(question.acceptedAnswerId), displayDate: displayDate(question.date) };
});
