'use client';
import Link from 'next/link';
import {useRef,useState} from 'react';
import {Button,Card,Heading,Message,TextField} from '../ui';
import {PasswordField} from './password-field';
import {accountCopy,validateAccountDraft} from '../../lib/accounts/presentation';
import type {AccountScreen,AccountDraft} from '../../lib/accounts/presentation';
export function AccountForm({screen,demo=false,state='initial'}:{screen:AccountScreen;demo?:boolean;state?:string}){
  const copy=accountCopy[screen];
  const [errors,setErrors]=useState<Record<string,string>>({});
  const [result,setResult]=useState('');
  const summary=useRef<HTMLDivElement>(null);
  const waiting=demo&&state==='sending';
  const password=screen==='login'||screen==='register'||screen==='reset';
  const fields=<>
    {screen==='register'&&<TextField id="account-pseudonym" name="pseudonym" autoComplete="username" label="Pseudonyme" placeholder="awa_demo" error={errors.pseudonym}/>}
    {screen!=='reset'&&screen!=='verify'&&<TextField id="account-email" name="email" type="email" autoComplete="email" label="Adresse email" placeholder="exemple@example.com" error={errors.email}/>}
    {password&&<PasswordField id="account-password" name="password" autoComplete={screen==='login'?'current-password':'new-password'} label={screen==='reset'?'Nouveau mot de passe':'Mot de passe'} error={errors.password} help={screen==='login'?undefined:'La politique de mot de passe reste à confirmer avec le backend.'}/>}
    {(screen==='register'||screen==='reset')&&<PasswordField id="account-confirmation" name="confirmation" autoComplete="new-password" label="Confirmer le mot de passe" error={errors.confirmation}/>}
    {screen==='login'&&<Link className="account-forgot" href="/mot-de-passe-oublie">Mot de passe oublié ?</Link>}
    <Button type={demo?'submit':'button'} disabled={!demo||waiting} loading={waiting} loadingLabel="Traitement simulé…">{copy.action}{demo&&<span className="sr-only"> — vérification locale de démonstration</span>}</Button>
  </>;
  function verify(form:HTMLFormElement){
    const values=new FormData(form);const draft=Object.fromEntries(['pseudonym','email','password','confirmation'].map(name=>[name,String(values.get(name)??'')])) as AccountDraft;
    const email=form.elements.namedItem('email') as HTMLInputElement|null;
    const next=validateAccountDraft(screen,draft,email?.validity.valid??true);setErrors(next);
    setResult(Object.keys(next).length?'':'Saisie vérifiée localement. Opération indisponible : aucun compte, email ou session créé.');
    if(Object.keys(next).length)requestAnimationFrame(()=>summary.current?.focus());
  }
  return <Card className="account-card"><Heading as="h1" size="page">{screen==='login'?<>Heureux de te<br className="account-mobile-break"/> retrouver</>:copy.title}</Heading><p className="account-subtitle">{copy.subtitle}</p><Message title={demo?'Démonstration locale':'Opération indisponible'}><p>{demo?'Utilise uniquement des données fictives. La validation ne transmet rien au serveur.':'Les comptes ne sont pas encore raccordés au backend. N’utilise pas de données réelles ; aucune opération ne sera effectuée.'}</p></Message>
    {demo&&state==='error'&&<Message tone="error" role="alert" title="Erreur de parcours simulée">L’opération n’a pas abouti dans cet état injecté. La saisie reste disponible ; aucun compte n’est recherché.</Message>}
    {screen==='reset'&&!demo&&<p className="account-link-status">Le contrat du lien de réinitialisation est absent. Aucun paramètre de jeton n’est lu ni validé.</p>}
    {screen==='verify'?<><p className="account-link-status">{demo?'Écran d’attente simulé ; aucun email envoyé.':'Aucun email n’a été envoyé ni vérifié par cette interface. Le renvoi et la lecture d’un lien attendent le contrat backend.'}</p><Button disabled loading={waiting} loadingLabel="Traitement simulé…">{copy.action}</Button></>:<>
      {Object.keys(errors).length>0&&<div ref={summary} tabIndex={-1} className="account-error-summary" role="alert"><strong>Vérifie les champs indiqués.</strong><ul>{Object.entries(errors).map(([name,error])=><li key={name}><a href={'#account-'+name}>{error}</a></li>)}</ul></div>}
      {demo?<form noValidate onSubmit={event=>{event.preventDefault();if(!waiting)verify(event.currentTarget);}}><fieldset disabled={waiting}>{fields}</fieldset></form>:<div className="account-fields" role="group" aria-label="Champs du futur parcours">{fields}</div>}
      {result&&<Message role="status" title="Vérification locale terminée">{result}</Message>}
    </>}
    <div className="account-secondary">{screen==='login'?<>Pas encore de compte ? <Link href="/inscription">S’inscrire</Link></>:screen==='register'?<>Déjà un compte ? <Link href="/connexion">Se connecter</Link></>:<Link href="/connexion">← Retour à la connexion</Link>}</div>
    {screen==='register'&&<p className="account-legal">Les règles et textes de confidentialité restent à finaliser. Aucun consentement n’est demandé dans cet aperçu.</p>}
  </Card>;
}
