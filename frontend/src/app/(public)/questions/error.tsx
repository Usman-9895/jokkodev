'use client';
import {useSearchParams} from 'next/navigation';
import {QuestionFilters} from '../../../components/jokkohelp/filters';
import {ReadError} from '../../../components/jokkohelp/read-error';
import {Container} from '../../../components/layout/container';
import {parseCriteria} from '../../../lib/jokkohelp/query';
export default function ErrorPage({reset}:{reset:()=>void}){const values=useSearchParams();const criteria=parseCriteria({q:values.get('q')??'',technology:values.get('technology')??'',status:values.get('status')??'',page:values.get('page')??''});return <Container className="help-page"><QuestionFilters criteria={criteria}/><ReadError retry={reset}/></Container>;}
