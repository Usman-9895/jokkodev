import type {OwnProfile,ProfileUpdate} from './session';
import {countryCodes} from './countries.ts';
export type ProfileDraft={username:string;bio:string;countryCode:string;skillIds:string[];links:string[]};
export function profileDraft(profile:OwnProfile):ProfileDraft{return {username:profile.username,bio:profile.bio??'',countryCode:profile.countryCode??'',skillIds:profile.skills.map(s=>s.id),links:[...profile.links]};}
export function validateProfile(draft:ProfileDraft){
 const errors:Record<string,string>={};
 if(!/^[A-Za-z0-9_]{3,30}$/.test(draft.username))errors.username='Utilise 3 à 30 lettres sans accent, chiffres ou tirets bas.';
 if(Array.from(draft.bio).length>500)errors.bio='La biographie est limitée à 500 caractères.';
 if(draft.countryCode&&!countryCodes.some(c=>c===draft.countryCode))errors.countryCode='Choisis un code pays ISO valide.';
 if(draft.skillIds.length>15||new Set(draft.skillIds).size!==draft.skillIds.length)errors.skillIds='Choisis au plus 15 compétences distinctes.';
 if(draft.links.filter(l=>l.trim()).length>3)errors.links='Renseigne au plus trois liens.';
 draft.links.forEach((link,i)=>{if(!link.trim())return;try{const u=new URL(link);if(u.protocol!=='https:'||u.username||u.password||!u.hostname.includes('.')||u.hostname.endsWith('.')||/[\s\\]/.test(link)||link.length>2048)throw Error();}catch{errors['link-'+i]='Utilise une URL HTTPS complète sans identifiants.';}});
 return errors;
}
export function profilePayload(draft:ProfileDraft):ProfileUpdate{return {username:draft.username,bio:draft.bio.trim()||null,countryCode:draft.countryCode||null,skillIds:[...draft.skillIds],links:draft.links.map(l=>l.trim()).filter(Boolean)};}
export function countryLabel(code:string|null|undefined){if(!code)return '';try{return new Intl.DisplayNames(['fr'],{type:'region'}).of(code)??code;}catch{return code;}}
