import type {components,paths} from '@jokkodev/api-client';
import {countryLabel} from '../accounts/profile.ts';
import type {ProjectView,PublicPerson} from './model';
import type {ProjectCriteria} from './query';
import type {SearchValues} from '../jokkohelp/query';
export type ProjectSchemas=components['schemas'];
export type ProjectInput=Required<Pick<ProjectSchemas['CreateProjectDto'],'title'|'objective'|'technologyIds'|'recruitmentStatus'>>&{availability:string};
export const emptyProject=():ProjectInput=>({title:'',objective:'',technologyIds:[],availability:'',recruitmentStatus:'OPEN'});
const one=(v:string|string[]|undefined)=>Array.isArray(v)?v[0]??'':v??'';
export function liveProjectCriteria(v:SearchValues):ProjectCriteria{const status=one(v.status),page=Number(one(v.page));return{q:one(v.q).trim(),technology:one(v.technology).trim(),status:status==='open'||status==='closed'?status:'all',page:Number.isSafeInteger(page)&&page>0&&page<=2147483647?page:1};}
export function projectQuery(c:ProjectCriteria):NonNullable<paths['/api/v1/projects']['get']['parameters']['query']>{return{...c,pageSize:4};}
export function ownProjectQuery(role:string,page:number):NonNullable<paths['/api/v1/users/me/projects']['get']['parameters']['query']>{return{...(role==='OWNER'||role==='MEMBER'?{role}:{}),page,pageSize:3};}
export function personView(p:ProjectSchemas['PublicAuthorDto']):PublicPerson{return{name:p.username,reference:p.id,country:countryLabel(p.countryCode)};}
export function projectView(p:ProjectSchemas['ProjectSummaryDto']):ProjectView{return{id:p.id,title:p.title,summary:p.summary,objective:'',owner:personView(p.owner),technologies:p.technologies.map(t=>t.name),availability:p.availability??undefined,recruitment:p.recruitmentStatus==='OPEN'?'open':'closed',memberCount:p.memberCount,date:p.createdAt};}
export function projectDraft(p:ProjectSchemas['ProjectDetailDto']):ProjectInput{return{title:p.title,objective:p.objective,technologyIds:p.technologies.map(t=>t.id),availability:p.availability??'',recruitmentStatus:p.recruitmentStatus};}
const clean=(s:string)=>s.normalize('NFC').replace(/\r\n?/g,'\n').trim();const length=(s:string)=>Array.from(s).length;
export function validateProject(d:ProjectInput){const e:Record<string,string>={};if(length(clean(d.title))<10||length(d.title)>150)e.title='Le titre doit contenir de 10 à 150 caractères.';if(length(clean(d.objective))<30||length(d.objective)>5000)e.objective='Décris l’objectif en 30 à 5 000 caractères.';if(!d.technologyIds.length||d.technologyIds.length>10||new Set(d.technologyIds).size!==d.technologyIds.length)e.technologyIds='Choisis de 1 à 10 compétences distinctes.';if(length(d.availability)>300)e.availability='La disponibilité est limitée à 300 caractères.';if(!['OPEN','CLOSED'].includes(d.recruitmentStatus))e.recruitmentStatus='Choisis un état de recrutement.';for(const k of ['title','objective','availability'] as const)if(d[k].includes('\0'))e[k]='Retire les caractères NUL.';return e;}
export function projectPayload(d:ProjectInput):ProjectSchemas['CreateProjectDto']{return{...d,technologyIds:[...d.technologyIds],availability:d.availability.trim()?d.availability:null};}
export function projectPatch(d:ProjectInput,b:ProjectInput):ProjectSchemas['UpdateProjectDto']{const result:ProjectSchemas['UpdateProjectDto']={};for(const k of ['title','objective'] as const)if(d[k]!==b[k])result[k]=d[k];if(d.recruitmentStatus!==b.recruitmentStatus)result.recruitmentStatus=d.recruitmentStatus;if(d.availability!==b.availability)result.availability=d.availability.trim()?d.availability:null;if(JSON.stringify(d.technologyIds)!==JSON.stringify(b.technologyIds))result.technologyIds=[...d.technologyIds];return result;}
