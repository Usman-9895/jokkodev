import Link from 'next/link';
import type { ReactNode } from 'react';
import { Brand } from './brand';
import {ThemeSelector} from './theme-selector';
export function Shell({ children, label }: { children: ReactNode; label: string }) {
  return <><header className="border-b border-border bg-surface"><nav aria-label="Navigation principale" className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6"><Link href="/" aria-label="JokkoDev — accueil"><Brand decorative /></Link><span className="hidden text-muted sm:inline">{label}</span><Link className="jd-button jd-button--secondary ml-auto" href="/connexion">Connexion</Link><ThemeSelector/></nav></header><main id="contenu" className="mx-auto max-w-5xl px-4 py-16 sm:px-6">{children}</main><footer className="mx-auto max-w-5xl border-t border-border p-6 text-sm text-muted">DevTeranga · CADEV 2026 · Fondations locales</footer></>;
}
