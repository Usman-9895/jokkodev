import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { DesignSystemPreview } from './preview';

export const metadata: Metadata = {
  title: 'Aperçu local des composants — JokkoDev',
  robots: { index: false, follow: false },
};

export default function DesignSystemPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <DesignSystemPreview />;
}
