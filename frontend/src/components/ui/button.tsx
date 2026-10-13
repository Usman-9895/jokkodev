import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Spinner } from './loading';

type AccessibleIconButton = { iconOnly: true; 'aria-label': string } | { iconOnly?: false; 'aria-label'?: string };
export type ButtonProps = ComponentPropsWithRef<'button'> & AccessibleIconButton & {
  variant?: 'primary' | 'secondary' | 'quiet';
  loading?: boolean;
  loadingLabel?: string;
  icon?: ReactNode;
};

export function Button({ variant = 'primary', loading = false, loadingLabel = 'Chargement…', iconOnly = false, icon, children, disabled, className = '', type = 'button', ...props }: ButtonProps) {
  return <button {...props} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={`jd-button jd-button--${variant} ${iconOnly ? 'jd-button--icon' : ''} ${className}`}>
    {loading ? <Spinner /> : icon}
    {iconOnly ? children : loading ? loadingLabel : children}
  </button>;
}
