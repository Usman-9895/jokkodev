import type {ReactNode} from 'react';
import {PublicHeader} from '../../components/layout/public-header';
import {AccountFooter} from '../../components/accounts/frame';
export default function AuthLayout({children}:{children:ReactNode}){return <div className="account-site"><PublicHeader/><main id="contenu" tabIndex={-1}>{children}</main><AccountFooter/></div>;}
