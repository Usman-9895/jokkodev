import localFont from 'next/font/local';

export const inter = localFont({
  src: './fonts/Inter-Variable.ttf',
  variable: '--font-inter',
  weight: '400 700',
  display: 'swap',
});

export const sourceSerif = localFont({
  src: './fonts/SourceSerif4-Variable.ttf',
  variable: '--font-source-serif',
  weight: '400 700',
  display: 'swap',
});

export const jetbrainsMono = localFont({
  src: './fonts/JetBrainsMono-Variable.ttf',
  variable: '--font-jetbrains-mono',
  weight: '400 700',
  display: 'swap',
});
