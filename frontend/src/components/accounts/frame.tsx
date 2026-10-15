import Image from 'next/image';
import Link from 'next/link';
import type {ReactNode} from 'react';
import {Heading} from '../ui';
import {accountCopy} from '../../lib/accounts/presentation';
import type {AccountScreen} from '../../lib/accounts/presentation';
export function AccountFrame({screen,children}:{screen:AccountScreen;children:ReactNode}){
  const copy=accountCopy[screen];
  return <div className="account-frame"><aside className="account-brand" aria-label="La communauté JokkoDev"><svg className="account-network" viewBox="0 0 500 800" fill="none" aria-hidden="true"><path d="M-40 30C390 25 390 480 540 630M-30 670C210 390 260 800 520 670M0 780 95 690 185 720 290 630 420 750 500 680M330 40 400 130 360 260 480 320 420 460" />{[[95,690],[185,720],[290,630],[420,750],[400,130],[360,260],[480,320],[420,460]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r={i%2?5:8}/>)}</svg><div className="account-brand__content"><Image className="account-original" src="/brand/jokkodev-original.png" width={828} height={990} alt="JokkoDev" priority/><span className="account-accent"/><Heading as="h2" size="section">{copy.panel}</Heading><p>{copy.description}</p></div><Image className="account-africa" src="/illustrations/africa-natural-earth.svg" width={180} height={180} alt=""/></aside><section className="account-work"><Link className="account-back" href={screen==='login'||screen==='register'?'/':'/connexion'}>← {screen==='login'||screen==='register'?'Retour à l’accueil':'Retour à la connexion'}</Link>{children}</section></div>;
}
export function AccountFooter(){return <footer className="account-footer"><nav aria-label="Informations"><Link href="/a-propos">À propos</Link><Link href="/regles">Règles communautaires</Link><Link href="/confidentialite">Confidentialité</Link><Link href="/contact">Contact</Link></nav><span>JokkoDev · DevTeranga · CADEV 2026</span></footer>;}
