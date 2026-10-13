import type { ComponentPropsWithRef } from 'react';
import { Icon } from './icon';

export type StatusTone = 'info' | 'success' | 'warning' | 'error';
export function TechnologyBadge({ className = '', ...props }: ComponentPropsWithRef<'span'>) {
  return <span {...props} className={`jd-badge jd-badge--technology ${className}`} />;
}
export function StatusBadge({ tone = 'info', children, className = '', ...props }: ComponentPropsWithRef<'span'> & { tone?: StatusTone }) {
  return <span {...props} className={`jd-badge jd-tone--${tone} ${className}`}><Icon name={tone === 'success' ? 'check' : tone === 'error' ? 'close' : tone === 'warning' ? 'alert' : 'info'} />{children}</span>;
}
