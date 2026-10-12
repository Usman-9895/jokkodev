import type { ReactNode } from 'react';
import { Shell } from '../../components/layout/shell';
export default function PublicLayout({ children }: { children: ReactNode }) { return <Shell label="Entraide et collaboration">{children}</Shell>; }
