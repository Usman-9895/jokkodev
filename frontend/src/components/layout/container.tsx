import type { ComponentPropsWithRef } from 'react';

export function Container({ className = '', ...props }: ComponentPropsWithRef<'div'>) {
  return <div {...props} className={`jd-container ${className}`} />;
}
