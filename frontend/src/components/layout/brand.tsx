import Image from 'next/image';

export function Brand({ variant = 'horizontal', theme = 'auto', className = '', decorative = false }: { variant?: 'horizontal' | 'icon'; theme?: 'light' | 'dark' | 'auto'; className?: string; decorative?: boolean }) {
  const filename = variant === 'horizontal' ? 'horizontal' : 'icone';
  const image = (dark: boolean, imageClass?: string) => <Image className={imageClass} src={`/brand/jokkodev-${filename}${dark ? '-fond-sombre' : ''}.svg`} alt={decorative ? '' : 'JokkoDev'} width={variant === 'horizontal' ? 2116 : 1277} height={variant === 'horizontal' ? 647 : 1277}/>;
  return <span className={`jd-brand jd-brand--${variant} ${className}`}>{theme === 'auto' ? <>{image(false, 'jd-brand__light')}{image(true, 'jd-brand__dark')}</> : image(theme === 'dark')}</span>;
}
