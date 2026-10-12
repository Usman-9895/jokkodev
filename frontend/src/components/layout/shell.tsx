import Link from 'next/link';
import type { ReactNode } from 'react';
export function Shell({ children, label }: { children: ReactNode; label: string }) {
  return <><header className="border-b border-border bg-surface"><nav aria-label="Navigation principale" className="mx-auto flex max-w-5xl flex-wrap items-center gap-6 p-6"><Link className="text-xl font-bold text-night" href="/">JokkoDev</Link><span className="text-muted">{label}</span><Link className="ml-auto underline" href="/connexion">Connexion</Link></nav></header><main id="contenu" className="mx-auto max-w-5xl px-6 py-16">{children}</main><footer className="mx-auto max-w-5xl border-t border-border p-6 text-sm text-muted">DevTeranga · CADEV 2026 · Fondations locales</footer></>;
}
