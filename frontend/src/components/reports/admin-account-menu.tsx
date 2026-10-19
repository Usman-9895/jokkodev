'use client';
import {useRef} from 'react';
import Link from 'next/link';
import {AccountNavigation} from '../accounts/account-navigation';
export function AdminAccountMenu(){const menu=useRef<HTMLDetailsElement>(null),trigger=useRef<HTMLElement>(null);function close(){if(menu.current)menu.current.open=false;}return <><div className="admin-session"><AccountNavigation adminLink={false}/></div><details className="admin-mobile-menu" ref={menu} onKeyDown={e=>{if(e.key==='Escape'&&menu.current?.open){e.preventDefault();close();trigger.current?.focus();}}}><summary ref={trigger} aria-label="Menu administrateur">☰</summary><nav aria-label="Navigation administrateur mobile"><Link href="/questions" onClick={close}>Questions</Link><Link href="/projets" onClick={close}>Projets</Link><Link href="/admin/signalements" onClick={close}>Signalements</Link><Link href="/" onClick={close}>Retour au site</Link><AccountNavigation close={close} adminLink={false}/></nav></details></>;}
