'use client';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Button, Heading, Icon } from '../ui';
export function ReadError({ retry, detail = false }: { retry?: () => void; detail?: boolean }) {
  const router = useRouter(); const [pending,startTransition] = useTransition();
  return <section className="help-read-state" role="alert"><span className="help-state-icon"><Icon name="alert" /></span><Heading as="h2" size="section">Impossible de charger {detail?'la question':'les questions'}</Heading><p>Vérifie ta connexion et réessaie. Tes critères restent conservés.</p><Button loading={pending} onClick={()=>startTransition(()=>retry?retry():router.refresh())}>Réessayer</Button></section>;
}
