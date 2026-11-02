'use client';
import { Suspense } from 'react';
import { AccountNavigation, AccountNavigationSkeleton } from './account-navigation';

/** A single responsive account region; no server session lookup or private HTML cache. */
export function HeaderSession({ close }: { close: () => void }) {
  return <Suspense fallback={<AccountNavigationSkeleton />}><AccountNavigation close={close} /></Suspense>;
}
