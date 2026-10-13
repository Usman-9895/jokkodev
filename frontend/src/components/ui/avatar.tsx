export function Avatar({ name, size = 'md', decorative = false }: { name: string; size?: 'sm' | 'md' | 'lg'; decorative?: boolean }) {
  const words = name.trim().split(/\s+/u).filter(Boolean);
  const initials = (words.length > 1 ? [words[0], words.at(-1)!] : words).map(word => Array.from(word)[0]).join('').toLocaleUpperCase('fr') || '?';
  return <span className={`jd-avatar jd-avatar--${size}`} role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : `Avatar de ${name || 'profil inconnu'}`} aria-hidden={decorative || undefined}>{initials}</span>;
}
