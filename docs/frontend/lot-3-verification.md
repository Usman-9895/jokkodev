# Vérifications du lot 3 — JokkoHelp en consultation

Exécutées le 14 octobre 2026 sous Windows, Node 24.15.0, pnpm 10.34.6 et Chrome 155.0.8059.40. Branche `feature/frontend-jokkohelp-read`, depuis `develop` à `2eae2e5` ; fusion du lot 2 vérifiée dans les références récupérées. Rapport établi avant publication. La revue visuelle a ensuite été validée et le commit, le push de la branche et une PR vers `develop` autorisés ; aucune fusion autorisée.

## Contrôles exécutés

| Contrôle | Résultat |
|---|---|
| `pnpm exec eslint frontend tests/jokkohelp-read.test.mjs scripts/review-jokkohelp.mjs` | Réussi, aucune erreur |
| `pnpm --filter @jokkodev/frontend typecheck` | Réussi, génération des routes puis TypeScript |
| `node --test tests/*.test.mjs` | 6 tests réussis : 3 transport existants et 3 consultation/navigation |
| `pnpm --filter @jokkodev/frontend build` | Réussi, liste et détail rendus côté serveur |
| `JOKKOHELP_REVIEW_REUSE=1 node scripts/review-jokkohelp.mjs` | Réussi dans Chrome isolé, captures et assertions DOM/interaction |
| HTTP sur le build de production, serveur temporaire 3100 | `/questions` et `/questions/demo-session-nestjs` : 200 ; `/dev/jokkohelp` : 404 |
| `git diff --check` | Réussi |
| Exclusions Git | `.env.local`, `.next` et captures `.cache/` ignorés |

Les tests Node émettent un avertissement `MODULE_TYPELESS_PACKAGE_JSON` lors de la lecture directe des modules TypeScript par Node 24. Les six tests passent ; aucune modification du mode de modules du frontend n’a été faite uniquement pour masquer cet avertissement. Aucun test backend relancé : backend et contrat inchangés.

Avant publication, la revue finale a retiré une répétition strictement identique de la règle responsive tablette, sans changer ses valeurs ni le rendu. Lint frontend, TypeScript, les six tests Node et le build ont été relancés avec succès après ce nettoyage. Les captures et la revue navigateur précédentes sont conservées, puisqu’aucune valeur de style ni interaction n’a changé. Les mentions documentaires ont été actualisées pour consigner l’autorisation de publication.

Avant publication, la revue finale a retiré une répétition strictement identique de la règle responsive tablette, sans changer ses valeurs ni le rendu. Lint frontend, TypeScript, les six tests Node et le build ont été relancés avec succès après ce nettoyage. Les captures et la revue navigateur précédentes sont conservées, puisqu’aucune valeur de style ni interaction n’a changé. Les mentions documentaires ont été actualisées pour consigner l’autorisation de publication.

## Revue navigateur et captures examinées

Le harnais ouvre un profil Chrome distinct et utilise **http://localhost:3000**, l’origine attendue par Next.js en développement. L’origine `127.0.0.1` bloquait la connexion HMR et empêchait l’hydratation ; la revue a été corrigée vers localhost, sans assouplir `allowedDevOrigins`. La copie est réellement effectuée et son contenu relu après réussite ; les fins de ligne Windows CRLF sont normalisées pour la comparaison.

| Largeur × hauteur CSS | Pages |
|---|---|
| 1440 × 1000 | Liste et détail |
| 768 × 1024 | Liste et détail |
| 390 × 844 | Liste et détail |
| 320 × 800 | Liste et détail |

Captures de pages complètes, polices locales et images chargées avant capture. Inter, Source Serif 4 et JetBrains Mono vérifiées dans le navigateur. Captures effectivement ouvertes et examinées : les deux pages aux quatre largeurs, ainsi que recherche combinée, sans résultat, sans réponse, chargement, vide, erreur, contenu introuvable, focus et contenus longs. La colonne de conseils trop étroite à 768 px a été supprimée sur tablette ; les captures finales ont été régénérées après cette correction. Les conseils restent visibles sur ordinateur.

Les artefacts sont **locaux et ignorés**, dans `.cache/design-system/lot-3/` :

- `list-{1440,768,390,320}.png` et `detail-{1440,768,390,320}.png`.
- `combined-search-390.png`, `no-results-390.png`, `no-answers-390.png`.
- `empty-{1440,390}.png`, `loading-{1440,390}.png`, `error-{1440,390}.png`, `not-found-{1440,390}.png`.
- `detail-loading-390.png`, `detail-error-390.png`, `long-content-320.png`, `search-focus-390.png`, `reflow-200.png`.
- `checks.json` : navigateur, dimensions, polices et assertions de revue.

Assertions réelles : recherche sans accents, combinaison NestJS/résolues, page remise à 1, réinitialisation, page 2 et clamp de page 999, valeurs invalides ignorées, accès direct et retour avec critères conservés, lien de l’accueil vers `demo-jwt`, solution acceptée unique et absence de boutons métier trompeurs, question sans réponse, détail introuvable, réessai des exemples locaux, labels, focus visible de 2 px, ouverture clavier du menu, fermeture Échap et retour au déclencheur. Contenu HTML affiché comme texte, débordement horizontal limité au code ; pas de débordement de page aux quatre largeurs. Aucune exception JavaScript captée et aucun appel à une API métier inventée.

Mouvement réduit émulé pour les captures et interactions ; les styles communs restent applicables, sans nouvelle animation d’entrée de liste à chaque recherche. Contenu serveur vérifié avec JavaScript désactivé sur une recherche. Reflow à 720 × 500, facteur de pixels 2 : contrôle complémentaire de largeur, **pas une mesure du zoom typographique réel à 200 %**.

## Limites et différences

Toutes les lectures concernent neuf questions fictives. Pas d’intégration avec une API JokkoHelp réelle ; latence, erreurs réseau et boundaries de récupération réelles restent à vérifier lors de sa disponibilité. Les états de chargement/vide/erreur sont injectés explicitement dans l’aperçu de développement ; le réessai y relit le jeu local.

Initiales, compteurs, dates et statuts cohérents remplacent les photos et valeurs des maquettes. La vue publique remplace la variante d’auteur connecté : aucun utilisateur, éditeur ou droit d’acceptation simulé. Labels permanents, bouton Rechercher et cibles tactiles de 44 px rendent les pages plus hautes que les PNG. Carte réutilisée Natural Earth, légende en Source Serif italique et icônes d’état simplifiées ; pas de coloration syntaxique du code. Signature DevTeranga toujours provisoire. Aucune nouvelle dépendance ni licence ajoutée.

Appareils physiques, lecteurs d’écran, autres navigateurs et Linux non testés. Aucune conformité exhaustive d’accessibilité ou fidélité au pixel près annoncée. Références examinées : maquettes 02/03, états 26/27/32 et notes correspondantes du skill.

Le navigateur de revue et le serveur de production temporaire sont arrêtés. Le serveur frontend de développement reste volontairement disponible sur **http://localhost:3000** pour la validation visuelle. Il a été redémarré pendant le diagnostic. Backend non démarré par ce lot.

Pour reproduire : `pnpm dev:frontend`, puis définir `JOKKOHELP_REVIEW_REUSE=1` dans le shell et lancer `node scripts/review-jokkohelp.mjs`. Sans serveur actif, lancer directement le script avec ports 3000 et 9223 libres : il démarre et arrête ses propres processus. `CHROME_PATH` permet de préciser un Chrome/Chromium déjà installé ; `JOKKOHELP_REVIEW_PORT` choisit le port frontend. Ne pas partager le profil navigateur ou les artefacts privés.
