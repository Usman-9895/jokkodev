import {SessionProvider} from '../components/accounts/session-provider';
import type { Metadata } from 'next';
import {SITE_ORIGIN,SITE_DESCRIPTION} from '../lib/seo/metadata';
import type { ReactNode } from 'react';
import { inter, sourceSerif, jetbrainsMono } from '../styles/fonts';
import '../styles/globals.css';
export const metadata: Metadata = {
  metadataBase:new URL(SITE_ORIGIN),
  applicationName:'JokkoDev',
  title: 'JokkoDev',
  description: SITE_DESCRIPTION,
  icons: { icon: [
    { url: '/brand/jokkodev-favicon.svg', type: 'image/svg+xml', media: '(prefers-color-scheme: light)' },
    { url: '/brand/jokkodev-favicon-fond-sombre.svg', type: 'image/svg+xml', media: '(prefers-color-scheme: dark)' },
  ] },
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="fr" className={`${inter.variable} ${sourceSerif.variable} ${jetbrainsMono.variable}`}><body><a href="#contenu" className="jd-skip-link">Aller au contenu</a><SessionProvider>{children}</SessionProvider></body></html>;
}
