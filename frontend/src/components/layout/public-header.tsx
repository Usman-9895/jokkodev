'use client';
import Link from 'next/link';
import {PrimaryLinks} from './primary-links';
import { useEffect, useRef, useState } from 'react';
import {AccountNavigation} from '../accounts/account-navigation';
import { Brand } from './brand';
import { Container } from './container';

export function PublicHeader() {
  const details = useRef<HTMLDetailsElement>(null);
  const summary = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  function close(returnFocus = false) {
    if (details.current) details.current.open = false;
    if (returnFocus) summary.current?.focus();
  }
  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');
    const resize = () => {
      if (media.matches && details.current?.open) {
        const contained = details.current.contains(document.activeElement);
        close();
        if (contained) document.querySelector<HTMLAnchorElement>('.public-brand-link')?.focus();
      }
    };
    media.addEventListener('change', resize);
    return () => media.removeEventListener('change', resize);
  }, []);
  return <header className="public-header"><Container className="public-header__row">
    <Link href="/" className="public-brand-link" aria-label="JokkoDev — accueil"><Brand decorative /></Link>
    <nav className="public-nav" aria-label="Navigation principale"><PrimaryLinks close={()=>close()}/></nav>
    <div className="public-account"><AccountNavigation/></div>
    <details className="public-menu" ref={details} onToggle={event => setOpen(event.currentTarget.open)} onKeyDown={event => { if (event.key === 'Escape' && details.current?.open) { event.preventDefault(); close(true); } }}>
      <summary ref={summary} aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={open || undefined} aria-controls="navigation-mobile"><svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path className="menu-lines" d="M4 6h16M4 12h16M4 18h16" /><path className="menu-close" d="m6 6 12 12M18 6 6 18" /></svg></summary>
      <nav id="navigation-mobile" aria-label="Navigation mobile"><PrimaryLinks close={()=>close()}/><AccountNavigation close={()=>close()}/></nav>
    </details>
  </Container></header>;
}
