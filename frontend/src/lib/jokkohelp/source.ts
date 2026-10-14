import 'server-only';
import type { Criteria } from './query';
import { selectQuestions } from './query';
export { selectQuestions } from './query';
import { questionExamples } from './fixtures';
/** Seul point de remplacement quand le contrat de consultation existera. Aucun appel API inventé. */
export const helpSource = {
  async list(criteria: Criteria) { return selectQuestions(criteria, questionExamples); },
  async detail(id: string) { return questionExamples.find(question => question.id === id) ?? null; },
};
