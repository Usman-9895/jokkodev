'use client';
export default function ErrorPage({ reset }: { reset: () => void }) { return <main id="contenu" className="p-12"><h1>Une erreur est survenue</h1><p>Veuillez réessayer.</p><button className="mt-4 underline" onClick={reset}>Réessayer</button></main>; }
