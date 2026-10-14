import {fold} from '../jokkohelp/query.ts';
import type {SearchValues} from '../jokkohelp/query';
import type {ProjectView} from './model';
export type ProjectCriteria={q:string;technology:string;status:'all'|'open'|'closed';page:number};
export const projectTechnologies=['JavaScript','NestJS','Next.js','PostgreSQL','React','TypeScript','UI/UX'];
export const projectPageSize=4;
const one=(v:string|string[]|undefined)=>Array.isArray(v)?v[0]??'':v??'';
export function parseProjectCriteria(values:SearchValues):ProjectCriteria{
 const status=one(values.status),page=one(values.page),technology=one(values.technology);
 return {q:one(values.q).trim().slice(0,200),technology:projectTechnologies.includes(technology)?technology:'',status:status==='open'||status==='closed'?status:'all',page:/^\d+$/.test(page)&&Number.isSafeInteger(Number(page))&&Number(page)>0?Number(page):1};
}
export function projectParams(c:ProjectCriteria){const p=new URLSearchParams();if(c.q)p.set('q',c.q);if(c.technology)p.set('technology',c.technology);if(c.status!=='all')p.set('status',c.status);if(c.page>1)p.set('page',String(c.page));return p.toString();}
export function projectListHref(c:ProjectCriteria){const p=projectParams(c);return '/projets'+(p?'?'+p:'');}
export function projectDetailHref(id:string,c?:ProjectCriteria){const p=c?projectParams(c):'';return '/projets/'+encodeURIComponent(id)+(p?'?'+p:'');}
export function selectProjects(c:ProjectCriteria,projects:ProjectView[]){
 const words=fold(c.q).split(/\s+/).filter(Boolean);
 const matching=projects.filter(p=>words.every(w=>fold([p.title,p.summary,p.objective,p.owner.name,...p.technologies].join(' ')).includes(w))&&(!c.technology||p.technologies.includes(c.technology))&&(c.status==='all'||p.recruitment===c.status)).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
 const totalPages=Math.max(1,Math.ceil(matching.length/projectPageSize)),page=Math.min(c.page,totalPages);
 return {data:matching.slice((page-1)*projectPageSize,page*projectPageSize),meta:{total:matching.length,totalPages,page,pageSize:projectPageSize,sourceEmpty:projects.length===0}};
}
