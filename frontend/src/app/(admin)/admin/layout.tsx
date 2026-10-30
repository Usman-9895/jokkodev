import {privateRobots} from '../../../lib/seo/metadata';
export const metadata={robots:privateRobots};
import {AdminGate} from '../../../components/reports/live-shared';
import type { ReactNode } from 'react';
import {AdminShell} from '../../../components/layout/admin-shell';
export default function AdminLayout({ children }: { children: ReactNode }) { return <AdminShell><AdminGate>{children}</AdminGate></AdminShell>; }
