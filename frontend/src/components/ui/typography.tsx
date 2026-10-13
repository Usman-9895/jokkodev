import type { ComponentPropsWithRef } from 'react';

export function Heading({ as: Tag = 'h2', size = 'section', className = '', ...props }: ComponentPropsWithRef<'h2'> & { as?: 'h1' | 'h2' | 'h3' | 'h4'; size?: 'display' | 'page' | 'section' | 'card' }) {
  return <Tag {...props} className={`jd-title jd-title--${size} ${className}`} />;
}
