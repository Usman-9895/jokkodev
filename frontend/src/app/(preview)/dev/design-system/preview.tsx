'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Brand } from '../../../../components/layout/brand';
import { Container } from '../../../../components/layout/container';
import { ActionLink, Avatar, Button, Card, Heading, Icon, LoadingIndicator, Message, SelectField, Skeleton, StatusBadge, TechnologyBadge, TextArea, TextField } from '../../../../components/ui';
import './preview.css';

const colors = [
  ['Bleu nuit', 'night', '#03263A'], ['Bleu pétrole', 'petrol', '#006B80'],
  ['Turquoise', 'turquoise', '#009DA8'], ['Texte', 'ink', '#172B3A'],
  ['Texte secondaire', 'muted', '#526674'], ['Fond', 'background', '#F4F7F8'],
  ['Surface', 'surface', '#FFFFFF'], ['Bordure', 'border', '#D6E1E5'],
  ['Succès', 'success', '#18734B'], ['Avertissement', 'warning', '#8A5600'], ['Erreur', 'danger', '#B42318'],
] as const;

export function DesignSystemPreview() {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('Les actions ci-dessous restent locales.');
  const [invalid, setInvalid] = useState(false);

  return <>
    <header className="preview-header"><Container className="preview-header__content"><Brand /><span>Lot 1 · Composants communs</span><span className="preview-dev-label">Développement uniquement</span></Container></header>
    <main id="contenu" tabIndex={-1} className="preview-main">
      <Container>
        <p className="preview-eyebrow">JokkoDev · Base visuelle</p>
        <Heading as="h1" size="page">Les fondations de l’interface.</Heading>
        <p className="preview-intro">Un aperçu de démonstration pour relire les styles, les composants et leurs états. Aucune donnée n’est enregistrée, aucune API n’est appelée.</p>
        <nav aria-label="Sections de l’aperçu" className="preview-nav">{[['marque', 'Marque'], ['actions', 'Actions'], ['champs', 'Champs'], ['cartes', 'Cartes'], ['etats', 'États']].map(([id, title]) => <a key={id} href={`#${id}`}>{title}</a>)}</nav>

        <section id="marque" className="preview-section" aria-labelledby="marque-title">
          <div className="preview-section__heading"><Heading id="marque-title">01. Marque & typographies</Heading><span>Polices locales · SVG validés</span></div>
          <div className="preview-grid">
            <Card className="preview-type-card"><p className="preview-label">Source Serif 4 · titre éditorial</p><Heading as="h3" size="display">Connectons les talents,<br />partageons les solutions.</Heading><p className="preview-type-body">L’espace d’entraide et de collaboration des développeurs africains.</p><p className="preview-label">Inter · interface, 400 / 600 / 700</p><p>Des textes lisibles, une <strong>hiérarchie claire</strong> et des actions faciles à repérer.</p><p className="preview-label">JetBrains Mono · code</p><pre className="preview-code"><code>{'const communaute = "JokkoDev";\n// Exemple typographique uniquement'}</code></pre></Card>
            <div className="preview-stack">
              <Card><p className="preview-label">Sur fond clair</p><div className="preview-logos"><Brand /><Brand variant="icon" /><Image src="/brand/jokkodev-favicon.svg" alt="Favicon JokkoDev sur fond clair" width={32} height={32} /></div><p className="preview-caption">Signature 160 px · monogramme 48 px · favicon 32 px. Zone libre préservée.</p></Card>
              <Card className="preview-dark"><p className="preview-label">Sur fond bleu nuit</p><div className="preview-logos"><Brand theme="dark" /><Brand variant="icon" theme="dark" /><Image src="/brand/jokkodev-favicon-fond-sombre.svg" alt="Favicon JokkoDev sur fond sombre" width={32} height={32} /></div><p className="preview-caption">Variantes originales, sans recoloration ni modification du lettrage.</p></Card>
            </div>
          </div>
          <div className="preview-palette">{colors.map(([label, token, value]) => <div key={token} className="preview-swatch"><span style={{ background: `var(--color-${token})` }} /><div><strong>{label}</strong><code>{value}</code></div></div>)}</div>
        </section>

        <section id="actions" className="preview-section" aria-labelledby="actions-title">
          <div className="preview-section__heading"><Heading id="actions-title">02. Actions</Heading><span>44 px minimum · rayon 8 px</span></div>
          <Card>
            <div className="preview-row"><Button onClick={() => setFeedback('Démonstration : clic sur le bouton principal, sans publication.')} icon={<Icon name="plus" />}>Poser une question — démo</Button><Button variant="secondary" onClick={() => setFeedback('Démonstration : clic sur le bouton secondaire, sans navigation métier.')}>Explorer les projets — démo</Button><Button variant="quiet" onClick={() => setFeedback('Démonstration : action discrète locale.')}>Action discrète</Button><Button iconOnly aria-label="Ajouter un exemple local" icon={<Icon name="plus" />} onClick={() => setFeedback('Démonstration : bouton à icône nommé, sans ajout de donnée.')} /></div>
            <div className="preview-row preview-row--spaced"><Button disabled>Action indisponible</Button><Button variant="secondary" disabled>Secondaire désactivé</Button><Button loading loadingLabel="Chargement de démonstration…">Charger</Button><ActionLink href="#champs">Voir les champs</ActionLink></div>
            <div className="preview-row preview-row--spaced"><Button loading={loading} loadingLabel="Attente locale…" onClick={() => setLoading(true)}>Activer l’état chargement</Button><Button variant="quiet" onClick={() => setLoading(false)} disabled={!loading}>Terminer la démonstration</Button></div>
            <p className="preview-feedback" role="status">{feedback}</p>
            <p className="preview-caption">Tabulation : contour pétrole de 2 px, décalé de 2 px. Les boutons désactivés sont ignorés par le clavier.</p>
          </Card>
        </section>

        <section id="champs" className="preview-section" aria-labelledby="champs-title">
          <div className="preview-section__heading"><Heading id="champs-title">03. Saisie & validation</Heading><span>Labels permanents · éléments natifs</span></div>
          <div className="preview-grid">
            <Card><Heading as="h3" size="card">Saisie de démonstration</Heading><p className="preview-caption">Ce formulaire n’envoie ni ne conserve de données.</p><form className="preview-form" onSubmit={event => { event.preventDefault(); setFeedback('Démonstration de saisie terminée : aucune donnée envoyée.'); }}>
              <TextField id="demo-title" name="title" label="Titre de démonstration" required help="Un titre clair permet de comprendre la question." placeholder="Exemple : comprendre un composant React" />
              <SelectField id="demo-technology" name="technology" label="Technologie de démonstration" help="Sélecteur simple ; pas de sélection métier multiple." defaultValue=""><option value="">Choisir une technologie</option><option value="react">React</option><option value="typescript">TypeScript</option><option value="next">Next.js</option></SelectField>
              <TextArea id="demo-context" name="context" label="Contexte de démonstration" help="Présente le contexte sans données confidentielles." placeholder="Décris ici un exemple, sans identifiants ni secrets." />
              <Button type="submit">Tester la saisie localement</Button>
            </form></Card>
            <Card><Heading as="h3" size="card">États du champ</Heading><div className="preview-form">
              <TextField id="demo-invalid" label="Titre avec erreur illustrée" required error={invalid ? 'Le titre est obligatoire.' : undefined} help="Le bouton ci-dessous affiche ou retire une erreur locale." />
              <Button variant="secondary" onClick={() => setInvalid(!invalid)} aria-pressed={invalid}>{invalid ? 'Retirer l’erreur de démonstration' : 'Afficher une erreur de démonstration'}</Button>
              <SelectField id="demo-select-error" label="Sélecteur avec erreur illustrée" defaultValue="" required error="Choisis une technologie (exemple d’erreur)."><option value="">Choisir une technologie</option><option value="typescript">TypeScript</option></SelectField>
              <TextArea id="demo-area-error" label="Zone de texte avec erreur illustrée" error="Précise le contexte (exemple d’erreur)." rows={3} />
              <TextField id="demo-disabled" label="Champ désactivé" disabled defaultValue="Démonstration non modifiable" help="L’indisponibilité est indiquée explicitement." />
              <SelectField id="demo-select-disabled" label="Sélecteur désactivé" disabled><option>Indisponible — démonstration</option></SelectField>
            </div></Card>
          </div>
        </section>

        <section id="cartes" className="preview-section" aria-labelledby="cartes-title">
          <div className="preview-section__heading"><Heading id="cartes-title">04. Cartes & informations</Heading><span>Rayon 12 px · surfaces dérivées</span></div>
          <div className="preview-grid">
            <Card tone="help" className="preview-feature"><span className="preview-feature__icon"><Icon name="code" /></span><div><Heading as="h3" size="card">JokkoHelp</Heading><p className="preview-feature__subtitle">Débloque ton problème technique</p><p className="preview-caption">Exemple de composant : questions, réponses et entraide.</p><ActionLink href="#actions">Voir les actions de démonstration</ActionLink></div></Card>
            <Card tone="project" className="preview-feature"><span className="preview-feature__icon"><Icon name="users" /></span><div><Heading as="h3" size="card">JokkoProjects</Heading><p className="preview-feature__subtitle">Construis avec d’autres développeurs</p><p className="preview-caption">Exemple de composant : collaboration autour des projets.</p><ActionLink href="#actions">Voir les actions de démonstration</ActionLink></div></Card>
          </div>
          <Card className="preview-content-card"><div><p className="preview-label">Carte de contenu · exemple statique</p><h3 className="preview-content-title">Comprendre un composant React et ses mises à jour</h3><p className="preview-caption">Texte de démonstration pour vérifier une carte, son titre et les badges associés.</p><div className="preview-row"><TechnologyBadge>React</TechnologyBadge><TechnologyBadge>TypeScript</TechnologyBadge><TechnologyBadge>Accessibilité</TechnologyBadge></div></div><StatusBadge tone="success">Résolue — exemple</StatusBadge></Card>
          <div className="preview-row preview-row--spaced"><StatusBadge tone="info">En attente — exemple</StatusBadge><StatusBadge tone="success">Acceptée — exemple</StatusBadge><StatusBadge tone="warning">Non résolue — exemple</StatusBadge><StatusBadge tone="error">Refusée — exemple</StatusBadge><Avatar name="Awa Diop" size="sm" /><Avatar name="Moussa Ndiaye" /><Avatar name="Fatou Fall" size="lg" /></div>
        </section>

        <section id="etats" className="preview-section" aria-labelledby="etats-title">
          <div className="preview-section__heading"><Heading id="etats-title">05. Messages & chargement</Heading><span>Texte et pictogramme · mouvement réduit</span></div>
          <div className="preview-grid">
            <div className="preview-stack"><Message title="Information — démonstration">Cette page présente des composants, sans fonctionnalité métier.</Message><Message tone="success" title="Succès — exemple visuel">Ce message illustre une apparence, pas un enregistrement réussi.</Message><Message tone="warning" title="Attention — démonstration">Vérifie les champs indiqués avant de poursuivre.</Message><Message tone="error" title="Erreur — démonstration">Le message explique le problème sans exposer de détail technique.</Message></div>
            <Card><Heading as="h3" size="card">Attente & squelette</Heading><div className="preview-form"><LoadingIndicator label="Chargement de démonstration…" /><div className="preview-skeleton" role="status" aria-label="Aperçu de contenu en chargement"><Skeleton style={{ width: '65%', height: 24 }} /><Skeleton /><Skeleton style={{ width: '85%' }} /><div className="preview-row"><Skeleton style={{ width: 64, height: 24 }} /><Skeleton style={{ width: 88, height: 24 }} /></div><span className="sr-only">Contenu de démonstration en chargement.</span></div><p className="preview-caption">Les animations respectent la préférence de mouvement réduit. Le squelette ne présente aucun faux compteur.</p></div></Card>
          </div>
        </section>
        <footer className="preview-footer">Aperçu interne · aucune authentification · aucune publication · prochain lot : accueil pilote.</footer>
      </Container>
    </main>
  </>;
}
