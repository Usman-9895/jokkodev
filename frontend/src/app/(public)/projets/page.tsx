export const metadata = {"title":"Projets | JokkoDev","description":"Interface préparée ; opération backend encore indisponible."};
import {redirect} from 'next/navigation';
import {Container} from '../../../components/layout/container';
import {ProjectList} from '../../../components/jokkoprojects/list';
import {projectSource} from '../../../lib/jokkoprojects/source';
import {parseProjectCriteria,projectListHref} from '../../../lib/jokkoprojects/query';
import type {SearchValues} from '../../../lib/jokkohelp/query';
export default async function ProjectsPage({searchParams}:{searchParams:Promise<SearchValues>}){const criteria=parseProjectCriteria(await searchParams),result=await projectSource.list(criteria),effective={...criteria,page:result.meta.page};if(criteria.page!==effective.page)redirect(projectListHref(effective));return <Container className="projects-page"><ProjectList criteria={effective} result={result}/></Container>;}
