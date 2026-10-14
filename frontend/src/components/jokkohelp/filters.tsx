'use client';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import Link from 'next/link';
import { Button, TextField, SelectField } from '../ui';
import { listHref, parseCriteria, technologies } from '../../lib/jokkohelp/query';
import type { Criteria } from '../../lib/jokkohelp/query';
export function QuestionFilters({ criteria }: { criteria: Criteria }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <form className="help-filters" action="/questions" method="get" aria-busy={pending} onSubmit={event => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const next = parseCriteria({ q: String(values.get('q') ?? ''), technology: String(values.get('technology') ?? ''), status: String(values.get('status') ?? '') });
    startTransition(() => router.push(listHref(next), { scroll: false }));
  }}>
    <TextField id="question-search" type="search" name="q" label="Rechercher une question" placeholder="Rechercher une question…" defaultValue={criteria.q} maxLength={200} />
    <SelectField id="question-technology" name="technology" label="Technologie" defaultValue={criteria.technology}><option value="">Toutes</option>{technologies.map(technology => <option key={technology}>{technology}</option>)}</SelectField>
    <SelectField id="question-status" name="status" label="État" defaultValue={criteria.status}><option value="all">Tous</option><option value="resolved">Résolues</option><option value="open">Non résolues</option></SelectField>
    <Button type="submit" loading={pending} loadingLabel="Recherche…">Rechercher</Button>{(criteria.q||criteria.technology||criteria.status!=='all')&&<Link className="help-reset" href="/questions">Réinitialiser les filtres</Link>}
  </form>;
}
