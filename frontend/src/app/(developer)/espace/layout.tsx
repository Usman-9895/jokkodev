import type { ReactNode } from 'react';
import { Shell } from '../../../components/layout/shell';
export default function DeveloperLayout({ children }: { children: ReactNode }) { return <Shell label="Espace développeur">{children}</Shell>; }
