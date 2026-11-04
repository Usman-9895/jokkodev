# Lot E — vérification locale du 4 novembre 2026

État : recette locale fonctionnelle et visuelle validée par Ousmane, publication en PR autorisée ensuite. Base exacte `81d5e54370dc03bcf87a392c115c67855dfd0171` retrouvée dans origin/develop avant création de `feature/pwa-offline-reading`. Worktree isolé `D:\DEV\JokkoDev\.cache\pwa\worktree`. Aucun accès au VPS, fusion ou déploiement. Les résultats ci-dessous ne sont pas une validation CI distante. Les empreintes des sources de recette correspondent au code publié ; seuls les textes de statut sont actualisés lors de la publication.

## Environnement et preuves

Windows, Node 24.15.0, pnpm 10.34.6, Next 16.4.2. Build de production local servi sur **http://127.0.0.1:3488/ressources** avec les politiques du lot C. Développement sur **http://127.0.0.1:3489/dev/design-system**, worker en 404. Aucun backend métier ni compte réel ; origine API volontairement inaccessible `127.0.0.1:1`. Aucune base ni migration utilisée.

Playwright-core et Chromium 148.0.7778.96 déjà installés, contextes jetables. Le contrôle d'installabilité utilise un profil persistant dédié au lot, jamais un profil utilisateur. Scripts, captures, résultats JSON, logs et empreintes locaux dans `D:\DEV\JokkoDev\.cache\pwa\verification\` et `.cache\pwa\`. La galerie `verification/index.html` rapproche les captures Clair/Sombre. Ces artefacts de cache ne sont pas ajoutés aux fichiers versionnables. Les tests durables sont `tests/pwa-server.test.mjs` et `tests/pwa-worker.test.mjs`.

## Contrôles exécutés

| Contrôle | Résultat et portée |
| --- | --- |
| `pnpm install --frozen-lockfile` | Réussi, 467 paquets ; verrou inchangé, aucune dépendance ajoutée. |
| `pnpm db:generate` | Prisma 7.10.1 généré avec une URL fictive loopback, sans connexion à une base. |
| `pnpm lint`, `pnpm typecheck` | Réussis. Lint rejoué après les derniers changements JS/tests. |
| `pnpm build` | Réussi pour les trois workspaces. `/hors-connexion`, `/lecture-hors-connexion/ressources` et les pages statiques antérieures restent statiques. Les dernières corrections du worker/CSS public sont servies directement et ont ensuite été éprouvées au navigateur de production local. |
| `pnpm test` final | 16 tests backend réussis ; 138 tests Node, 137 réussis, zéro échec, un saut : création de lien symbolique indisponible pour ce compte Windows. Les avertissements MODULE_TYPELESS_PACKAGE_JSON restent visibles. |
| Dont tests PWA | 15 réussis : routage, retrait, requêtes exclues, cookies/no-store/RSC, limites de taille, borne exacte 24 h, renouvellement, concurrence et nettoyage ciblé. |
| `pnpm test:smoke` | Réussi : accès API direct et via relais, pages principales, cookies, CSRF, session absente, Swagger/aperçus fermés. Ports dédiés 3494/3495, DB/SMTP loopback inaccessibles ; readiness 503 attendu. Processus smoke arrêtés. Ce n'est pas un smoke avec PostgreSQL opérationnel. |
| `browser-review.cjs` | 50 assertions réussies, zéro incident final, zéro erreur pageerror sur la page suivie. Coupure réseau déterministe par proxy local 3490, version A/B sur 3491 ; deux proxies arrêtés ensuite. |
| `extra-review.cjs` | 29 assertions réussies, zéro erreur JS/console relevée : clavier, réduction des mouvements, dialogues aux quatre largeurs et dans les deux thèmes, menu mobile, persistance des thèmes après rechargement, stockage indisponible, IDs et CSP. Le worker en attente de ce complément est simulé ; le cycle réel A/B est testé par le script principal. |
| Installabilité CDP | Manifeste sans erreur, critères Chromium sans erreur dans le profil persistant dédié. Aucune installation OS effectivement déclenchée. |

Les contrôles existants du socle sont rejoués sans accès aux données d'équipe. Pas de génération OpenAPI, migration ou intégration PostgreSQL nécessaire : backend, schéma et contrat inchangés. Les vérifications de connexion réelle, candidature et administration authentifiée ne sont pas revendiquées.

## Matrice navigateur

| Scénario | Observation réellement obtenue |
| --- | --- |
| Première visite en ligne | Activation du worker, 13 entrées publiques et une entrée de version ; environ 2,17 Mo de payload, sous la limite de 8 Mio. |
| Première lecture hors ligne et nouvel onglet | Les trois guides sont rendus, y compris dans un nouvel onglet après renouvellement. Pas de React, script inline ou donnée de session dans le document autonome. |
| Parcours non disponible | `/questions` reçoit une explication sans question archivée. `/connexion` n'est pas interceptée et échoue au réseau. Les URL à paramètres et demandes RSC échouent plutôt que de recevoir du HTML de lecture. |
| Confidentialité | Une navigation `/espace` anonyme avec cookie sentinelle fictif, puis son retrait, n'ajoute aucune entrée. Inventaire sans API, `_next`, Set-Cookie ou identifiant de requête serveur. Cette sentinelle n'est pas une connexion/déconnexion authentifiée réelle. |
| Expiration | Cache de fixture vieilli à 24 h : réponse 503 honnête ; au retour du réseau, renouvellement puis nouveau lancement hors ligne 200. Les tests unitaires contrôlent juste avant et à la borne exacte. |
| Mise à jour | Version B en attente sans rechargement ni perte de saisie. Dialogue focalisé sur Continuer ma saisie, Échap conserve le formulaire. Acceptation recharge uniquement l'onglet demandeur ; un autre onglet garde son état. Cache A retiré. |
| Installation | Interface proposée seulement sur événement beforeinstallprompt ; refus mémorisé après rechargement. Cet événement est synthétique pour la recette d'interface, sans prétendre démontrer une installation native. |
| Stockage refusé | Choix Sombre encore utilisable ; refus d'installation conservé en mémoire, sans exception d'interface. |
| Clavier et mouvement | Lien d'évitement et thème accessibles par Tab/Entrée. Focus initial sûr dans les dialogues, annulation au clavier ; aucune animation PWA ajoutée, préférence reduced-motion vérifiée. Lecteur d'écran réel non testé. |
| En-têtes/cache | CSP bloquante limitée inchangée, politique complète toujours Report-Only ; ressources statiques HIT, identifiants renouvelés en ligne. Réponses de lecture hors ligne no-store sans faux identifiant serveur. Pas d'erreur d'hydratation relevée dans les contextes Chromium propres utilisés. |
| Désactivation opérationnelle | Worker de retrait réellement activé : désinscription, suppression du seul préfixe du lot, cache témoin d'une autre application conservé. Aucun rechargement forcé. |

Clair et Sombre examinés à **1440, 768, 390 et 320 px** : guides, logos, proposition d'installation, bannière de mise à jour et dialogue. Aucune largeur de document supérieure à celle du viewport ; dialogues dans le viewport et sans débordement interne. Texte et actions lisibles, cibles de contrôle au moins 44 px. Les variantes de logo restent les SVG validés, les icônes des exports du monogramme existant. Texte du dialogue calculé : clair `rgb(23,43,58)` sur blanc ; sombre `rgb(220,233,238)` sur `rgb(16,43,59)`. Les tokens de contraste existants ne sont pas remplacés. Pas de promesse de fidélité pixel parfaite ni d'audit WCAG complet.

## Incidents conservés et corrections

- Installation initialement refusée par le filtre Vary RSC ajouté par Next aux handlers statiques : exception limitée aux deux documents HTML anonymes explicitement marqués, jamais aux réponses RSC. Test de refus RSC maintenu.
- Fixture de test : remplacement de version interceptant aussi le commentaire global ; correction du remplacement de placeholder, sans détendre le test produit.
- Émulation offline Chromium seule insuffisante : utilisation complémentaire d'un proxy qui ferme le réseau. Aucun succès attribué à l'émulation initiale trompeuse.
- Lecture pendant renouvellement susceptible d'observer une copie incomplète : écriture du marqueur en dernier et attente du renouvellement, avec test concurrent borné. Lecture finale dans un nouvel onglet confirmée.
- Le retrait est asynchrone : la disparition de l'enregistrement précède parfois la fin du nettoyage ; le harnais attend désormais les deux effets séparément.
- Une assertion de titre contenait des accents transformés en points d'interrogation, alors que la réponse était déjà 200 avec le bon titre ; assertion corrigée et recette entièrement rejouée. Une réponse 502 de fixture au démarrage a conduit à ajouter une attente bornée de readiness.
- Une première exécution smoke a été refusée par l'approbation automatique faute de destination suffisamment explicite. Rejeu autorisé avec destinations DB/SMTP loopback fictives explicites ; aucune base réelle utilisée.

Les sorties intermédiaires demeurent dans le cache local ; elles ne sont pas réécrites comme des réussites.

## Limites et suite

Pas d'essai sur iOS, Android ou appareil physique ; pas de lancement d'une application effectivement installée par l'OS. Pas d'authentification réelle ni de bascule de compte réelle dans cette recette, seulement exclusion des routes et sentinelle de confidentialité. Pas de nginx/HTTPS cible, HSTS public ou VPS vérifié dans ce lot local ; les contrôles HTTPS d'exploitation restent à faire avant déploiement. La CI distante n'a pas été déclenchée.

Un navigateur peut effacer sa copie ou refuser le stockage. Les contenus publics modifiés restent dans une copie pendant au plus 24 heures d'utilisation normale ; questions/projets et contenus modérés ne sont jamais archivés par ce lot. Un appareil totalement hors ligne ne peut recevoir immédiatement une nouvelle version ou un retrait. Voir le [guide de désactivation et d'exploitation](pwa-offline-reading.md) avant toute future activation.
