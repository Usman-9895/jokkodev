# Vérification du lot 9 — information et cohérence globale ciblée

Le 15 octobre 2026, Windows, Node 24.15.0, pnpm 10.34.6 et Chrome 155.0.8059.40. Branche `feature/frontend-information-quality`, créée après récupération des références et vérification du lot 8 fusionné dans `develop` (`b55b323`). Dossier initial propre ; distant `Usman-9895/jokkodev` conservé. Validation visuelle du lot 9 reçue ; commit, push de feature/frontend-information-quality et PR vers develop explicitement autorisés. Cette validation ne vaut pas approbation définitive des règles, de la confidentialité, des coordonnées ou des assets provisoires. Aucune fusion ni fusion automatique autorisée.

## Contrôles exécutés

| Contrôle | Résultat |
| --- | --- |
| `pnpm lint` | Réussi après correction des erreurs du nouveau script et encodage des espaces insécables JSX. |
| `pnpm --filter @jokkodev/frontend typecheck` | Réussi. |
| `node --test tests/*.test.mjs` | 26 tests réussis, zéro échec. Avertissement préexistant `MODULE_TYPELESS_PACKAGE_JSON`, sans échec. |
| `pnpm --filter @jokkodev/frontend build` | Réussi, 36 pages statiques générées et routes dynamiques. |
| `INFORMATION_REVIEW_REUSE=1 node scripts/review-information.mjs` | Réussi : captures et parcours Chrome réels, quatre largeurs, métadonnées, liens et non-régression ciblée. Aucune exception JavaScript ni requête `/api/v1` pendant cette revue. |
| `node scripts/check-information-production.mjs` | Réussi : 30 routes produit/variantes en 200, neuf aperçus et quatre variantes en 404 ; trois constats distincts d’introuvable. |
| `git diff --check` | Réussi. |
| Backend, client API généré, dépendances et lockfile | Inchangés ; aucune opération métier intégrée. |

Les 26 tests Node existants restent pertinents pour critères, pagination, liens de retour, validation, permissions de présentation et décisions isolées. Le lot ajoute des scripts de contrôle navigateur/production, pas de tests recopiant le CSS ou les paragraphes éditoriaux.

## Revue réelle

Les trois références locales 23/24/25 et leurs vues ordinateur/mobile ont été ouvertes ; notes série 04, charte et procédure visuelle lues. Les nouvelles pages `/regles`, `/contact`, `/confidentialite` et `/dev/informations` ont été capturées après chargement des polices et images : **1440 × 1000**, **768 × 1024**, **390 × 844**, **320 × 800**. Dimensions émulées, pas des appareils physiques. Captures ordinateur/mobile réellement examinées et comparées à la composition des PNG, sans prétention de mesures Figma ou de fidélité parfaite.

Corrections après observation : dispositions du footer sur mobile, bouton de contact en texte long, ponctuation des titres sans point d’interrogation isolé et comparaison public/privé en une colonne sous 360 px. Contenu éditorial adapté honnêtement à l’absence de service. Les derniers changements ont été repris dans la revue et le build.

Parcours contrôlés :

- Règles → Contact, Contact → ancre Signalement ; bouton de contact désactivé, aucun formulaire, lien email ou téléphone inventé.
- Lien d’évitement au clavier → focus du contenu principal ; focus visible et menu mobile fermé par Échap avec retour au déclencheur.
- Recherche combinée et détail/retour de questions (`q=session&status=resolved`) et projets (`q=outil&status=open`), critères conservés dans l’URL.
- Accueil → questions/projets, accès aux cinq écrans de compte et disponibilité de leurs liens.
- Navigation entre les vues tableau de bord, Mes questions, Mes projets, candidatures, demandes et profil de démonstration ; indication active et absence de débordement.
- Entrées Signaler depuis une question et un projet → route produit indisponible sans faux formulaire/envoi. Les réponses réutilisent le composant inchangé du lot 8.
- Non-régression ciblée de l’accueil, questions, projets, connexion, dashboard et modération aux quatre largeurs ; détails publics à 320 px. Pas de suite exhaustive de tous les états des lots précédents revendiquée.
- Pause de l’illustration d’accueil avec mouvements normaux, puis arrêt des animations sous réduction des mouvements. Les nouvelles transitions ne conditionnent pas l’accès au contenu.
- Tous les liens locaux récoltés dans header, footer, navigation développeur et administration des pages principales ont une destination HTTP disponible en développement ; aucun `/dev/*` dans le header/footer public.
- Contrôle complémentaire réel de textes sans espace et URL longues dans les trois compositions éditoriales aux quatre largeurs : aucun débordement de page. Surcharge DOM temporaire de démonstration, sans modification du contenu livré. Contenu visible après transition normale ; détails question/projet contrôlés à 320 px.

Deux premiers lancements Chrome dans le bac à sable n’ont pas répondu à `Page.enable` ; exécution locale normale nécessaire. Des essais de script ont ensuite exposé une attente du rendu manquante après navigation côté client et un clic sur un lien desktop masqué en viewport mobile : scripts corrigés et revue finale réussie. Ces essais ne sont pas présentés comme des contrôles réussis.

## Zoom et contrôles impossibles

Tentative du raccourci de zoom Ctrl+plus dans Chrome headless : `devicePixelRatio` reste 1 et `innerWidth` reste 762, donc aucun zoom réel confirmé. Un second essai avec préférence native de zoom Chrome à 200 % a encore observé un ratio de 1 et a échoué son assertion. **Zoom navigateur réel à 200 % non testé avec succès** ; ces essais ne sont pas assimilés aux changements de largeur ni à un pinch zoom. Refaire ce contrôle dans un navigateur interactif avant recette finale.

Lecteurs d’écran, appareils physiques, Linux et autres navigateurs non testés. Aucun audit complet d’accessibilité ou de sécurité annoncé.

## Production et statuts observés

Le script sert le dernier build sur 3100 puis arrête son seul serveur temporaire. Le frontend utilisateur sur 3000 et le backend sur 3001 sont préservés.

Les neuf `/dev/*`, dont `/dev/informations`, et variantes privées choisies renvoient **404**. Les routes produit de comptes, espace développeur, profils, administration, contributions et signalements affichent une attente sans données privées ni résultats fictifs de mutation. La confidentialité publique contient uniquement l’attente, pas le brouillon. Aucun motif de signalement privé ou acteur d’historique fictif relevé dans les réponses produit vérifiées.

| Cas | Statut réellement observé | État visuel/texte |
| --- | --- | --- |
| `/route-lot-9-inconnue` | 404 | Introuvable |
| `/questions/lot-9-inconnue` | 200 | Introuvable |
| `/projets/lot-9-inconnu` | 200 | Introuvable |

La limite des ressources dynamiques après démarrage du streaming reste visible ; ce lot ne la masque pas et ne promet pas un 404 de ressource inexistant. Impact : les consommateurs HTTP/robots peuvent recevoir 200 malgré l’état introuvable. Revoir la frontière de chargement et la résolution de la ressource avant envoi des en-têtes après intégration réelle. Références techniques et constat précédent : [rapport du lot 6](lot-6-verification.md), route `frontend/src/app/(public)/projets/[id]/page.tsx` et sa frontière de chargement, route question correspondante.

## Preuves locales et limites de livraison

Artefacts ignorés par Git : `.cache/design-system/lot-9/`.

- `rules`, `contact`, `privacy-draft`, `privacy-public` suivis de `-{1440,768,390,320}.png` : quatre pages aux quatre largeurs.
- `rules-skip-focus-390.png`, `contact-menu-focus-390.png`, `home-pause-390.png`.
- `regression-{home,questions,projets,connexion,dev-espace,dev-moderation}-320.png`.
- `checks.json`, `production-checks.json`, `routes.json` : résultats locaux ; les essais incomplets ne remplacent pas ces résultats finaux.
- `long-checks.json`, `long-{regles,contact,dev-informations}-320.png`, `rules-normal-motion-390.png`, `question-320.png`, `project-320.png` : contrôle complémentaire des contenus longs et mouvements normaux, captures réellement examinées.

Les textes de confidentialité et coordonnées restent différés ; règles à relire, signature officielle DevTeranga absente, bulles/icônes simplifiées, footer adapté. Voir le [guide](information-quality.md), l’[inventaire des routes](routes.md) et le [bilan pour Serge](integration-readiness.md). Aucun backend métier testé ; aucune session ni mutation réelle. **Application non déclarée prête à publier.**
