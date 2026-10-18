'use client';
import type {ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import {SessionGate} from './session-provider';
import {DeveloperNavigation} from '../layout/developer-navigation';
import type {DeveloperView} from '../layout/developer-navigation';
export function DeveloperSessionSpace({children}:{children:ReactNode}){
 const path=usePathname();const active:DeveloperView=path.startsWith('/espace/profil')?'profile':path.startsWith('/espace/questions')?'questions':path.startsWith('/espace/projets')?'projects':path.startsWith('/espace/candidatures')?'sent':'dashboard';
 return <SessionGate><div className="developer-product-grid"><DeveloperNavigation active={active} preview={false}/><div className="developer-content">{children}</div></div></SessionGate>;
}
