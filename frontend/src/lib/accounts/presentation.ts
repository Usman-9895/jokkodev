/** Présentation locale uniquement : aucune règle métier, session ou DTO API. */
export type AccountScreen = 'login' | 'register' | 'forgot' | 'reset' | 'verify';
export type AccountDraft = { pseudonym: string; email: string; password: string; confirmation: string };
export function validateAccountDraft(screen: AccountScreen, draft: AccountDraft, emailValid: boolean) {
  const errors: Record<string,string> = {};
  if (screen === 'register' && !draft.pseudonym.trim()) errors.pseudonym = 'Renseigne un pseudonyme pour cet aperçu.';
  if (screen !== 'reset' && screen !== 'verify') {
    if (!draft.email.trim()) errors.email = 'Renseigne une adresse email.';
    else if (!emailValid) errors.email = 'Vérifie le format de cette adresse email.';
  }
  if (['login','register','reset'].includes(screen) && !draft.password) errors.password = 'Renseigne un mot de passe de démonstration.';
  if (screen === 'register' || screen === 'reset') {
    if (!draft.confirmation) errors.confirmation = 'Confirme le mot de passe de démonstration.';
    else if (draft.confirmation !== draft.password) errors.confirmation = 'Les deux saisies sont différentes.';
  }
  return errors;
}
/** Autorisation locale des liens affichés ; jamais une politique backend. */
export function safeExternalLink(value: string): string | null {
  if (Array.from(value).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127 || char === '\\')) return null;
  try { const url = new URL(value.trim()); return ['https:','http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; }
}
/** Futur retour après connexion : aucun transfert automatique n’est exécuté dans ce lot. */
export function allowedReturnPath(value: string | undefined): string {
  if (!value || Array.from(value).some(char => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127 || char === '\\') || !value.startsWith('/') || value.startsWith('//')) return '/espace';
  try { const url = new URL(value,'https://jokkodev.invalid'); const allowed = ['/espace','/espace/profil','/questions','/questions/poser','/projets']; return url.origin === 'https://jokkodev.invalid' && allowed.includes(url.pathname) && !url.search && !url.hash ? url.pathname : '/espace'; } catch { return '/espace'; }
}
export const accountCopy = {
  login: { title:'Heureux de te retrouver', subtitle:'Connecte-toi pour contribuer et collaborer.', panel:'Retrouve la communauté JokkoDev', description:'Pose tes questions, partage tes connaissances et collabore sur des projets avec des développeurs de toute l’Afrique.', action:'Se connecter' },
  register: { title:'Rejoins JokkoDev', subtitle:'Un compte pour apprendre, contribuer et collaborer.', panel:'Les bonnes idées grandissent ensemble', description:'Une communauté de développeurs africains pour poser vos questions, obtenir des réponses et collaborer sur des projets.', action:'Créer mon compte' },
  forgot: { title:'Retrouve ton accès', subtitle:'Indique l’adresse email utilisée pour ton compte.', panel:'Reprenons le fil', description:'Pas de souci, ça arrive. Indique ton adresse email pour recevoir un lien de réinitialisation et retrouver l’accès à ton compte.', action:'Envoyer le lien' },
  reset: { title:'Choisis un nouveau mot de passe', subtitle:'Utilise une phrase de passe que tu n’utilises pas ailleurs.', panel:'Un nouveau départ, en sécurité', description:'Choisis un nouveau mot de passe pour retrouver l’accès à ton compte et continuer à contribuer à la communauté.', action:'Enregistrer le mot de passe' },
  verify: { title:'Vérifie ton adresse email', subtitle:'Confirme ton adresse avec le lien reçu par email.', panel:'Bienvenue dans la communauté', description:'Pose tes questions, partage tes connaissances et collabore sur des projets avec des développeurs de toute l’Afrique.', action:'Renvoyer un email' },
} satisfies Record<AccountScreen,{title:string;subtitle:string;panel:string;description:string;action:string}>;
