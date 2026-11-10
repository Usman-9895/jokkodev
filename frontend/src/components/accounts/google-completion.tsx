'use client';
import Link from 'next/link';
import {useRouter,useSearchParams} from 'next/navigation';
import {useEffect,useRef,useState} from 'react';
import type {components} from '@jokkodev/api-client';
import {Button,Card,Heading,LoadingIndicator,Message,TextField} from '../ui';
import {useSession} from './session-provider';
import {PasswordField} from './password-field';
import {FailureMessage} from './live-account-form';
import {apiFailure} from '../../lib/accounts/session';
import type {ApiFailure} from '../../lib/accounts/session';
import {allowedReturnPath} from '../../lib/accounts/presentation';
type Pending=components['schemas']['GooglePendingDto'];
const errors:Record<string,string>={cancelled:'Tu as annulé la connexion Google. Ton compte reste inchangé.',suspended:'Ce compte est suspendu. Google ne permet pas de contourner cette suspension.',expired:'Ce retour Google a expiré ou a déjà été utilisé. Recommence depuis la connexion.',failed:'La connexion Google n’a pas abouti. Aucun compte n’a été lié automatiquement.'};
export function GoogleCompletion(){
 const {client,user,phase}=useSession(),router=useRouter(),search=useSearchParams();
 const [pending,setPending]=useState<Pending|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[failure,setFailure]=useState<ApiFailure|null>(null),[fields,setFields]=useState<Record<string,string>>({});
 const lock=useRef(false),summary=useRef<HTMLDivElement>(null);const error=search.get('error'),success=search.get('success')==='1';
 useEffect(()=>{
  let active=true;
  if(error){setLoading(false);return;}
  if(success){void client.reverify().then(()=>{if(!active)return;if(client.snapshot().phase==='authenticated'){client.onSessionChange?.();router.replace(allowedReturnPath(search.get('retour')??undefined));}else{setFailure({message:'La session n’a pas pu être confirmée. Reconnecte-toi.',fields:{}});setLoading(false);}});return()=>{active=false;};}
  const abort=new AbortController();void client.read<Pending>('/auth/google/pending',abort.signal).then(result=>{if(active)setPending(result);}).catch(reason=>{if(active)setFailure(apiFailure(reason));}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;abort.abort();};
 },[client,error,success,router,search]);
 async function submit(form:HTMLFormElement){
  if(lock.current||!pending)return;const data=new FormData(form),password=String(data.get('password')??''),username=String(data.get('username')??'').trim();setFields({});setFailure(null);
  if(pending.kind==='register'&&password!==String(data.get('confirmation')??'')){setFields({confirmation:'Les deux saisies sont différentes.'});summary.current?.focus();return;}
  lock.current=true;setBusy(true);
  try{
   if(pending.kind==='link'&&phase!=='authenticated'){await client.authenticate('login',{email:pending.email,password});form.reset();return;}
   await client.finishGoogle(pending.kind,pending.kind==='register'?{username,password}:{password});form.reset();router.replace(pending.kind==='register'?'/verification-email':'/espace/profil');
  }catch(reason){const result=apiFailure(reason);setFailure(result);setFields(result.fields);requestAnimationFrame(()=>summary.current?.focus());if(result.code==='EMAIL_TAKEN')void client.read<Pending>('/auth/google/pending').then(setPending).catch(()=>{});}
  finally{setBusy(false);lock.current=false;}
 }
 async function cancel(){if(lock.current)return;lock.current=true;setBusy(true);try{await client.mutate('/auth/google/pending',undefined,'DELETE');router.replace('/connexion');}catch(reason){setFailure(apiFailure(reason));setBusy(false);lock.current=false;}}
 if(loading)return <LoadingIndicator label={success?'Vérification de ta session JokkoDev…':'Vérification du retour Google…'}/>;
 if(error||!pending)return <Card className="account-card"><Heading as="h1">Connexion Google interrompue</Heading><Message role="alert" title={error?errors[error]??errors.failed:failure?.message??errors.expired}/><Link className="jd-button jd-button--primary" href="/connexion">Retour à la connexion</Link></Card>;
 const register=pending.kind==='register',connected=phase==='authenticated'&&!!user,matching=connected&&user.email===pending.email;
 return <Card className="account-card"><Heading as="h1">{register?'Bienvenue sur JokkoDev':matching?'Lier Google à ton compte':'Retrouve ton compte JokkoDev'}</Heading><p className="account-subtitle">{register?'Choisis ton pseudo et ton mot de passe JokkoDev pour terminer ton inscription.':'Cette adresse correspond à un compte existant. La liaison demande ton accord et le contrôle de ce compte.'}</p>
 <p className="account-google__email">Adresse Google : <strong>{pending.email}</strong></p>
 {register&&<Message title="Les règles de création de compte restent les mêmes">Tu recevras aussi un e-mail de vérification JokkoDev. Ton mot de passe Google ne t’est jamais demandé ici.</Message>}
 <div ref={summary} tabIndex={-1} className={failure||Object.keys(fields).length?'account-error-summary':undefined}>{failure&&<FailureMessage failure={failure}/ >}{fields.confirmation&&<p role="alert">{fields.confirmation}</p>}</div>
 {!register&&connected&&!matching?<Message tone="error" title="Un autre compte est connecté">Déconnecte-toi puis recommence avec le compte JokkoDev correspondant. Aucune liaison n’a été effectuée.</Message>:!register&&matching&&!user.emailVerified?<Message title="Vérifie d’abord ton adresse JokkoDev">Utilise le lien de vérification envoyé par JokkoDev, puis reviens ici avant l’expiration de la demande. <Link href="/verification-email">Vérifier mon adresse</Link></Message>:<form onSubmit={event=>{event.preventDefault();void submit(event.currentTarget);}}><fieldset disabled={busy}>
 {register&&<TextField id="google-username" name="username" label="Pseudonyme" autoComplete="username" required minLength={3} maxLength={30} pattern="[A-Za-z0-9_]{3,30}" error={fields.username} help="3 à 30 lettres sans accent, chiffres ou tirets bas."/>}
 <PasswordField id="google-password" name="password" label={register?'Mot de passe JokkoDev':matching?'Confirmer mon mot de passe JokkoDev':'Mot de passe JokkoDev'} autoComplete={register?'new-password':'current-password'} required minLength={register?12:1} maxLength={128} error={fields.password} help={register?'12 à 128 caractères. Les espaces sont autorisés.':matching?'Cette confirmation autorise explicitement la liaison avec Google.':'Connecte-toi au compte existant avant de confirmer la liaison.'}/>
 {register&&<PasswordField id="google-confirmation" name="confirmation" label="Confirmer le mot de passe" autoComplete="new-password" required minLength={12} maxLength={128} error={fields.confirmation}/>}
 <Button type="submit" loading={busy} loadingLabel="Vérification en cours…">{register?'Créer mon compte et lier Google':matching?'Confirmer la liaison avec Google':'Se connecter au compte existant'}</Button>
 {!register&&!matching&&<Link href="/mot-de-passe-oublie">Mot de passe oublié ?</Link>}
 </fieldset></form>}
 <p className="account-legal">Cette demande expire après dix minutes. <Link href="/confidentialite#google">Données échangées avec Google</Link></p><Button variant="secondary" disabled={busy} onClick={()=>void cancel()}>Annuler la connexion Google</Button>
 </Card>;
}
