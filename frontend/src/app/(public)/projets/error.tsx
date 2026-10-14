'use client';
import {useSearchParams} from 'next/navigation';
import {Container} from '../../../components/layout/container';
import {ProjectFilters} from '../../../components/jokkoprojects/filters';
import {ProjectError} from '../../../components/jokkoprojects/shared';
import {parseProjectCriteria} from '../../../lib/jokkoprojects/query';
export default function ErrorPage({reset}:{reset:()=>void}){const p=useSearchParams();return <Container className="projects-page"><ProjectFilters criteria={parseProjectCriteria(Object.fromEntries(p))}/><ProjectError retry={reset}/></Container>;}
