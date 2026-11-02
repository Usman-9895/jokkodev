'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useSession } from './session-provider';
import { apiFailure } from '../../lib/accounts/session';
import { Avatar, Button } from '../ui';

export function AccountNavigationSkeleton() {
  return <div className="session-actions session-actions--pending" aria-hidden="true">
    <span className="session-placeholder-identity"><span className="session-placeholder-avatar" /><span className="session-placeholder-name" /></span>
    <span className="session-placeholder-button" />
  </div>;
}

export function AccountNavigation({ close = () => {} }: { close?: () => void }) {
  const { client, phase, user } = useSession();
  const [error, setError] = useState('');
  async function logout() {
    setError('');
    try { await client.logout(); close(); } catch (e) { setError(apiFailure(e).message); }
  }
  if (phase === 'loading') return <AccountNavigationSkeleton />;
  return <div className="session-actions">
    {!user ? <>
      <Link href="/connexion" className="jd-button jd-button--secondary" onClick={close}>Connexion</Link>
      <Link href="/inscription" className="jd-button jd-button--primary" onClick={close}>S’inscrire</Link>
      {(error || phase === 'unavailable') && <span role="status" className="session-notice">{error || 'Session momentanément indisponible'}</span>}
    </> : <>
      <Link href="/espace/profil" className="session-identity" onClick={close}><Avatar photoUrl={user.photoUrl} name={user.username} decorative /><span className="session-username">{user.username}</span><span className="sr-only"> — Mon profil</span></Link>
      <Button variant="secondary" onClick={() => void logout()}>Se déconnecter</Button>
      {error && <span role="alert" className="session-notice">{error}</span>}
    </>}
  </div>;
}
