import type {components,paths} from '@jokkodev/api-client';
import {HttpError} from '@jokkodev/api-client/http';
export type ApplicationSchemas=components['schemas'];
export type Application=ApplicationSchemas['ApplicationDto'];
export type ApplicationStatus=Application['status'];
export type ApplicationDecision=ApplicationSchemas['DecideApplicationDto']['status'];
export const applicationStatuses=['PENDING','ACCEPTED','REJECTED','WITHDRAWN'] as const;
export const applicationLabels:Record<ApplicationStatus,string>={PENDING:'En attente',ACCEPTED:'Acceptée',REJECTED:'Refusée',WITHDRAWN:'Retirée'};
export function applicationCriteria(values:{status?:string;page?:string}){const status=applicationStatuses.find(s=>s===values.status),n=Number(values.page);return{status,page:Number.isSafeInteger(n)&&n>0&&n<=2147483647?n:1};}
export function applicationQuery(c:ReturnType<typeof applicationCriteria>):NonNullable<paths['/api/v1/users/me/applications']['get']['parameters']['query']>{return{...c,pageSize:4};}
export function applicationListHref(received:boolean,status?:ApplicationStatus,page=1,projectId?:string){const path=projectId?'/espace/projets/'+encodeURIComponent(projectId)+'/demandes':'/espace/candidatures';return path+'?'+new URLSearchParams({...received&&!projectId?{vue:'recues'}:{},...status?{status}:{},...page>1?{page:String(page)}:{}});}
export function applicationHref(id:string){return '/espace/candidatures/'+encodeURIComponent(id);}
export function validateLiveMessage(message:string){const normalized=message.normalize('NFC').replace(/\r\n?/g,'\n').trim();return message.includes('\0')?'Retire les caractères NUL.':Array.from(normalized).length<20||Array.from(message).length>1000?'Explique ta contribution en 20 à 1 000 caractères.':undefined;}
export function applicationActions(a:Application):ApplicationDecision[]{return a.status!=='PENDING'?[]:a.viewerRole==='APPLICANT'?['WITHDRAWN']:a.project.available?['ACCEPTED','REJECTED']:[];}
/** Defensive projection: an unavailable project never reuses a previously displayed title or owner. */
export function applicationProject(a:Application){return a.project.available?{title:a.project.title??'Projet',href:'/projets/'+encodeURIComponent(a.project.id)}:{title:a.project.deletedAt?'Projet supprimé':'Projet indisponible',href:undefined};}
export function checkedDecision(value:Application|undefined,id:string){if(!value||value.id!==id||!applicationStatuses.includes(value.status))throw new HttpError('protocol','Réponse de décision incomplète. Relis l’état avant toute nouvelle action.');return value;}
/** One in-flight operation per mounted view; ambiguous writes must be read before another decision. */
export class DecisionLock {
 busy=false;needsRead=false;
 async run<T>(operation:()=>Promise<T>):Promise<T|undefined>{if(this.busy||this.needsRead)return;this.busy=true;try{return await operation();}catch(error){if(error instanceof HttpError&&['network','protocol'].includes(error.kind))this.needsRead=true;throw error;}finally{this.busy=false;}}
 async read<T>(operation:()=>Promise<T>){if(this.busy)return;this.busy=true;try{const value=await operation();this.needsRead=false;return value;}finally{this.busy=false;}}
}
