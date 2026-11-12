'use client';
import Link from 'next/link';
import {useRouter,useSearchParams} from 'next/navigation';
import {useRef,useState} from 'react';
import type {AccountScreen} from '../../lib/accounts/presentation';
import {accountCopy,allowedReturnPath} from '../../lib/accounts/presentation';
import {apiFailure} from '../../lib/accounts/session';
import type {ApiFailure} from '../../lib/accounts/session';
import {validateCredentials} from '../../lib/accounts/validation';
import {useSession} from './session-provider';
import {PasswordField} from './password-field';
import {Button,Card,Heading,Message,TextField,Icon} from '../ui';
import {ExternalSignIns} from './external-sign-ins';
export function FailureMessage({failure}:{failure:ApiFailure}) {return <Message tone="error" role="alert" title={failure.message}>{failure.retryAfterSeconds!==undefined&&<p>Réessaie après {failure.retryAfterSeconds} secondes, selon le serveur.</p>}</Message>;}
export function LiveAccountForm({screen}:{screen:AccountScreen}) {return screen==='verify'?<EmailVerification/>:<CredentialForm screen={screen}/>;}
function CredentialForm({screen}:{screen:Exclude<AccountScreen,'verify'>}) {
 const {client}=useSession();const router=useRouter(),search=useSearchParams();
 const [failure,setFailure]=useState<ApiFailure|null>(null),[errors,setErrors]=useState<Record<string,string>>({}),[waiting,setWaiting]=useState(false),[success,setSuccess]=useState(false);
 const busy=useRef(false),summary=useRef<HTMLDivElement>(null);const token=search.get('token')??'';const copy=accountCopy[screen];
 const password=['login','register','reset'].includes(screen);
 async function submit(form:HTMLFormElement) {
  if(busy.current)return;const data=new FormData(form),email=String(data.get('email')??'').trim(),username=String(data.get('pseudonym')??'').trim(),value=String(data.get('password')??''),confirmation=String(data.get('confirmation')??'');
  const next=validateCredentials(screen,{email,username,password:value,confirmation},(form.elements.namedItem('email') as HTMLInputElement|null)?.validity.valid??true);
  setFailure(null);setErrors(next);if(Object.keys(next).length){requestAnimationFrame(()=>summary.current?.focus());return;}
  busy.current=true;setWaiting(true);
  try {
   if(screen==='login'){await client.authenticate('login',{email,password:value});form.reset();router.replace(allowedReturnPath(search.get('retour')??undefined));}
   else if(screen==='register'){await client.authenticate('register',{email,username,password:value});form.reset();router.replace('/verification-email');}
   else if(screen==='forgot'){await client.mutate('/auth/forgot-password',{email});setSuccess(true);}
   else {await client.reset({token,password:value});form.reset();setSuccess(true);}
  }catch(error){const result=apiFailure(error);const mapped={...result.fields};if(mapped.username){mapped.pseudonym=mapped.username;delete mapped.username;}setErrors(mapped);setFailure(result);requestAnimationFrame(()=>summary.current?.focus());}
  finally{busy.current=false;setWaiting(false);}
 }
 if(screen==='reset'&&(!/^[A-Za-z0-9_-]{43}$/.test(token)||failure?.code==='TOKEN_INVALID'))return <Card className="account-card account-result"><Heading as="h1">Ce lien n’est plus utilisable</Heading><p>{failure?.code==='TOKEN_INVALID'?'Ce lien est invalide, expiré ou déjà utilisé.':'Le lien est absent ou incorrect. Demande un nouveau lien.'}</p><Link className="jd-button jd-button--primary" href="/mot-de-passe-oublie">Demander un nouveau lien</Link></Card>;
 if(success)return <Card className="account-card account-result"><span className="account-result-icon is-success" aria-hidden="true"><Icon name="check"/></span><Heading as="h1">{screen==='forgot'?'Consulte ta messagerie':'Ton mot de passe est renouvelé'}</Heading><Message tone="success" role="status" title={screen==='forgot'?'Demande prise en compte':'Modification confirmée'}>{screen==='forgot'?'Si un compte correspond à cette adresse, tu recevras un lien de réinitialisation.':'Toutes les sessions de ce compte ont été révoquées. Reconnecte-toi avec le nouveau mot de passe.'}</Message><Link className="account-back" href="/connexion">Retour à la connexion</Link></Card>;
 return <Card className="account-card"><Heading as="h1" size="page">{screen==='login'?<>Heureux de te<br className="account-mobile-break"/> retrouver</>:copy.title}</Heading><p className="account-subtitle">{copy.subtitle}</p>
 {(screen==='login'||screen==='register')&&<ExternalSignIns/>}
 {(failure||Object.keys(errors).length>0)&&<div ref={summary} tabIndex={-1} className="account-error-summary">{failure&&<FailureMessage failure={failure}/ >}{Object.keys(errors).length>0&&<div role="alert"><strong>Vérifie les champs indiqués.</strong><ul>{Object.entries(errors).map(([field,message])=><li key={field}><a href={'#account-'+field}>{message}</a></li>)}</ul></div>}</div>}
 <form noValidate onSubmit={event=>{event.preventDefault();void submit(event.currentTarget);}}><fieldset disabled={waiting}>
 {screen==='register'&&<TextField id="account-pseudonym" name="pseudonym" autoComplete="username" label="Pseudonyme" required maxLength={30} error={errors.pseudonym} help="3 à 30 lettres sans accent, chiffres ou tirets bas."/>}
 {screen!=='reset'&&<TextField id="account-email" name="email" type="email" autoComplete="email" label="Adresse email" required maxLength={254} error={errors.email}/>}
 {password&&<PasswordField id="account-password" name="password" autoComplete={screen==='login'?'current-password':'new-password'} label={screen==='reset'?'Nouveau mot de passe':'Mot de passe'} required error={errors.password} help={screen==='login'?undefined:'12 à 128 caractères. Les espaces sont autorisés.'}/>}
 {(screen==='register'||screen==='reset')&&<PasswordField id="account-confirmation" name="confirmation" autoComplete="new-password" label="Confirmer le mot de passe" required error={errors.confirmation}/>}
 {screen==='login'&&<Link className="account-forgot" href="/mot-de-passe-oublie">Mot de passe oublié ?</Link>}
 <Button type="submit" loading={waiting} loadingLabel="Traitement en cours…">{copy.action}</Button>
 </fieldset></form>
 <div className="account-secondary">{screen==='login'?<>Pas encore de compte ? <Link href="/inscription">S’inscrire</Link></>:screen==='register'?<>Déjà un compte ? <Link href="/connexion">Se connecter</Link></>:<Link href="/connexion">← Retour à la connexion</Link>}</div>
 {screen==='register'&&<p className="account-legal">Consulte les <Link href="/regles">règles communautaires</Link> et la <Link href="/confidentialite">page de confidentialité</Link>.</p>}
 </Card>;
}
function EmailVerification(){
 const {client,user,phase}=useSession();const search=useSearchParams();const token=search.get('token')??'';
 const [failure,setFailure]=useState<ApiFailure|null>(null),[waiting,setWaiting]=useState(false),[result,setResult]=useState<'verified'|'requested'|null>(null);const busy=useRef(false);
 async function act(verify:boolean){if(busy.current)return;busy.current=true;setWaiting(true);setFailure(null);try{await client.mutate(verify?'/auth/verify-email':'/auth/resend-verification',verify?{token}:undefined,'POST',!verify);setResult(verify?'verified':'requested');if(verify)await client.refresh();}catch(error){setFailure(apiFailure(error));}finally{busy.current=false;setWaiting(false);}}
 const invalid=!!token&&!/^[A-Za-z0-9_-]{43}$/.test(token);
 const verified=result==='verified'||!token&&!!user?.emailVerified;
 return <Card className="account-card account-result"><span className={'account-result-icon '+(verified?'is-success':'')} aria-hidden="true"><Icon name={verified?'check':'info'}/></span><Heading as="h1" size="page">{verified?'Ton adresse email est vérifiée':'Vérifie ton adresse email'}</Heading><p className="account-subtitle">{verified?'Tu peux continuer à utiliser ton compte JokkoDev.':token?'Confirme la vérification de ton adresse avec le lien reçu.':'Utilise le lien reçu dans ta messagerie pour confirmer ton adresse.'}</p>
 {failure&&<FailureMessage failure={failure}/ >}{result==='requested'&&<Message role="status" tone="success" title="Demande prise en compte">Un nouvel email est demandé si ton adresse n’est pas encore vérifiée. Vérifie aussi tes courriers indésirables.</Message>}
 {invalid&&<Message tone="error" role="alert" title="Lien incorrect">Ce lien est absent ou incorrect. Demande un nouvel email de vérification.</Message>}
 {!verified&&token&&!invalid&&failure?.code!=='TOKEN_INVALID'&&<Button loading={waiting} loadingLabel="Vérification en cours…" onClick={()=>void act(true)}>Vérifier mon adresse email</Button>}
 {!verified&&user&&<Button variant="secondary" loading={waiting} loadingLabel="Traitement en cours…" onClick={()=>void act(false)}>Renvoyer un email</Button>}
 {!verified&&!user&&phase!=='loading'&&<Link className="account-back" href="/connexion">Se connecter pour renvoyer un email</Link>}
 <Link className="account-back" href={user?'/espace/profil':'/connexion'}>{user?'Mon profil':'Se connecter'}</Link><Link className="account-back" href="/">Retour à l’accueil</Link></Card>;
}
