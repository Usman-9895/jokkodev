import type { ComponentPropsWithRef } from 'react';
import { Icon } from './icon';
import type { StatusTone } from './badge';

export function Message({ tone = 'info', title, children, className = '', ...props }: ComponentPropsWithRef<'div'> & { tone?: StatusTone; title: string }) {
  // Un message statique n'est pas une alerte live par défaut. Le parcours choisit role/status.
  return <div {...props} className={`jd-message jd-tone--${tone} ${className}`}><Icon name={tone === 'success' ? 'check' : tone === 'error' ? 'close' : tone === 'warning' ? 'alert' : 'info'} /><div><p className="jd-message__title">{title}</p>{children && <div className="jd-message__body">{children}</div>}</div></div>;
}
