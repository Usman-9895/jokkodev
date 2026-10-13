import type { ComponentPropsWithRef } from 'react';

export function Card({ tone = 'default', className = '', ...props }: ComponentPropsWithRef<'article'> & { tone?: 'default' | 'help' | 'project' }) {
  return <article {...props} className={`jd-card jd-card--${tone} ${className}`} />;
}
