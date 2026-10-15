import type { ReactNode } from 'react';
import {PublicHeader} from '../../../components/layout/public-header';
import {PublicFooter} from '../../../components/layout/public-footer';
import {Container} from '../../../components/layout/container';
export default function DeveloperLayout({children}:{children:ReactNode}) { return <div className="public-site"><PublicHeader/><main id="contenu" tabIndex={-1}><Container className="coming-soon">{children}</Container></main><PublicFooter/></div>; }
