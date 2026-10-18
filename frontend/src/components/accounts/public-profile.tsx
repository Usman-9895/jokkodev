'use client';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {useEffect,useState} from 'react';
import type {components} from '@jokkodev/api-client';
import {useSession} from './session-provider';
import {FailureMessage} from './live-account-form';
import {apiFailure} from '../../lib/accounts/session';
import type {ApiFailure,PublicProfile} from '../../lib/accounts/session';
import {countryLabel} from '../../lib/accounts/profile';
import {safeExternalLink} from '../../lib/accounts/presentation';
import {Avatar,Button,Card,Heading,Icon,LoadingIndicator,Message,StatusBadge,TechnologyBadge} from '../ui';
import {displayDate} from '../../lib/jokkohelp/presentation';
import {Container} from '../layout/container';
type S=components['schemas'];type Item={id:string;title:string;text:string;technologies:string[];status:string;date:string;positive:boolean;answerCount?:number};
const kinds=['questions','answers','projects'] as const;
export function PublicProfilePage({reference}:{reference:string}) {
 const {client}=useSession(),search=useSearchParams();const tab=kinds.find(t=>t===search.get('tab'))??'questions';const n=Number(search.get('page'));const page=Number.isInteger(n)&&n>=1&&n<=10000?n:1;
 const [profile,setProfile]=useState<PublicProfile|null>(null),[failure,setFailure]=useState<ApiFailure|null>(null),[missing,setMissing]=useState(false),[retry,setRetry]=useState(0);
 const [items,setItems]=useState<{rows:Item[];total:number}|null>(null),[listError,setListError]=useState<ApiFailure|null>(null);
 useEffect(()=>{const abort=new AbortController();setProfile(null);setFailure(null);setMissing(false);client.read<PublicProfile>('/users/'+encodeURIComponent(reference),abort.signal).then(result=>{if(!abort.signal.aborted)setProfile(result);}).catch(error=>{if(!abort.signal.aborted){if(error?.status===404)setMissing(true);else setFailure(apiFailure(error));}});return()=>abort.abort();},[client,reference,retry]);
 useEffect(()=>{if(!profile)return;const abort=new AbortController();setItems(null);setListError(null);
  const path='/users/'+encodeURIComponent(profile.id)+'/'+tab;const query={page,pageSize:4};
  async function load(){try{let rows:Item[],total:number;
   if(tab==='questions'){const result=await client.read<S['QuestionSummaryPageDto']>(path,abort.signal,false,query);rows=result.data.map(q=>({id:q.id,title:q.title,text:q.excerpt,technologies:q.technologies.map(t=>t.name),status:q.resolved?'Résolue':'Non résolue',date:q.createdAt,positive:q.resolved,answerCount:q.answerCount}));total=result.meta.total;}
   else if(tab==='projects'){const result=await client.read<S['ProjectSummaryPageDto']>(path,abort.signal,false,query);rows=result.data.map(p=>({id:p.id,title:p.title,text:p.summary,technologies:p.technologies.map(t=>t.name),status:p.recruitmentStatus==='OPEN'?'Recrutement ouvert':'Recrutement fermé',date:p.createdAt,positive:p.recruitmentStatus==='OPEN'}));total=result.meta.total;}
   else{const result=await client.read<S['AnswerWithQuestionPageDto']>(path,abort.signal,false,query);rows=result.data.map(a=>({id:a.id,title:a.questionTitle,text:a.body,technologies:[],status:a.accepted?'Solution acceptée':'Réponse',date:a.createdAt,positive:a.accepted}));total=result.meta.total;}
   if(!abort.signal.aborted)setItems({rows,total});
  }catch(error){if(!abort.signal.aborted)setListError(apiFailure(error));}}void load();return()=>abort.abort();
 },[client,profile,tab,page,retry]);
 const href=(kind:string,p=1)=>'/profils/'+encodeURIComponent(reference)+'?'+new URLSearchParams({tab:kind,page:String(p)});
 if(missing)return <Container className="profile-unavailable"><Card><Heading as="h1">Profil introuvable</Heading><p>Ce profil n’est pas disponible.</p><Link className="account-back" href="/">Retour à l’accueil</Link></Card></Container>;
 if(failure)return <Container className="profile-unavailable"><Heading as="h1">Impossible de charger le profil</Heading><FailureMessage failure={failure}/><Button onClick={()=>setRetry(r=>r+1)}>Réessayer</Button></Container>;
 if(!profile)return <Container className="profile-unavailable"><LoadingIndicator label="Chargement du profil public…"/></Container>;
 return <Container className="profile-preview profile-live"><div className="profile-top"><Card className="profile-identity"><Avatar name={profile.username} size="lg" decorative/><div><Heading as="h1" size="page">{profile.username}</Heading><p className="profile-meta">@{profile.username}{profile.countryCode?' · '+countryLabel(profile.countryCode):''}</p><p>{profile.bio||'Biographie non renseignée.'}</p><div className="help-tags">{profile.skills.map(t=><TechnologyBadge key={t.id}>{t.name}</TechnologyBadge>)}</div>{profile.links.map((value,i)=>{const safe=safeExternalLink(value);return safe?.startsWith('https:')?<a key={value} className="account-back" href={safe} target="_blank" rel="noopener noreferrer">Lien professionnel {i+1} ↗</a>:null;})}</div></Card>
 <Card className="profile-contributions"><Heading as="h2" size="card">Contributions</Heading>{[['Questions publiées',profile.stats.questions],['Réponses apportées',profile.stats.answers],['Projets publics',profile.stats.projects]].map(([label,count],i)=><div key={label}><span aria-hidden="true"><Icon name={i===0?'info':i===1?'code':'users'}/></span><p><strong>{count}</strong>{label}</p></div>)}</Card></div>
 <Card className="profile-content"><nav className="profile-tabs" aria-label="Contributions du profil">{kinds.map((kind,i)=><Link key={kind} href={href(kind)} aria-current={tab===kind?'page':undefined}>{['Questions','Réponses','Projets'][i]}</Link>)}</nav><Heading as="h2" size="section">{tab==='answers'?'Réponses':tab==='projects'?'Projets':'Questions'} de {profile.username}</Heading>
 <p className="profile-description">Les contributions publiques retournées par le serveur.</p><Message title="Détails en cours d’intégration" className="profile-live-notice">Les pages de questions et projets restent en démonstration jusqu’aux prochains lots.</Message>
 {listError?<><FailureMessage failure={listError}/><Button onClick={()=>setRetry(r=>r+1)}>Réessayer</Button></>:!items?<LoadingIndicator label="Chargement des contributions…"/>:items.rows.length===0?<p className="profile-empty">Aucune contribution sur cette page.</p>:<div className="profile-contribution-list">{items.rows.map(item=><article key={item.id}><Card className="help-question"><div className="help-question__top"><Heading as="h3" size="card">{item.title}</Heading><StatusBadge tone={item.positive?"success":"info"}>{item.status}</StatusBadge></div><p className="help-question__excerpt">{item.text}</p><div className="help-tags">{item.technologies.map(t=><TechnologyBadge key={t}>{t}</TechnologyBadge>)}</div><div className="help-question__bottom"><time dateTime={item.date}>{displayDate(item.date)}</time>{item.answerCount!==undefined&&<span className="help-count"><Icon name="info"/>{item.answerCount} réponse{item.answerCount!==1?"s":""}</span>}</div></Card></article>)}</div>}
 {items&&<nav className="profile-pagination" aria-label="Pagination des contributions">{page>1?<Link className="account-back" href={href(tab,page-1)}>Précédent</Link>:<span/>}<span>Page {page} · {items.total} résultat{items.total>1?'s':''}</span>{page*4<items.total&&<Link className="account-back" href={href(tab,page+1)}>Suivant</Link>}</nav>}</Card></Container>;
}
