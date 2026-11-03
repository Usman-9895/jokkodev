'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { PrimaryLinks } from './primary-links';
import { primaryNavigation } from '../../lib/layout/navigation';
import { HeaderSession } from '../accounts/header-session';
import { Brand } from './brand';
import { Container } from './container';
import { ThemeSelector } from './theme-selector';

export function PublicHeader() {
  const panel = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  function close(returnFocus = false) {
    setOpen(false);
    if (returnFocus) toggle.current?.focus();
  }
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1200px)');
    const resize = () => {
      if (media.matches) {
        if (document.activeElement === toggle.current) document.querySelector<HTMLAnchorElement>('.public-brand-link')?.focus();
        setOpen(false);
      } else if (panel.current?.contains(document.activeElement)) toggle.current?.focus();
    };
    media.addEventListener('change', resize);
    return () => media.removeEventListener('change', resize);
  }, []);
  return <header className="public-header" onKeyDown={event => {
    if (event.key === 'Escape' && open) { event.preventDefault(); close(true); }
  }}><Container className="public-header__row">
    <Link href="/" className="public-brand-link" aria-label="JokkoDev — accueil"><Brand decorative /></Link>
    <button type="button" ref={toggle} className="public-menu-toggle" aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={open} aria-controls="navigation-principale" onClick={() => setOpen(value => !value)}>
      <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{open ? <path d="m6 6 12 12M18 6 6 18" /> : <path d="M4 6h16M4 12h16M4 18h16" />}</svg>
    </button>
    <div id="navigation-principale" ref={panel} className="public-header-navigation" data-open={open}>
      <nav className="public-nav" aria-label="Navigation principale"><PrimaryLinks close={() => close()} /></nav>
      <div className="public-account"><HeaderSession close={() => close(true)} /></div>
      <ThemeSelector/>
    </div>
    <noscript><nav className="public-header-noscript" aria-label="Navigation sans JavaScript">{primaryNavigation(undefined, '').map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}<Link href="/connexion">Connexion</Link><Link href="/inscription">S’inscrire</Link></nav></noscript>
  </Container></header>;
}
