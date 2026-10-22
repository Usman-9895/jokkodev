'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useSession} from '../accounts/session-provider';
import {primaryNavigation} from '../../lib/layout/navigation';
export function PrimaryLinks({close=()=>{}}:{close?:()=>void}){const {user,phase}=useSession(),pathname=usePathname();return <>{primaryNavigation(phase==='authenticated'?user?.role:undefined,pathname).map(({href,label,active})=><Link key={href} href={href} aria-current={active?'page':undefined} onClick={close}>{label}</Link>)}</>;}
