import type {components,paths} from '@jokkodev/api-client';
import {HttpError} from '@jokkodev/api-client/http';
export type ReportSchemas=components['schemas'];
export type Report=ReportSchemas['ReportDto'];
export type ReportDetail=ReportSchemas['ReportDetailDto'];
export type ReportInput=ReportSchemas['CreateReportDto'];
export type Decision=ReportSchemas['ResolveReportDto']['decision'];
/** A proxy 502 cannot prove whether the server committed the write before its response was lost. */
export function reportReceiptUncertain(error:unknown){return error instanceof HttpError&&(['network','protocol'].includes(error.kind)||error.status===502&&!!error.details&&typeof error.details==='object'&&'code' in error.details&&error.details.code==='API_UNAVAILABLE');}
export const decisions=['NO_ACTION','HIDE_CONTENT','SUSPEND_ACCOUNT'] as const;
export const decisionLabels:Record<ReportSchemas['ModerationActionDto']['decision'],string>={REACTIVATE_ACCOUNT:'Réactiver le compte',NO_ACTION:'Clôturer sans sanction',HIDE_CONTENT:'Masquer le contenu',SUSPEND_ACCOUNT:'Suspendre le compte auteur'};
export const reportTypes={question:'QUESTION',answer:'ANSWER',project:'PROJECT'} as const;
export const typeLabels={QUESTION:'Question',ANSWER:'Réponse',PROJECT:'Projet'};
export const decisionEffects:Record<Decision,string>={NO_ACTION:'Le signalement sera clôturé sans modifier le contenu ni le compte.',HIDE_CONTENT:'Le contenu ne sera plus accessible publiquement. Une question masquée rend aussi ses réponses indisponibles. Masquer une réponse acceptée retire la solution. Le signalement sera clôturé.',SUSPEND_ACCOUNT:'Le compte auteur ou responsable sera suspendu et ses sessions révoquées. Ses contenus ne seront pas masqués automatiquement. Le signalement sera clôturé.'};
export function validateReason(value:string){const text=value.normalize('NFC').replace(/\r\n?/g,'\n').trim();return value.includes('\0')?'Retire les caractères NUL.':Array.from(text).length<10||Array.from(value).length>1000?'Indique un motif de 10 à 1 000 caractères.':undefined;}
export function reportCriteria(values:{status?:string;page?:string}){const status:Report['status']|undefined=values.status==='open'?'OPEN':values.status==='closed'?'CLOSED':undefined;const page=Number(values.page);return{status,page:Number.isSafeInteger(page)&&page>0&&page<=2147483647?page:1};}
export function reportQuery(c:ReturnType<typeof reportCriteria>):NonNullable<paths['/api/v1/admin/reports']['get']['parameters']['query']>{return{...c,pageSize:4};}
export function reportListHref(c:ReturnType<typeof reportCriteria>){const q=new URLSearchParams({...c.status?{status:c.status.toLowerCase()}:{},...c.page>1?{page:String(c.page)}:{}});return '/admin/signalements'+(q.size?'?'+q:'');}
export function reportDetailHref(id:string,c:ReturnType<typeof reportCriteria>){return '/admin/signalements/'+encodeURIComponent(id)+reportListHref(c).slice('/admin/signalements'.length);}
export function targetHref(t:Report['target']){return t.deletedAt||t.visibility!=='VISIBLE'?undefined:t.type==='PROJECT'?'/projets/'+encodeURIComponent(t.id):'/questions/'+encodeURIComponent(t.questionId??t.id)+(t.type==='ANSWER'?'#reponse-'+encodeURIComponent(t.id):'');}
export function checkedReport(value:ReportSchemas['CreatedReportDto']|undefined,input:ReportInput){if(!value?.id||value.status!=='OPEN'||value.targetType!==input.targetType||value.targetId!==input.targetId)throw new HttpError('protocol','Réponse de signalement incomplète. Aucun nouvel envoi automatique.');return value;}
export function checkedResolution(value:ReportDetail|undefined,id:string){if(!value||value.id!==id||value.status!=='CLOSED'||!value.decision||!value.closedAt||!value.closedBy)throw new HttpError('protocol','Réponse de décision incomplète. Relis le signalement.');return value;}

/** Ownership is the target author's ID, never its parent author or a displayed name. */
export function canReportTarget(phase:'loading'|'guest'|'authenticated'|'unavailable',userId:string|undefined,ownerId:string|undefined){return !!ownerId&&(phase==='guest'||phase==='authenticated'&&!!userId&&userId!==ownerId);}
