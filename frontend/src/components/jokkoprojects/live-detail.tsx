'use client';
import {useSearchParams} from 'next/navigation';
import type {ProjectSchemas} from '../../lib/jokkoprojects/api';
import {personView,projectView,liveProjectCriteria,orderedMembers} from '../../lib/jokkoprojects/api';
import {projectDetailHref} from '../../lib/jokkoprojects/query';
import {LiveApplicationPanel} from '../applications/live-form';
import {useHelpResource} from '../jokkohelp/live-resource';
import {HelpPages} from '../jokkohelp/live-list';
import {Container} from '../layout/container';
import {Avatar,LoadingIndicator} from '../ui';
import {ProjectLoading,ProjectPerson} from './shared';
import {ProjectDetail} from './detail';
import {ProjectFailure,useProjectCriteria} from './live-list';
export function LiveProjectDetail({id}:{id:string}){const criteria=useProjectCriteria(),s=useSearchParams(),membersPage=liveProjectCriteria({page:s.get('membersPage')??''}).page;const detail=useHelpResource<ProjectSchemas['ProjectDetailDto']>('/projects/'+encodeURIComponent(id));const members=useHelpResource<ProjectSchemas['MemberPageDto']>('/projects/'+encodeURIComponent(id)+'/members',{page:membersPage,pageSize:12});
 if(detail.error)return <Container className="projects-page"><ProjectFailure error={detail.error} retry={detail.retry} detail/></Container>;if(!detail.data)return <Container className="projects-page"><ProjectLoading/></Container>;
 const p=detail.data,view={...projectView(p),objective:p.objective};
 const membersHref=(page:number)=>{const url=new URL(projectDetailHref(id,criteria),'https://jokkodev.invalid');url.searchParams.set('membersPage',String(page));return url.pathname+url.search+'#membres';};
 return <ProjectDetail live project={view} criteria={criteria} membersSection={<div id="membres">{members.error?<ProjectFailure error={members.error} retry={members.retry}/>:!members.data?<LoadingIndicator label="Chargement des membres publics…"/>:<><div className="project-members">{orderedMembers(members.data.data).map(m=><div key={m.id}><Avatar name={m.username} decorative/><div><strong><ProjectPerson person={personView(m)}/></strong>{m.isOwner&&<span>Responsable</span>}</div></div>)}</div>{!members.data.data.length&&<p>Aucun membre sur cette page.</p>}{(members.data.meta.total>members.data.meta.pageSize||membersPage>1)&&<HelpPages page={membersPage} total={members.data.meta.total} pageSize={members.data.meta.pageSize} href={membersHref} label="Pagination des membres publics"/>}</>}</div>} contributionPanel={<LiveApplicationPanel project={p}/>}/>;
}
