# JokkoDev — socle local

Plateforme panafricaine d’entraide et de collaboration, portée par DevTeranga pour la CADEV 2026. Ce socle contient les fondations techniques uniquement : aucune authentification, donnée privée, table métier ou fonctionnalité CRUD. Ce n’est pas encore un MVP fonctionnel. Dépôt de référence : [Usman-9895/jokkodev](https://github.com/Usman-9895/jokkodev).

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

Frontend : http://localhost:3000 ; backend : http://127.0.0.1:3001 ; Swagger de développement : http://127.0.0.1:3001/api/docs. Arrêt avec Ctrl+C. Le backend démarre sans base accessible si sa configuration est valide ; readiness renvoie alors 503. Voir [PostgreSQL local et Datacloud](infra/README.md).

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
| `pnpm api:export` | Export OpenAPI sans base ni secret de production |
| `pnpm api:generate` | Export puis génération des types partagés |
| `pnpm licenses:inventory` | Inventaire direct et transitif des licences installées |

La première génération Prisma suit l’installation et la copie de l’exemple d’environnement. Aucun modèle artificiel n’est ajouté. Les migrations n’ont pas à être exécutées pour ce socle sans modèle.

Les ports 3000 et 3001 doivent être libres avant `test:smoke`. Les caches locaux sont ignorés par Git. Sur la machine de préparation, les fichiers `.env` locaux ont été créés à partir des exemples ; la connexion PostgreSQL reste à adapter. Les résultats et les adaptations liées à l’environnement Windows restreint sont détaillés dans le rapport de vérification.

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
  prisma/                 Schéma sans tables métier
  test/                   Tests de comportement
packages/api-client/      Types OpenAPI générés et transport HTTP
docs/                     Architecture, contrat, décisions, sécurité, licences
infra/                    PostgreSQL local et topologie Datacloud envisagée
.github/                  Modèle de PR
```

## Collaboration

**Ousmane** : frontend, UX/UI, intégration et coordination. Première tâche : définir les parcours et maquettes accessibles de JokkoHelp, puis proposer les composants UI réutilisables à partir des tokens existants.

**Serge** : backend, API, données, authentification et sécurité backend. Première tâche : installer une base dédiée, valider readiness et récupération réelles, puis proposer les contraintes du modèle initial et le contrat de sessions/CSRF avant toute migration métier.

Synchroniser toute évolution de contrat via `pnpm api:generate`. Voir [contribution](CONTRIBUTING.md), [architecture](docs/architecture/overview.md), [versions et décisions](docs/decisions/001-foundations.md), [sécurité](docs/security/security.md), [vérifications](docs/verification.md) et [licences](docs/licenses/open-questions.md).

`main` est destinée aux versions stables ; `develop` à l’intégration. Chaque fonctionnalité part de `develop` dans une branche dédiée et passe par une PR vers `develop`. La promotion de `develop` vers `main` passe par une PR après recette. Ousmane et Serge relisent ; aucun commit, push ou fusion sans validation explicite, et aucune fusion automatique.

La publication initiale est préparée selon le [plan de publication](docs/publication/initial-publication.md), qui précise son état et les protections réellement disponibles. Les règles documentées ne sont pas automatiquement imposées par GitHub. Le code original n’a pas de licence attribuée ; la décision appartient à l’équipe.

L’accueil pilote est accessible sur `/` avec `pnpm dev:frontend`. Navigation publique, illustration animée et aperçu de questions fictives. Le lot 3 propose leur consultation locale sur `/questions` et `/questions/[id]` avec recherche, filtres et pagination. Les opérations de contribution restent indisponibles dans le parcours public. Voir le [guide JokkoHelp](docs/frontend/jokkohelp-read.md), le [guide de l’accueil et des animations](docs/frontend/homepage.md) et le [catalogue du lot 1](docs/frontend/design-system.md), réservé au développement.

Le lot 4 prépare les interfaces de comptes sur `/connexion`, `/inscription`, `/mot-de-passe-oublie`, `/nouveau-mot-de-passe` et `/verification-email`, avec opérations explicitement indisponibles. Les profils et états fictifs se consultent dans `/dev/comptes`, réservé au développement. Aucune authentification ni sauvegarde réelle ajoutée. Voir le [guide comptes et profils](docs/frontend/accounts-profiles.md).

Le lot 5 prépare les formulaires de question et réponse et les variantes personnelles de JokkoHelp. Les actions publiques restent désactivées, sans session ou API métier inventée. Création/modification, Mes questions et solutions fictives se consultent dans `/dev/jokkohelp-contributions`, réservé au développement et renvoyant 404 en production. Voir le [guide de contribution JokkoHelp](docs/frontend/jokkohelp-contributions.md) et le [rapport de vérification du lot 5](docs/frontend/lot-5-verification.md).

Le lot 6 propose la consultation fictive de JokkoProjects sur `/projets` et `/projets/[id]`, avec recherche, filtres et pagination. Les interfaces de création/modification et Mes projets sont isolées dans `/dev/jokkoprojects`, réservé au développement. Aucune opération backend de projets ou candidature intégrée. Voir le [guide JokkoProjects](docs/frontend/jokkoprojects.md) et le [rapport du lot 6](docs/frontend/lot-6-verification.md).

Le lot 7 propose un espace de démonstration unique sur `/dev/espace` : tableau de bord, candidatures envoyées/reçues et formulaire de candidature, avec navigation vers les interfaces personnelles existantes. Aucune session ou opération backend intégrée ; routes produit indisponibles, aperçus en 404 en production. Voir le [guide du lot 7](docs/frontend/dashboard-applications.md).

Le lot 8 prépare le signalement des questions, réponses et projets et une administration limitée à leur traitement. Les opérations publiques restent indisponibles ; formulaires, décisions et historique fictifs sont isolés dans `/dev/signalements` et `/dev/moderation`, en 404 en production. Voir le [guide signalements/modération](docs/frontend/reports-moderation.md) et le [rapport du lot 8](docs/frontend/lot-8-verification.md).
