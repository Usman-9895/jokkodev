'use client';
import {useSearchParams} from 'next/navigation';
import {Container} from '../layout/container';
import {QuestionFilters} from './filters';
import {ReadLoading,QuestionHero,DemoNotice} from './shared';
import {parseCriteria} from '../../lib/jokkohelp/query';
export function ListLoading(){const values=useSearchParams();const criteria=parseCriteria({q:values.get('q')??'',technology:values.get('technology')??'',status:values.get('status')??'',page:values.get('page')??''});return <Container className="help-page"><QuestionHero/><DemoNotice/><QuestionFilters criteria={criteria}/><ReadLoading/></Container>;}
