import type { ReactNode } from 'react';
import { PublicHeader } from '../../components/layout/public-header';
import { PublicFooter } from '../../components/layout/public-footer';
export default function PublicLayout({ children }: { children: ReactNode }) { return <div className="public-site"><PublicHeader /><main id="contenu" tabIndex={-1}>{children}</main><PublicFooter /></div>; }
