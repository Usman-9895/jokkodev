import {AdminGate} from '../../../components/reports/live-shared';
import type { ReactNode } from 'react';
import {AdminShell} from '../../../components/layout/admin-shell';
export default function AdminLayout({ children }: { children: ReactNode }) { return <AdminShell><AdminGate>{children}</AdminGate></AdminShell>; }
