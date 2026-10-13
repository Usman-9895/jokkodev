import type { ComponentPropsWithRef } from 'react';

export function Spinner({ label }: { label?: string }) {
  return <span className="jd-spinner" role={label ? 'status' : undefined} aria-hidden={label ? undefined : true}>{label && <span className="sr-only">{label}</span>}</span>;
}
export function LoadingIndicator({ label = 'Chargement en cours…' }: { label?: string }) {
  return <div className="jd-loading" role="status"><Spinner /><span>{label}</span></div>;
}
export function Skeleton({ className = '', ...props }: ComponentPropsWithRef<'div'>) {
  return <div {...props} aria-hidden="true" className={`jd-skeleton ${className}`} />;
}
