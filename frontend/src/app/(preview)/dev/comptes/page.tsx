import {notFound} from 'next/navigation';
import Link from 'next/link';
import type {Metadata} from 'next';
import {PublicHeader} from '../../../../components/layout/public-header';
import {AccountFrame,AccountFooter} from '../../../../components/accounts/frame';
import {AccountForm} from '../../../../components/accounts/account-form';
import {AccountState} from '../../../../components/accounts/account-state';
import {ProfilePreview} from '../../../../components/accounts/profile-preview';
import type {AccountScreen} from '../../../../lib/accounts/presentation';
export const metadata:Metadata={title:'Comptes et profils — aperçu local',robots:{index:false,follow:false}};
const views=['login','register','forgot','reset','verify','profile','edit'];
const statesByView:Record<string,string[]>={login:['initial','sending','error','session-expired','limited'],register:['initial','sending','error','pending','success','limited'],forgot:['initial','sending','error','success','limited'],reset:['initial','sending','error','missing','invalid','expired','used','success'],verify:['initial','sending','pending','success','invalid','expired','used','limited'],profile:['initial','loading','error','missing','long','not-found'],edit:['initial','sending','error','success','long']};
export default async function Preview({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 if(process.env.NODE_ENV!=='development')notFound();
 const params=await searchParams;const view=typeof params.view==='string'&&views.includes(params.view)?params.view:'login';const states=statesByView[view];const state=typeof params.state==='string'&&states.includes(params.state)?params.state:'initial';const tab=typeof params.tab==='string'&&['questions','answers','projects'].includes(params.tab)?params.tab:'questions';
 const account=view!=='profile'&&view!=='edit';const screen=view as AccountScreen;const result=['success','pending','missing','invalid','expired','used','session-expired','limited'].includes(state);
 return <div className="account-site"><PublicHeader/><main id="contenu" tabIndex={-1}><div className="account-preview-tools"><p>Développement uniquement · données et états fictifs · aucun compte ni envoi réel</p><details><summary>Options de l’aperçu : écrans et états</summary><nav aria-label="Écrans de démonstration">{views.map(v=><Link key={v} href={'/dev/comptes?view='+v} aria-current={view===v?'page':undefined}>{({login:'Connexion',register:'Inscription',forgot:'Récupération',reset:'Nouveau mot de passe',verify:'Email',profile:'Profil public',edit:'Modifier le profil'})[v as typeof view]}</Link>)}</nav><nav aria-label="États de démonstration">{states.map(s=><Link key={s} href={'/dev/comptes?view='+view+'&state='+s} aria-current={state===s?'page':undefined}>{s}</Link>)}</nav></details></div>{account?<AccountFrame screen={screen}>{result?<AccountState screen={screen} state={state}/>:<AccountForm key={view+state} screen={screen} demo state={state}/>}</AccountFrame>:<ProfilePreview key={view+state+tab} edit={view==='edit'} state={state} tab={tab}/>}</main><AccountFooter/></div>;
}
