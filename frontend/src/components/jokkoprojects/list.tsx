import {ProjectCard,ProjectHero,ProjectNotice,ProjectPagination,ProjectReadState} from './shared';
import {ProjectFilters} from './filters';
import {selectProjects} from '../../lib/jokkoprojects/query';
import type {ProjectCriteria} from '../../lib/jokkoprojects/query';
export function ProjectList({criteria,result}:{criteria:ProjectCriteria;result:ReturnType<typeof selectProjects>}){return <><ProjectHero/><ProjectNotice/><ProjectFilters key={[criteria.q,criteria.technology,criteria.status].join('|')} criteria={criteria}/><p className="project-results" role="status">{result.meta.total} projet{result.meta.total!==1?'s':''} · page {result.meta.page}/{result.meta.totalPages}</p>{result.data.length?<><div className="projects-grid">{result.data.map(p=><ProjectCard key={p.id} project={p} criteria={criteria}/>)}</div><ProjectPagination criteria={criteria} totalPages={result.meta.totalPages}/></>:<ProjectReadState kind={result.meta.sourceEmpty?'empty':'no-results'}/>}</>;}
