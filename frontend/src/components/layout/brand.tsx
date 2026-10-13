import Image from 'next/image';

export function Brand({ variant = 'horizontal', theme = 'light', className = '', decorative = false }: { variant?: 'horizontal' | 'icon'; theme?: 'light' | 'dark'; className?: string; decorative?: boolean }) {
  const filename = variant === 'horizontal' ? 'horizontal' : 'icone';
  return <span className={`jd-brand jd-brand--${variant} ${className}`}><Image src={`/brand/jokkodev-${filename}${theme === 'dark' ? '-fond-sombre' : ''}.svg`} alt={decorative ? '' : 'JokkoDev'} width={variant === 'horizontal' ? 2116 : 1277} height={variant === 'horizontal' ? 647 : 1277} /></span>;
}
