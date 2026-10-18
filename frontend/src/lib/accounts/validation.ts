import type {AccountScreen} from './presentation';
export function validateCredentials(screen:Exclude<AccountScreen,'verify'>,draft:{email:string;username:string;password:string;confirmation:string},emailValid:boolean){
 const next:Record<string,string>={};const length=Array.from(draft.password).length;
 if(screen!=='reset'&&(!draft.email||!emailValid))next.email='Renseigne une adresse email valide.';
 if(screen==='register'&&!/^[A-Za-z0-9_]{3,30}$/.test(draft.username))next.pseudonym='Utilise 3 à 30 lettres sans accent, chiffres ou tirets bas.';
 if(['login','register','reset'].includes(screen)&&(!draft.password||length>128||screen!=='login'&&length<12))next.password=screen==='login'?'Renseigne un mot de passe de 1 à 128 caractères.':'Utilise un mot de passe de 12 à 128 caractères.';
 if((screen==='register'||screen==='reset')&&(!draft.confirmation||draft.confirmation!==draft.password))next.confirmation='Les deux mots de passe doivent être identiques.';
 return next;
}
