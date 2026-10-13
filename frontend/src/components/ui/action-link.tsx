import Link from 'next/link';
import type { ComponentProps } from 'react';
import { Icon } from './icon';

export function ActionLink({ children, className = '', ...props }: ComponentProps<typeof Link>) {
  return <Link {...props} className={`jd-action-link ${className}`}>{children}<Icon name="arrow-right" /></Link>;
}
