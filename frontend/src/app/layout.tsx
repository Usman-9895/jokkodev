import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '../styles/globals.css';
export const metadata: Metadata = { title: 'JokkoDev', description: 'Entraide et collaboration entre développeurs africains — DevTeranga, CADEV 2026.' };
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="fr"><body><a href="#contenu" className="sr-only focus:not-sr-only">Aller au contenu</a>{children}</body></html>;
}
