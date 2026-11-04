import {SessionProvider} from '../components/accounts/session-provider';
import type { Metadata } from 'next';
import {SITE_ORIGIN,SITE_DESCRIPTION} from '../lib/seo/metadata';
import type { ReactNode } from 'react';
import { inter, sourceSerif, jetbrainsMono } from '../styles/fonts';
import '../styles/globals.css';
import {PwaClient} from '../components/layout/pwa-client';
export const metadata: Metadata = {
  metadataBase:new URL(SITE_ORIGIN),
  applicationName:'JokkoDev',
  manifest:'/manifest.webmanifest',
  title: 'JokkoDev',
  description: SITE_DESCRIPTION,
  icons: { apple:'/pwa/apple-touch-icon.png', icon: [
    { url: '/brand/jokkodev-favicon.svg', type: 'image/svg+xml', media: '(prefers-color-scheme: light)' },
    { url: '/brand/jokkodev-favicon-fond-sombre.svg', type: 'image/svg+xml', media: '(prefers-color-scheme: dark)' },
  ] },
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="fr" suppressHydrationWarning className={`${inter.variable} ${sourceSerif.variable} ${jetbrainsMono.variable}`}><head>
    <meta name="color-scheme" content="light"/>
    {/* Same-origin blocking file resolves the theme before paint, retaining static HTML and CSP. */}
    {/* eslint-disable-next-line @next/next/no-sync-scripts */}
    <script src="/theme-init.js"/>
  </head><body><a href="#contenu" className="jd-skip-link">Aller au contenu</a><SessionProvider>{children}</SessionProvider><PwaClient/></body></html>;
}
