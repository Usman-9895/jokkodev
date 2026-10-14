import type { QuestionView } from './model';
export const technologies = ['Authentification','Cloud','DevOps','Déploiement','Express','Frontend','Hooks','JWT','Linux','MongoDB','NestJS','Node.js','Performance','PostgreSQL','React','Render','Sécurité','TypeScript'] as const;
export type Criteria = { q: string; technology: string; status: 'all' | 'resolved' | 'open'; page: number };
export type SearchValues = Record<string, string | string[] | undefined>;
export const pageSize = 3;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? '' : value ?? '';
export function parseCriteria(values: SearchValues): Criteria {
  const technology = one(values.technology);
  const status = one(values.status);
  const page = one(values.page);
  return { q: one(values.q).trim().slice(0, 200), technology: technologies.find(t => t === technology) ?? '', status: status === 'resolved' || status === 'open' ? status : 'all', page: /^\d+$/.test(page) && Number.isSafeInteger(Number(page)) && Number(page) > 0 ? Number(page) : 1 };
}
export function criteriaParams(criteria: Criteria) {
  const values = new URLSearchParams();
  if (criteria.q) values.set('q', criteria.q);
  if (criteria.technology) values.set('technology', criteria.technology);
  if (criteria.status !== 'all') values.set('status', criteria.status);
  if (criteria.page > 1) values.set('page', String(criteria.page));
  return values.toString();
}
export function listHref(criteria: Criteria) { const params = criteriaParams(criteria); return `/questions${params ? '?' + params : ''}`; }
export function detailHref(id: string, criteria?: Criteria) { const params = criteria ? criteriaParams(criteria) : ''; return `/questions/${encodeURIComponent(id)}${params ? '?' + params : ''}`; }
export function fold(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr'); }

export function selectQuestions(criteria: Criteria, questions: QuestionView[]) {
  const words = fold(criteria.q).split(/\s+/).filter(Boolean);
  const matching = questions.filter(question => {
    const text = fold([question.title, question.excerpt, question.author.name, ...question.technologies].join(' '));
    return words.every(word => text.includes(word)) && (!criteria.technology || question.technologies.includes(criteria.technology)) && (criteria.status === 'all' || Boolean(question.acceptedAnswerId) === (criteria.status === 'resolved'));
  }).sort((a,b)=>b.date.localeCompare(a.date));
  const totalPages = Math.max(1, Math.ceil(matching.length / pageSize));
  const page = Math.min(criteria.page, totalPages);
  return { data: matching.slice((page - 1) * pageSize, page * pageSize), meta: { total: matching.length, totalPages, page, pageSize, sourceEmpty: questions.length === 0 } };
}
