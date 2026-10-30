# Recette locale SEO et 404 — 30 octobre 2026

## Résultats

- Installation figée : 467 paquets, verrouillage inchangé.
- Génération Prisma sans base réelle, build backend et client partagé réussis.
- Lint frontend/tests SEO, TypeScript frontend et build Next réussis.
- Tests backend : 16 réussis. Suite Node frontend/client/outillage : 109 cas, 108 réussis et 1 ignoré (création de lien symbolique indisponible sous Windows). Les tests ajoutés couvrent métadonnées, identité WebSite, pagination réelle du sitemap et refus des résultats incomplets/indisponibles.
- Smoke sans base disponible : pages, 404 inconnue, neuf aperçus 404, robots, sitemap 503 contrôlé, proxy, session absente, cookies/CSRF, Swagger et configuration invalide : réussi. Ports dédiés 33662/33663, processus fermés par le smoke.
- Recette Chromium sur 33562, serveur REST de fixtures sur 33563 : huit pages publiques, quatorze variantes privées/filtres, robots, sitemap 110 URL (8 pages + 51 questions + 51 projets) avec deux pages REST par catégorie, panne sitemap 503/Retry-After, contenu public listes/détails sans JavaScript, aucun Cookie/Authorization transmis par la lecture SSR. Identité WebSite JSON-LD vérifiée dans le HTML. Lien d’évitement clavier et focus du main contrôlés.
- HTTP : /ppp, identifiant mal formé, question UUID absente, projet UUID absent = 404 + noindex pour agent ordinaire et Googlebot (8 contrôles). API indisponible ne provoque pas une fausse page introuvable.
- Captures : 404 globale et question absente à 1440, 768, 390 et 320 px, aucune duplication main/h1 ni débordement. Images 1440/390/320 et vue imbriquée 768 examinées. Liens de sortie vérifiés. Aucune erreur JavaScript observée.

Preuves : `livrables/JokkoDev_SEO_20261030/verification.json`, captures et HTML sans JavaScript dans le workspace du chat ; logs de commandes dans `D:/DEV/JokkoDev/.cache/seo/verification/`. Les fixtures de navigateur sont distinctes du backend réel et ne constituent pas une recette PostgreSQL. Aucune requête d’écriture sur le domaine ni base existante.

## Incidents corrigés / limites

- Le dépôt ne dispose pas d’un worktree géré attachable depuis ce chat hors des racines du workspace : checkout Git isolé créé dans .cache/seo/worktree.
- La première passe sans JavaScript a révélé les limites loading qui forçaient le streaming : supprimées, puis build bloqué par useSearchParams sur Signalements. Limite Suspense localisée au formulaire ; nouveau build et recette réussis.
- Le premier smoke cherchait l’ancien texte « Accueil » dans le titre : assertion mise à jour avec le titre SEO et enrichie des contrôles robots/sitemap, puis smoke réussi.
- Next normalise la canonical racine sans slash final ; contrôle ajusté à l’URL équivalente effectivement rendue.
- La présence du gabarit 404 dans les scripts RSC ne prouve pas qu’il est affiché : contrôle d’indisponibilité corrigé pour vérifier le statut et le titre réellement visibles dans le navigateur.
- Appareils physiques, lecteurs d’écran, zoom réel 200 %, performances réseau de production et indexation Google non vérifiés. Pas de nouveau test PostgreSQL : aucun code backend ni schéma modifié.
- CI distante non exécutée pendant ce lot ; le dernier blocage connu concernait la facturation GitHub, sans preuve de résolution.
- Search Console, TXT DNS, soumission sitemap et déploiement restent à faire après validation. Aucune position Google ni conformité absolue annoncée.

À la fin de la recette initiale : aucun commit, push, PR, fusion ou accès SSH au VPS. Autres worktrees et services préservés.

Aperçu de validation : http://127.0.0.1:33560/ppp (build production, API locale volontairement indisponible sur le port 9 ; aucune connexion à une base). Les serveurs de fixtures et smoke sont arrêtés ; les autres aperçus sont préservés.

## Validation et publication

Le 30 octobre 2026, Ousmane valide le lot et autorise sa publication pour déploiement. Commit et PR vers develop préparés sur le code contrôlé, sans nouvelle modification produit. Les empreintes des 46 fichiers (dont 5 suppressions) sont conservées dans le manifeste local de publication pour vérifier leur identité. Pas de fusion, fusion automatique ni opération sur le VPS pendant cette publication ; la fusion reste soumise à la revue indépendante du partenaire. Le relevé final des exécutions GitHub est fourni avec le lien de PR, sans assimiler les tests locaux à une réussite CI distante.
