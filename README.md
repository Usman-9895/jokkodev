# JokkoDev — socle local

Notifications e-mail transactionnelles préparées localement, désactivées par défaut : [exploitation et recette](docs/operations/transactional-email-notifications.md), [résultats observés](docs/operations/transactional-email-notifications-verification.md). Migration additive et traitement CLI séparé ; aucune activation ou livraison SMTP externe réalisée.

Lot F2 validé localement par Ousmane, publication en PR autorisée : [question en attente, reprise et aperçu](docs/frontend/question-pending-publication.md), [décision d'idempotence et migration additive](docs/decisions/010-question-pending-publication.md), [recette PostgreSQL et navigateur](docs/frontend/question-pending-publication-verification.md). Envoi toujours volontaire, copie locale sept jours, reçu serveur minimal éligible à purge après huit jours. Aucun déploiement de F2 effectué.

Conservation préparée (non activée) : [décision 007](docs/decisions/007-data-retention.md), [commandes, matrice et exploitation](docs/operations/data-retention.md), [recette](docs/operations/data-retention-verification.md). `pnpm retention` simule par défaut, avec destination explicitement confirmée ; aucun traitement ni email déclenché au démarrage.

Plateforme panafricaine d’entraide et de collaboration, portée par DevTeranga pour la CADEV 2026. Cette livraison prépare le backend de comptes, contenus, projets, candidatures et modération, avec contrats générés. Les lots 10 à 14 raccordent comptes, sessions, profils, JokkoHelp, JokkoProjects, tableau de bord, candidatures et modération minimale aux endpoints réels. L’aptitude à la production reste non validée. Dépôt de référence : [Usman-9895/jokkodev](https://github.com/Usman-9895/jokkodev).

## Installation

Prérequis : Node.js **24.15.0 ou correctif ultérieur de la branche 24**, pnpm **10.34.6**. PostgreSQL **17.11** est la cible locale recommandée ; aucune base n’est requise pour la liveness ou l’export OpenAPI. Docker n’est pas obligatoire.

Depuis la racine :

```sh
npm install --global pnpm@10.34.6
pnpm install --frozen-lockfile
```

Si PowerShell bloque les scripts `.ps1`, utiliser `npm.cmd` et `pnpm.cmd` sans modifier la politique système. Sans installation globale, préfixer les commandes par `npm exec --yes --package=pnpm@10.34.6 --` (par exemple `npm exec --yes --package=pnpm@10.34.6 -- pnpm install --frozen-lockfile`).

Copier `backend/.env.example` vers `backend/.env` et `frontend/.env.example` vers `frontend/.env.local`, puis adapter la connexion locale. Le backend et Prisma chargent `.env` depuis `backend/` ; les scripts filtrés pnpm fixent ce répertoire. Next.js charge `.env.local` depuis `frontend/`. Ne pas placer les secrets à la racine ni les préfixer `NEXT_PUBLIC_`. Les variables déjà présentes dans le processus ont priorité.

```sh
pnpm db:validate
pnpm db:generate
pnpm api:generate
pnpm dev
```

Frontend : http://localhost:3000 ; backend : http://127.0.0.1:3001 ; Swagger de développement : http://127.0.0.1:3001/api/docs. Les scripts frontend utilisent `server.mjs` : le relais API prend l’IP du socket, remplace les en-têtes entrants et lit `API_INTERNAL_ORIGIN` au démarrage. Employer `TRUST_PROXY=127.0.0.1` derrière ce relais local ; vide/false seulement pour Nest en accès direct. Ne pas exposer les ports internes. `next dev/start` seuls ne relaient plus l’API. Voir la [frontière de confiance](docs/decisions/006-proxy-ip-trust.md). Arrêt avec Ctrl+C. Le backend démarre sans base accessible si sa configuration est valide ; readiness renvoie alors 503. Voir [PostgreSQL local et Datacloud](infra/README.md).

## Commandes

| Commande racine | Effet |
|---|---|
| `pnpm dev` | Frontend et backend en parallèle |
| `pnpm dev:frontend` / `pnpm dev:backend` | Une seule application |
| `pnpm build` | Vérification du package partagé, builds NestJS et Next.js |
| `pnpm lint` | ESLint sur le code du projet |
| `pnpm typecheck` | Vérification TypeScript des trois packages |
| `pnpm test` | Tests HTTP backend, validation, erreurs et client HTTP |
| `pnpm test:smoke` | Après build, vérifications HTTP des pages et du proxy sur 3000/3001 ; ferme ses serveurs |
| `pnpm db:validate` / `pnpm db:generate` | Validation du schéma / génération Prisma |
| `pnpm db:migrate:dev` | Migration de développement, seulement après vérification de destination et autorisation |
| `pnpm db:migrate:deploy` | Application contrôlée des migrations versionnées ; jamais `db push` |
| `pnpm db:seed` | Catalogue des technologies, idempotent |
| `pnpm db:seed:demo` | Comptes et contenus de démonstration préfixés « [Démo] », mots de passe aléatoires affichés une fois |
| `pnpm admin:grant <email>` / `pnpm admin:revoke <email>` | Attribution contrôlée du rôle ADMIN, sur le serveur uniquement |
| `REPUTATION_REBUILD_DATABASE=<base vérifiée> pnpm reputation:rebuild` | Réconciliation atomique du journal Teranga Points, après contrôle de destination et autorisation ; voir décision 004 |
| `pnpm test:integration` | Contraintes PostgreSQL sur la base `TEST_DATABASE_URL`, dans un schéma temporaire |
| `pnpm test:security-ip` | Régression IP avec vraies connexions TCP ; exige une base migrée jetable explicitement confirmée, voir lot 21 |
| `pnpm api:export` | Export OpenAPI sans base ni secret de production |
| `pnpm api:generate` | Export puis génération des types partagés |
| `pnpm licenses:inventory` | Inventaire direct et transitif des licences installées |

La première génération Prisma suit l’installation et la copie de l’exemple d’environnement. Le modèle de données et sa migration initiale sont décrits dans le [modèle de données](docs/architecture/data-model.md) ; la préparation de la base est détaillée dans [infra/README.md](infra/README.md).

Les ports 3000 et 3001 doivent être libres avant `test:smoke`. Les caches locaux sont ignorés par Git. Sur la machine de préparation, les fichiers `.env` locaux ont été créés à partir des exemples ; la connexion PostgreSQL reste à adapter. Les résultats et les adaptations liées à l’environnement Windows restreint sont détaillés dans le rapport de vérification.

Pour préserver des serveurs existants, le smoke accepte `SMOKE_FRONTEND_PORT` et `SMOKE_BACKEND_PORT`. Il utilise le serveur Node frontend et lui transmet `API_INTERNAL_ORIGIN` au démarrage. Le smoke prépare une configuration de production fictive conforme, sans base accessible ni émission d’email, et n'arrête que ses propres processus. Ne pas exporter `NODE_ENV=development` pour un build Next.js de production.

## Organisation

```text
frontend/                 Next.js, routes publiques et pages provisoires
  src/app/                /, /connexion, /espace, /admin et états d’interface
  src/components/         Composants UI et layouts
  src/lib/                Clients HTTP navigateur/serveur et config privée
  src/styles/             Tokens, polices locales et animations communes
backend/                  NestJS REST /api/v1
  src/common/             Erreurs, validation et emplacements transversaux
  src/config/             Validation de configuration
  src/database/           Prisma et cycle de vie différé
  src/health/             Liveness et readiness
  src/modules/            Responsabilités des futurs domaines, sans faux CRUD
  prisma/                 Schéma, migrations versionnées
  test/                   Tests de comportement
packages/api-client/      Types OpenAPI générés et transport HTTP
docs/                     Architecture, contrat, décisions, sécurité, licences
infra/                    PostgreSQL local, nginx, systemd, rôles SQL, sauvegarde et restauration
.github/                  Modèle de PR
```

## Collaboration

**Ousmane** : frontend, UX/UI, intégration et coordination. Première tâche : définir les parcours et maquettes accessibles de JokkoHelp, puis proposer les composants UI réutilisables à partir des tokens existants.

**Serge** : backend, API, données, authentification et sécurité backend. Première tâche : installer une base dédiée, valider readiness et récupération réelles, puis proposer les contraintes du modèle initial et le contrat de sessions/CSRF avant toute migration métier.

Synchroniser toute évolution de contrat via `pnpm api:generate`. Exploitation : [runbook](docs/operations/runbook.md), [rapport de tests backend](docs/security/test-report.md), [décisions ouvertes](docs/decisions/open-items.md). Voir [contribution](CONTRIBUTING.md), [architecture](docs/architecture/overview.md), [versions et décisions](docs/decisions/001-foundations.md), [sécurité](docs/security/security.md), [vérifications](docs/verification.md) et [licences](docs/licenses/open-questions.md).

`main` est destinée aux versions stables ; `develop` à l’intégration. Chaque fonctionnalité part de `develop` dans une branche dédiée et passe par une PR vers `develop`. La promotion de `develop` vers `main` passe par une PR après recette. Ousmane et Serge relisent ; aucun commit, push ou fusion sans validation explicite, et aucune fusion automatique.

La publication initiale est préparée selon le [plan de publication](docs/publication/initial-publication.md), qui précise son état et les protections réellement disponibles. Les règles documentées ne sont pas automatiquement imposées par GitHub. Le code original n’a pas de licence attribuée ; la décision appartient à l’équipe.

## Historique des interfaces avant intégration (lots 2 à 9)

Les descriptions suivantes retracent la préparation initiale ; l’état opérationnel actuel est décrit par les guides des lots 10 à 14 et le bilan central.

L’accueil pilote est accessible sur `/` avec `pnpm dev:frontend`. Navigation publique, illustration animée et aperçu de questions fictives. Le lot 3 propose leur consultation locale sur `/questions` et `/questions/[id]` avec recherche, filtres et pagination. Les opérations de contribution restent indisponibles dans le parcours public. Voir le [guide JokkoHelp](docs/frontend/jokkohelp-read.md), le [guide de l’accueil et des animations](docs/frontend/homepage.md) et le [catalogue du lot 1](docs/frontend/design-system.md), réservé au développement.

Le lot 4 prépare les interfaces de comptes sur `/connexion`, `/inscription`, `/mot-de-passe-oublie`, `/nouveau-mot-de-passe` et `/verification-email`, avec opérations explicitement indisponibles. Les profils et états fictifs se consultent dans `/dev/comptes`, réservé au développement. Aucune authentification ni sauvegarde réelle ajoutée. Voir le [guide comptes et profils](docs/frontend/accounts-profiles.md).

Le lot 5 prépare les formulaires de question et réponse et les variantes personnelles de JokkoHelp. Les actions publiques restent désactivées, sans session ou API métier inventée. Création/modification, Mes questions et solutions fictives se consultent dans `/dev/jokkohelp-contributions`, réservé au développement et renvoyant 404 en production. Voir le [guide de contribution JokkoHelp](docs/frontend/jokkohelp-contributions.md) et le [rapport de vérification du lot 5](docs/frontend/lot-5-verification.md).

Le lot 6 propose la consultation fictive de JokkoProjects sur `/projets` et `/projets/[id]`, avec recherche, filtres et pagination. Les interfaces de création/modification et Mes projets sont isolées dans `/dev/jokkoprojects`, réservé au développement. Aucune opération backend de projets ou candidature intégrée. Voir le [guide JokkoProjects](docs/frontend/jokkoprojects.md) et le [rapport du lot 6](docs/frontend/lot-6-verification.md).

Le lot 7 propose un espace de démonstration unique sur `/dev/espace` : tableau de bord, candidatures envoyées/reçues et formulaire de candidature, avec navigation vers les interfaces personnelles existantes. Aucune session ou opération backend intégrée ; routes produit indisponibles, aperçus en 404 en production. Voir le [guide du lot 7](docs/frontend/dashboard-applications.md).

Le lot 8 prépare le signalement des questions, réponses et projets et une administration limitée à leur traitement. Les opérations publiques restent indisponibles ; formulaires, décisions et historique fictifs sont isolés dans `/dev/signalements` et `/dev/moderation`, en 404 en production. Voir le [guide signalements/modération](docs/frontend/reports-moderation.md) et le [rapport du lot 8](docs/frontend/lot-8-verification.md).

Le lot 9 propose `/regles`, `/contact` et une attente publique sur `/confidentialite`. La structure de confidentialité à relire est réservée à `/dev/informations` (404 en production). Footer et métadonnées harmonisés, sans activation métier. Voir le [guide](docs/frontend/information-quality.md), l’[inventaire des routes](docs/frontend/routes.md), le [bilan d’intégration pour Serge](docs/frontend/integration-readiness.md) et le [rapport](docs/frontend/lot-9-verification.md).

## Brouillon local de question (lot F1)

Le [lot F1](docs/frontend/question-local-drafts.md) ajoute localement un brouillon explicite de création de question par compte/profil navigateur, conservé sept jours et limité à 256 Kio. Reprise après vérification de session, sans file d'envoi ni cache privé dans la PWA. Voir la [recette et ses limites](docs/frontend/question-local-drafts-verification.md) ; recette validée par Ousmane ; publication en PR autorisée, fusion et déploiement réservés à une étape distincte.

## PWA et lecture hors connexion (lot E)

Le lot E prépare une PWA et une lecture hors connexion limitée aux trois guides publics, sans mise en cache des comptes, questions ou projets : [guide de recette et exploitation](docs/frontend/pwa-offline-reading.md), [vérifications locales et limites](docs/frontend/pwa-verification.md), [décision 009](docs/decisions/009-pwa-offline-reading.md). Fonctionnalité disponible dans un build de production ; worker désactivé en développement. Recette locale validée par Ousmane, publication en PR autorisée ; aucun déploiement effectué par ce lot.

## Smoke isolé

`pnpm test:smoke` attend un build de production. Les ports sont configurables par `SMOKE_FRONTEND_PORT` et `SMOKE_BACKEND_PORT` ; le relais Node lit API_INTERNAL_ORIGIN au démarrage. Les ports occupés sont refusés. Le mode par défaut cible volontairement une base inaccessible sur 127.0.0.1:1, vérifie liveness 200/readiness 503, session absente, CSRF avant validation, cookies Secure/HttpOnly/SameSite et Swagger absent en production. Il utilise une configuration SMTP locale sans envoyer d’email ; `MAIL_TRANSPORT=file` reste réservé au développement/test et aux tests d’intégration.

Pour vérifier aussi readiness 200 et les erreurs 429 traversant Next/CORS : fournir explicitement `SMOKE_DATABASE_URL` (base migrée dédiée), et `SMOKE_CONFIRM_DATABASE` égal au nom de cette base après vérification du serveur, port et caractère jetable. Aucune reprise implicite de `DATABASE_URL`, aucune migration ni création de compte. Des connexions volontairement invalides avec des adresses aléatoires `example.test` déclenchent la limitation ; aucun email n’est envoyé. Ces contrôles Node sur HTTP ne remplacent pas une session navigateur sous HTTPS ni SMTP réel. Seuls les processus démarrés par le smoke sont arrêtés.

Signalements et modération : [guide du lot 14](docs/frontend/moderation-integration.md), [recette](docs/frontend/lot-14-verification.md). Tableau de bord et candidatures : [guide du lot 13](docs/frontend/dashboard-applications-integration.md), [recette](docs/frontend/lot-13-verification.md). JokkoProjects : [guide du lot 12](docs/frontend/jokkoprojects-integration.md). JokkoHelp : [guide du lot 11](docs/frontend/jokkohelp-integration.md). Comptes et profils : [guide du lot 10](docs/frontend/auth-integration.md), [bilan central](docs/frontend/integration-readiness.md). Les comptes de recette et environnements locaux ne doivent pas être publiés.

## Préparation de livraison (lot 15)

Recette globale locale, corrections ciblées, workflow qualité préparé et préalables dans le [rapport de livraison](docs/release/readiness.md). Ce rapport distingue contrôles locaux, automatisation à valider sur Linux, déploiement cible et production. Aucun déploiement ni aptitude à la production validés.
