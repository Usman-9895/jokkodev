import type {ProjectDraft,ProjectPerspective,ProjectView} from './model';
export function canEditProject(p:ProjectPerspective){return p==='owner';}
export function emptyProjectDraft():ProjectDraft{return {title:'',objective:'',technologies:[],availability:'',recruitment:'open'};}
export function projectDraftFrom(p:ProjectView):ProjectDraft{return {title:p.title,objective:p.objective,technologies:[...p.technologies],availability:p.availability??'',recruitment:p.recruitment};}
/** Vérifications locales de l’aperçu, jamais des contraintes backend revendiquées. */
export function validateProjectDraft(d:ProjectDraft){const e:Record<string,string>={};if(!d.title.trim())e.title='Renseigne un titre pour cet aperçu.';if(!d.objective.trim())e.objective='Décris l’objectif pour cet aperçu.';if(!d.technologies.length)e.technologies='Choisis une compétence de démonstration.';return e;}
export function selectPersonalExamples<T extends {relation:'created'|'joined'}>(data:T[],tab:'all'|'created'|'joined'){return data.filter(p=>tab==='all'||p.relation===tab);}
