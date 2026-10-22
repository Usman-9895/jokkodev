'use client';
import {PrimaryLinks} from '../layout/primary-links';
import {useRef} from 'react';
import Link from 'next/link';
import {AccountNavigation} from '../accounts/account-navigation';
export function AdminAccountMenu(){const menu=useRef<HTMLDetailsElement>(null),trigger=useRef<HTMLElement>(null);function close(){if(menu.current)menu.current.open=false;}return <><div className="admin-session"><AccountNavigation/></div><details className="admin-mobile-menu" ref={menu} onKeyDown={e=>{if(e.key==='Escape'&&menu.current?.open){e.preventDefault();close();trigger.current?.focus();}}}><summary ref={trigger} aria-label="Menu administrateur">☰</summary><nav aria-label="Navigation administrateur mobile"><PrimaryLinks close={close}/><Link href="/" onClick={close}>Retour au site</Link><AccountNavigation close={close}/></nav></details></>;}
