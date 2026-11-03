'use client';
import {useState,useSyncExternalStore} from 'react';
import {Icon} from '../ui';

type Preference = 'light' | 'dark';
declare global {
  interface Window {
    JokkoDevTheme?: {getPreference(): Preference; setPreference(value: Preference): void};
  }
}
function subscribe(notify: () => void) {
  window.addEventListener('jokkodev:theme-change', notify);
  return () => window.removeEventListener('jokkodev:theme-change', notify);
}
function snapshot() { return window.JokkoDevTheme?.getPreference() ?? null; }
function serverSnapshot() { return null; }

/** A native button keeps Space/Enter and focus behavior without custom keyboard code. */
export function ThemeSelector() {
  const preference = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const [animate, setAnimate] = useState(false);
  const selected = preference ?? 'light';
  const dark = selected === 'dark';
  const action = dark ? 'Activer le mode clair' : 'Activer le mode sombre';
  return <button type="button" className="theme-selector" data-mode={selected} data-animate={animate || undefined}
    aria-label={`Mode ${dark ? 'sombre' : 'clair'} : ${action.toLowerCase()}`} title={action}
    disabled={preference === null} onClick={() => {
      setAnimate(true);
      window.JokkoDevTheme?.setPreference(dark ? 'light' : 'dark');
    }}>
    <span className="theme-selector__label" aria-hidden="true">{dark ? 'Sombre' : 'Clair'}</span>
    <span className="theme-selector__thumb" aria-hidden="true"><Icon className="theme-selector__sun" name="sun"/><Icon className="theme-selector__moon" name="moon"/></span>
  </button>;
}
