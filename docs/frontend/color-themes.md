# Lot D — thèmes clair et sombre

Complément du 3 novembre 2026 : la [recette visuelle au navigateur](color-themes-visual-review.md) a désormais été exécutée avec Playwright/Chromium déjà installés. Elle remplace les limites initiales ci-dessous pour les captures et interactions effectivement couvertes, en conservant les incidents et les réserves sur les aperçus de développement et l'absence de session réelle.

Travail sur `feature/frontend-color-themes`, dans `.cache/color-themes/worktree`, depuis `origin/develop` vérifié à `34866fafc22bdda8405eb588cdf12d71435d8bf3` (fusion #37). Ousmane a validé visuellement la version Clair/Sombre et autorisé sa publication par commit, push et PR normale vers develop. Aucun accès VPS, changement backend, migration, contrat, dépendance, fusion ou déploiement. Les autres worktrees sont préservés.

## Préférence et initialisation

Deux valeurs : Clair (`light`, défaut) et Sombre (`dark`). L'option Système initialement demandée a été retirée à la demande d'Ousmane. Une ancienne valeur `system`, une valeur inconnue ou l'absence de valeur signifie Clair ; les choix explicites light/dark restent respectés. La seule clé écrite est `localStorage['jokkodev.theme']`. Aucun identifiant, session ou contenu d'API n'est stocké par cette fonctionnalité. Le choix appartient au navigateur, indépendamment du compte.

`frontend/public/theme-init.js` est un fichier classique externe, synchrone, de même origine, placé dans le `head` avant le corps. Il lit la préférence, puis pose uniquement `data-theme="light|dark"` sur `html`. Il ne consulte plus la préférence système. Pas de cookie, lecture serveur, middleware ou HTML personnalisé. Le même document reste pré-rendu et mis en cache.

Le refus du stockage ou son quota n'empêchent pas le choix en mémoire ; la persistance n'est alors pas disponible au prochain chargement complet. Les changements de préférence du système n'affectent plus le thème. Les événements `storage` synchronisent la préférence entre onglets ; les autres clés sont ignorées. Le contrôleur `window.JokkoDevTheme` ne gère que cette préférence, sans rafraîchir session ou route.

Le sélecteur utilise `useSyncExternalStore`, avec un snapshot serveur constant également utilisé pendant l'hydratation. `suppressHydrationWarning` est limité à `html`, dont le seul attribut de thème est volontairement résolu avant React ; il ne couvre pas le contenu des pages. Sans JavaScript ou si le fichier ne charge pas, CSS reste clair et le contrôle reste désactivé. Les fonctions CSS `light-dark()` et `color-scheme` nécessitent un navigateur compatible ; les navigateurs anciens ne sont pas validés.

## CSP et cache

Les deux politiques du lot C sont inchangées. L'initialisation externe est autorisée par `script-src 'self'` de la politique Report-Only. Aucun script d'initialisation inline ni `unsafe-inline` bloquant n'est ajouté. Les signalements inline Next existants restent attendus, sans blocage des pages par la politique complète.

Le fichier supplémentaire est volontairement bloquant pour résoudre le choix avant l'affichage du contenu ; aucune mesure terrain de ce coût n'est revendiquée. Son nom stable conserve la revalidation standard des fichiers publics Next, sans cache immuable ajouté. Pas de rendu dynamique global.

Un futur durcissement devra traiter séparément les scripts Next et ce fichier externe, notamment si `'self'` est remplacé par des nonces/`strict-dynamic`. Ne pas introduire dans ce lot une transformation globale des pages statiques pour ce besoin futur.

## Design et accessibilité

La palette de marque reste fixe dans `--jd-brand-*`. Les tokens sémantiques texte, fond, surface, lien, bordure et états utilisent `light-dark()`. Les actions gardent un fond pétrole et un texte blanc : ne pas employer comme fond la teinte éclaircie des liens sombres. Les fonds dérivés se mélangent avec la surface courante ; les ombres s'adaptent aussi.

Panneaux, code, pagination, formulaires, états et dialogues partagent ces tokens. Brand sélectionne par CSS les variantes SVG validées ; aucun tracé ni ratio n'est modifié. La plaque blanche de l'illustration raster approuvée est conservée intentionnellement, sans inversion ni recoloration. Les photos, avatars, points et contacts conservent leurs composants et règles existants.

Le contrôle est un bouton natif en forme de pilule, inspiré de la référence fournie ensuite par Ousmane : Clair avec soleil sur pastille blanche à droite, Sombre avec lune sur pastille blanche à gauche. Les teintes restent issues de la charte. Le nom accessible annonce le mode courant et l'action suivante ; Entrée/Espace activent le bouton natif. Cible prévue 128 × 44 px, focus natif visible. Après activation par l'utilisateur, la pastille et le libellé glissent en 600 ms, avec fondu des icônes de 400 ms ; aucune animation à la restauration du thème pendant l'hydratation. Ces transitions limitées sont désactivées avec `prefers-reduced-motion`, sans animation globale des pages. Il suit les actions du compte, donc « S’inscrire » pour un visiteur, dans le même panneau sur ordinateur et mobile. Le bouton de menu reste avant son panneau dans le DOM, avec les mécanismes existants d'Échap/retour du focus. La pause de l'illustration est conservée.

Aucune maquette sombre distincte fournie : la déclinaison sombre est construite à partir de la charte et validée visuellement par Ousmane. Références réellement ouvertes : Accueil 01 et Profil public 13, ordinateur/mobile, et instructions/charte/procédure du skill.

## Contrôles réellement exécutés

- Installation pnpm 10.34.6 figée : 467 paquets, verrou inchangé. Essai hors ligne incomplet (Next absent du cache), puis installation normale réussie sans changement de version.
- Génération Prisma 7.10.1 avec URL fictive inaccessible pour vérifier le workspace ; aucune migration ni connexion à une base.
- Lint et TypeScript du workspace réussis ; builds backend/client/frontend réussis et build frontend relancé après les dernières modifications visibles.
- 16 tests backend réussis. Suite Node finale : 123 tests, 122 réussis, un ignoré pour création de symlink indisponible sous Windows ; aucun échec.
- Neuf nouveaux tests : première visite claire, persistance et priorité explicite, ancienne préférence Système rejetée, refus/quota du stockage, valeurs invalides, synchronisation, luminance et seuils de contraste.
- `node scripts/check-theme-contrast.mjs` : 44 paires issues des tokens et de leurs mélanges sRGB, dont le bouton clair/sombre, zéro échec. Minimum des paires de texte 5,223:1 (seuil 4,5:1) ; paires de contrôle testées au-dessus de 3:1. Les bordures décoratives ne sont pas annoncées comme limites de contrôle contrastées. Les contrôles inactifs doivent encore être examinés au rendu.
- `node scripts/check-color-themes-http.mjs` : procédure reproductible strictement limitée à l'adresse locale. Résultat de son exécution finale consigné dans les preuves locales : en-têtes, fichier avant le corps, cache HIT malgré cookie fictif, UUID et aperçus privés 404.

Le contraste calculé porte sur les déclarations, pas sur des valeurs extraites d'un navigateur. Les tests de stockage et de l'indépendance vis-à-vis du système utilisent un environnement simulé ; ce ne sont pas des validations navigateur. Le premier appel de commande pnpm imbriquée a échoué faute de PATH, avant génération ; le PATH a été corrigé et les contrôles repris. Les incidents ne sont pas réécrits comme des succès initiaux.

## Aperçu et recette visuelle

Production locale avec les en-têtes du lot C : `http://127.0.0.1:3470/`. Routes utiles : `/ressources` (statique), `/connexion`, `/inscription`, `/regles`, `/confidentialite`, `/contact`, `/theme-missing-page` (404), `/espace` et `/admin/signalements` (protections réelles, sans compte connecté).

Aperçus historiques explicitement fictifs sur `http://127.0.0.1:3471` : `/dev/design-system`, `/dev/comptes?view=profile`, `/dev/comptes?view=edit`, `/dev/jokkohelp-contributions?view=detail`, `/dev/jokkoprojects?view=detail`, `/dev/espace`, `/dev/moderation`. Ils ne prouvent aucune authentification, permission ou mutation métier et restent en 404 en production.

Docker est indisponible. Aucun compte ni base créé ; l'API locale 3472 utilise une destination de base et de SMTP injoignable, sans accès à une base d'équipe. Les vues produit dépendant de données affichent leur indisponibilité réelle, sans repli fictif. Ne pas saisir de compte réel dans cette recette.

Plan initial de recette en clair et sombre, aux largeurs 1440, 768, 390 et 320 px : première visite, deux modes/rechargement, absence de réaction au système, ancienne valeur system, stockage refusé, flash/hydratation/console, politiques CSP, clavier/focus, menu mobile, confirmations/Échap, pause/mouvement réduit, contenus longs et débordements. Les résultats effectivement obtenus et les éléments non couverts sont détaillés dans le [complément navigateur](color-themes-visual-review.md).

Lors du premier passage, le connecteur a renvoyé `The browser access host is unavailable` et l'accès à une fenêtre native a expiré (`Computer Use app approval timed out`). Ce passage ne fournissait aucune capture. Le complément ultérieur a utilisé Playwright/Chromium déjà installés pour obtenir 120 vues principales et vérifier les interactions, avec les réserves d'hydratation documentées.

## Processus, preuves et limites

Les seuls PID créés et les ports figurent dans `.cache/color-themes/processes.json`. Logs/preuves sous `.cache/color-themes/verification/`, hors fichiers versionnables. Les deux frontends sont redémarrés après le build final ; aucun service existant n'est arrêté.

Les captures et la recette visuelle locale ont été réalisées puis validées par Ousmane. Restent à vérifier : parcours authentifiés sur une base dédiée disponible, hydratation des exemples de développement dans un navigateur sans injection Kaspersky, autres navigateurs et conditions réseau. Aucun résultat PostgreSQL, CI distante, Linux, HTTPS cible, appareil physique, lecteur d'écran ou zoom réel à 200 % n'est revendiqué. La publication pour revue est autorisée ; aucun déploiement.

Sources : [MDN light-dark()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/light-dark), [MDN color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/color-scheme), [React useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore). Les décisions du lot C restent la référence de sécurité.
