# Lot 1 — base visuelle JokkoDev

Branche de travail : feature/frontend-design-system, créée depuis develop. Le lot a été préparé sans publication pour la revue visuelle. Cette revue est validée par l’équipe ; le commit, le push de cette branche et la PR vers develop sont explicitement autorisés. Aucune fusion n’est autorisée. Backend, package API, dépendances et verrouillage inchangés.

## Tokens et polices

La palette exacte de la charte est centralisée dans frontend/src/styles/tokens.css : night, petrol, turquoise, ink, muted, background, surface, border, success, warning, danger. Les utilitaires Tailwind v4 existants (bg-petrol, text-night, etc.) utilisent cette même palette. Les surfaces pâles sont dérivées avec color-mix ; pas de couleur prélevée dans les PNG.

Rythme principal 8 px avec détails à 4/12 px ; boutons et champs au moins 44 px, rayon boutons 8 px, cartes 12 px, badges 6 px ; ombre très discrète. Focus pétrole : 2 px, décalage 2 px. Container : largeur maximale 72 rem, marges 16 px sur mobile, 32 px à partir de 768 px. Les hauteurs de texte restent fluides, sans troncature imposée.

Inter (400/600/700), Source Serif 4 (titres éditoriaux) et JetBrains Mono (code) sont chargées par next/font/local depuis des fichiers variables locaux, sans requête à Google au build ou à l’exécution. Les notices et les blobs de provenance exacts sont conservés dans docs/licenses/fonts/. Les fichiers TTF complets totalisent environ 2,27 Mo ; une optimisation WOFF2/sous-ensemble pourra être étudiée avec les caractères requis par la communauté, en conservant les notices. Aucune police de repli n’est présentée comme le rendu final.

Les tailles et interlignes sont des tokens CSS : display fluide 32–56 px, page 28–40 px, section 22–30 px, carte 24 px, corps 16 px, petit texte 14 px et légende 12 px. Display 1,08 ; titres 1,2 ; corps 1,5. Les valeurs de mise en page non fixées par la charte sont des choix d’implémentation, pas des mesures Figma extraites des PNG.

## API des composants

Importer les primitives depuis frontend/src/components/ui/index.ts et les layouts depuis leur fichier dans components/layout/. L’API repose sur les props HTML natives et React 19, ref comprise. Les boutons sont type=button par défaut ; le submit est explicite. Le conteneur n’est pas une page métier.

| Composant | Convention |
|---|---|
| Button | variant primary/secondary/quiet ; disabled ; loading et loadingLabel ; icon ; iconOnly exige aria-label |
| ActionLink | Lien Next.js avec href réel et flèche décorative ; ne pas utiliser un bouton pour une navigation |
| TextField / TextArea / SelectField | id unique et label obligatoires ; help/error associés par aria-describedby ; required/disabled natifs ; aria-invalid en cas d’erreur |
| Card | article statique, tone default/help/project ; ne simule pas une carte cliquable |
| TechnologyBadge | Libellé de technologie, non interactif |
| StatusBadge | tone info/success/warning/error ; texte explicite et pictogramme, jamais la couleur seule |
| Message | title et contenu ; tone ; aucun rôle live automatique : le parcours choisit role=status ou role=alert si pertinent |
| Avatar | name pour les initiales, tailles sm/md/lg ; nom accessible ou decorative si un libellé adjacent le remplace |
| Spinner / LoadingIndicator | Spinner sans label décoratif ; LoadingIndicator annonce un libellé avec role=status |
| Skeleton | Décoratif, aria-hidden ; grouper les squelettes dans un élément status nommé |
| Heading | as choisit h1/h2/h3/h4 ; size choisit display/page/section/card indépendamment de la hiérarchie HTML |
| Container | Conteneur responsive partagé ; utiliser dans header, main et footer selon le parcours |
| Brand | variant horizontal/icon ; theme light/dark ; decorative quand le lien parent porte le nom JokkoDev |

```tsx
<Heading as="h1" size="page">Titre de page</Heading>
<TextField id="titre" name="title" label="Titre" required
  help="Un titre clair et précis." error={errors.title} />
<Button type="submit" loading={pending} loadingLabel="Envoi en cours…">
  Publier
</Button>
<Button iconOnly aria-label="Ajouter une technologie" icon={<Icon name="plus" />} />
<Message tone="error" title="Vérifie les champs" role="alert">
  Le contexte est obligatoire.
</Message>
```

Ce fragment illustre les props ; errors et pending appartiendront au parcours réellement connecté à l’API. Les composants ne valident pas les règles métier, n’implémentent pas CSRF/sessions et n’affirment pas un succès avant une réponse serveur. Un lien indisponible doit être repensé, pas seulement coloré comme un bouton disabled.

## Logos et icônes

Les six SVG sont les fichiers exacts du skill validé ; favicon.ico reprend également le fichier fourni. Aucun lettrage redessiné. Signature à 160 px utiles, icône à 48 px utiles avec zone libre de 5 px ; ratio d’origine conservé. Les icônes du site combinent favicon.ico dans app/ et métadonnées SVG clair/sombre. Aucun apple-icon improvisé.

Les pictogrammes de composants sont de petits SVG décoratifs ; le texte adjacent ou aria-label porte le sens. Ils ne remplacent pas les assets de marque. Le fichier brand/sources.json consigne les empreintes des originaux. La licence du code original et de la marque n’est pas changée par ce lot.

## Aperçu local

Depuis la racine : pnpm dev:frontend, puis http://localhost:3000/dev/design-system. Sur ce poste sans pnpm global :

```powershell
npm.cmd --cache .cache/npm exec --yes --package=pnpm@10.34.6 -- pnpm dev:frontend
```

Cette route n’apparaît pas dans la navigation publique et renvoie 404 en production. Aucun backend nécessaire. Les démonstrations de saisie, erreur et attente restent en mémoire locale, sans stockage ni appel API. Le message de succès est explicitement un exemple visuel. Les règles de permissions des futurs parcours ne sont pas simulées.

## Passage au lot 2 — accueil pilote

Réutiliser Container, Brand, Heading, actions et cartes ; créer ensuite la composition précise de l’accueil avec ses retours à la ligne et variantes mobile, sans recopier le catalogue comme page publique. Valider l’accueil avec Ousmane avant généralisation aux autres écrans.

Asset requis : illustration autonome approuvée de l’Afrique/réseau/logo, absente du skill. Choisir avec Serge les contrats des aperçus avant intégration ; tout contenu de démonstration futur doit rester isolé et autorisé par le lot. Ne pas inventer d’endpoints, de compteur, de statut de session ou de Teranga Points. Confidentialité et contact définitif restent différés.

## Lot D — couleurs selon le thème

Le [guide du thème et de sa recette](color-themes.md) complète ce catalogue historique. Deux modes : Clair (défaut) et Sombre, indépendants de la session et du système. La préférence seule est conservée dans localStorage. Le bouton natif en forme de pilule est placé après les actions du compte (« S’inscrire » pour un visiteur), avec nom accessible, mode visible, focus et cible prévue de 128 × 44 px. Soleil à droite en Clair, lune à gauche en Sombre : nouvelle référence fournie par Ousmane. L'option Système est retirée, y compris son suivi de préférence système.

Les valeurs de marque originales sont isolées dans `--jd-brand-*`. Les tokens `--color-*` désignent des usages sémantiques : `light-dark()` choisit selon `color-scheme`. Texte, liens, fonds, champs, états, bordures et ombres s'adaptent ensemble. Les actions utilisent `--jd-action`, `--jd-action-hover`, `--jd-on-action` et `--jd-danger-action`, distincts des liens éclaircis du thème sombre. Les surfaces dérivées se mélangent avec `--color-surface`, pas du blanc fixe.

Brand accepte `theme="auto"` par défaut, ou `light`/`dark` explicitement. Auto utilise les SVG validés sans modification ; la plaque de l'illustration raster reste blanche. Le nuancier local indique les valeurs clair / sombre. Pas d'animation globale de changement de thème ; seul le bouton anime sa pastille en 600 ms après activation, avec fondu des icônes de 400 ms, sauf en réduction des mouvements. Pas d'animation initiale à l'hydratation.

`node scripts/check-theme-contrast.mjs` vérifie les paires sémantiques ; les mesures et captures au navigateur restent distinctes. L'initialisation externe préserve le rendu statique et les politiques du lot C, sans ajout d'inline ou de nonce. La validation visuelle Clair/Sombre d'Ousmane et les limites maintenues de la vérification sont détaillées dans le guide.

La [recette visuelle complémentaire](color-themes-visual-review.md) couvre désormais les quatre largeurs, les interactions clavier et les 44 paires calculées par Chromium. Les deux échantillons de marque conservent intentionnellement leurs fonds clair et bleu nuit, avec leurs variantes explicites ; ils ne suivent pas le fond du catalogue. Les avertissements d'hydratation causés par l'injection Kaspersky dans les exemples de développement restent documentés.

## Lot E — commandes PWA et lecture autonome

Le [lot E PWA](pwa-offline-reading.md) réutilise les mêmes tokens et logos dans les deux documents de lecture autonomes. Les commandes d'installation et de mise à jour utilisent des boutons natifs, des cibles de 44 px et un dialogue à annulation initialement focalisée ; aucune animation nouvelle. Les PNG d'installation sont des exports du monogramme validé, avec une zone sûre pour le maskable. Voir la [recette aux quatre largeurs](pwa-verification.md).
