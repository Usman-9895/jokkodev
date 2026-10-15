export const metadata = {"title":"Questions | JokkoDev","description":"Interface préparée ; opération backend encore indisponible."};
import { Container } from '../../../components/layout/container';
import { QuestionFilters } from '../../../components/jokkohelp/filters';
import { DemoNotice, QuestionCard, QuestionHero, QuestionPagination, QuestionTips, ReadState } from '../../../components/jokkohelp/shared';
import { parseCriteria } from '../../../lib/jokkohelp/query';
import type { SearchValues } from '../../../lib/jokkohelp/query';
import { helpSource } from '../../../lib/jokkohelp/source';
import { redirect } from 'next/navigation';
import { listHref } from '../../../lib/jokkohelp/query';
export default async function QuestionsPage({searchParams}:{searchParams:Promise<SearchValues>}) {
  const criteria = parseCriteria(await searchParams);
  const result = await helpSource.list(criteria);
  const effective = {...criteria,page:result.meta.page};
  if(criteria.page!==effective.page)redirect(listHref(effective));
  return <Container className="help-page"><QuestionHero /><DemoNotice /><QuestionFilters key={[criteria.q,criteria.technology,criteria.status].join('|')} criteria={effective} /><div className="help-grid"><section aria-labelledby="question-list-title"><div className="help-list-heading"><h2 id="question-list-title">Récentes</h2><p role="status">{result.meta.total} question{result.meta.total!==1?'s':''} · page {result.meta.page}/{result.meta.totalPages}</p></div>{result.data.length?<><div className="help-question-list">{result.data.map(question=><QuestionCard key={question.id} question={question} criteria={effective} />)}</div><QuestionPagination criteria={effective} totalPages={result.meta.totalPages} /></>:<ReadState kind={result.meta.sourceEmpty?'empty':'no-results'} />}</section><aside><QuestionTips /></aside></div></Container>;
}
