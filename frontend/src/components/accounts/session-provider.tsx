'use client';
import {createContext,useContext,useEffect,useState,useSyncExternalStore} from 'react';
import type {ReactNode} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {AccountClient} from '../../lib/accounts/session';
import {allowedReturnPath} from '../../lib/accounts/presentation';
import {Button,Card,Heading,LoadingIndicator,Message} from '../ui';
const Context=createContext<AccountClient|null>(null);
export function SessionProvider({children}:{children:ReactNode}) {
 const [client]=useState(()=>new AccountClient());
 useEffect(()=>{void client.refresh();const check=()=>{if(document.visibilityState==='visible')void client.refresh();};window.addEventListener('focus',check);document.addEventListener('visibilitychange',check);const timer=window.setInterval(check,60_000);return()=>{window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',check);window.clearInterval(timer);};},[client]);
 return <Context.Provider value={client}>{children}</Context.Provider>;
}
export function useSession(){const client=useContext(Context);if(!client)throw Error('SessionProvider requis');const state=useSyncExternalStore(client.subscribe,client.snapshot,client.serverSnapshot);return {client,...state};}
export function SessionGate({children}:{children:ReactNode}) {
 const {client,phase,user,revision}=useSession();const pathname=usePathname();
 if(phase==='loading')return <LoadingIndicator label="Vérification de la session…"/>;
 if(phase==='unavailable')return <Card><Heading as="h1">Session indisponible</Heading><Message tone="error" title="Le serveur ne répond pas">Aucune donnée privée n’est affichée.</Message><Button onClick={()=>void client.refresh()}>Réessayer</Button></Card>;
 if(phase!=='authenticated'||!user)return <Card><Heading as="h1">Connexion requise</Heading><Message title="Connecte-toi pour accéder à ton espace">Ta session est absente ou a expiré. Aucune donnée privée n’est affichée.</Message><Link className="jd-button jd-button--primary" href={'/connexion?retour='+encodeURIComponent(allowedReturnPath(pathname))}>Se connecter</Link></Card>;
 return <div key={user.id+':'+revision}>{children}</div>;
}
