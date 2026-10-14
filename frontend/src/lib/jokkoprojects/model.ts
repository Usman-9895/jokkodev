/** Présentation locale des exemples approuvés, pas des DTO de l’API. */
export type Recruitment = 'open' | 'closed';
export type PublicPerson = { name:string; country?:string };
export type ProjectView = {
 id:string; title:string; summary:string; objective:string; technologies:string[];
 availability?:string; recruitment:Recruitment; owner:PublicPerson; members?:PublicPerson[]; date:string;
};
export type ProjectDraft = Pick<ProjectView,'title'|'objective'|'technologies'|'recruitment'> & {availability:string};
export type ProjectPerspective = 'visitor'|'owner'|'member'|'administrator'|'suspended';
