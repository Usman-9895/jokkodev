# Vérifications exécutées

Exécution locale le **11 octobre 2026**, Windows, Node.js **24.15.0**, pnpm **10.34.6**. Projet : `D:\DEV\JokkoDev`. Aucun Git initialisé, remote configuré, commit, push, fusion, déploiement ou migration exécuté.

| Contrôle exécuté | Résultat |
|---|---|
| `pnpm install --frozen-lockfile` | Réussi, verrouillage à jour, quatre projets workspace |
| `pnpm db:validate` | Schéma Prisma 7.10.0 sans modèle validé |
| `pnpm db:generate` | Client Prisma généré sans table artificielle |
| `pnpm lint` | Réussi, zéro erreur |
| `pnpm typecheck` | Réussi pour backend, frontend et api-client |
| `pnpm build` | Builds NestJS et Next.js réussis, package partagé vérifié |
| `pnpm test` | 6 tests backend + 3 tests client HTTP réussis |
| `pnpm api:generate` | OpenAPI exporté, types générés ; répété avec DATABASE_URL volontairement invalide pour confirmer l’indépendance de l’export |
| `pnpm test:smoke` après build | Réussi : quatre pages, 404, santé directe et proxy, Swagger absent en production, démarrage invalide refusé |
| `pnpm dev` | Frontend et backend démarrés ensemble ; compilation surveillée sans erreur |
| Appels HTTP en développement | Liveness via frontend 200 ; readiness via frontend 503 ; Swagger backend 200 |
| `pnpm licenses:inventory` | 456 entrées directes/transitives ; 590 notices originales conservées, y compris notices imbriquées |
| Arrêt final | Requêtes sur 3000 et 3001 impossibles après fermeture : aucun serveur de vérification restant |

## Portée des tests

Les tests backend couvrent la validation de configuration sans fuite de valeur, la liveness indépendante de PostgreSQL, les en-têtes, la readiness avec base indisponible, les entrées invalides/propriétés supplémentaires, JSON mal formé, limite de corps 64 Kio, route inconnue et exception interne nettoyée. Le cas positif de readiness utilise une dépendance contrôlée : **ce n’est pas un test avec PostgreSQL réel**. Les contrôleurs auxiliaires de validation sont réservés au module de test et ne sont pas chargés dans AppModule.

Le client HTTP est testé pour JSON, 204, cookies, futur en-tête CSRF, no-store, annulation, panne réseau, erreur API, réponse invalide et refus des chemins externes/remontées. Cela ne prouve pas une protection CSRF effective : elle reste à implémenter.

Les pages `/`, `/connexion`, `/espace`, `/admin` ont été vérifiées par HTTP et contenu attendu, ainsi que la page inconnue en 404. Pas d’audit visuel multi-navigateurs ni de tests complets d’accessibilité exécutés. Les états React de chargement et d’erreur sont compilés ; aucun parcours métier n’est simulé.

## Difficultés rencontrées puis corrigées

- pnpm n’était pas globalement installé : utilisation de la CLI épinglée via npm exec et son répertoire local. PowerShell bloque npm.ps1 : emploi de npm.cmd/pnpm.cmd.
- Cache npm global restreint : cache déplacé sous `.cache/`. Le store pnpm local est configuré dans `.npmrc`.
- Cache Prisma global en lecture seule dans l’environnement d’exécution : copie locale du moteur officiel déjà présent, puis exécution avec `PRISMA_SCHEMA_ENGINE_BINARY` pointant sur `.cache/prisma/schema-engine.exe`. Aucun moteur n’a été modifié. Ce contournement concerne l’environnement restreint ; une installation Windows/Linux habituelle laisse Prisma gérer son cache. Si le même blocage réapparaît, fournir un cache inscriptible ou un chemin vers le moteur officiel de la même version ; ne pas désactiver la validation.
- ESLint 9 non maintenu : passage à ESLint 10 et au plugin Next officiel direct. Les plugins tiers incompatibles du regroupement eslint-config-next ne sont pas installés.
- Peer TypeScript du générateur OpenAPI : TypeScript 5.9.3 réservé au package api-client, TypeScript 6.0.3 pour les applications.
- Le premier dispositif d’arrêt Windows ne pouvait pas utiliser taskkill dans cet environnement restreint. Les processus de test concernés ont été arrêtés explicitement ; le script smoke a été corrigé pour arrêter directement ses processus enfants et attendre leur sortie, puis réexécuté avec succès. La fermeture effective des deux ports a été vérifiée.
- Next.js crée par défaut des instructions d’agent au démarrage en présence d’un agent IA : `agentRules: false` conserve la maîtrise des instructions dans l’AGENTS.md du projet.

Le seul avertissement d’installation restant concerne le script facultatif `@scarf/scarf`, non exécuté volontairement. Aucun conflit de peer dependencies n’est accepté dans la configuration finale.

## Contrôles restant à réaliser

**PostgreSQL réel :** ni serveur local détecté, ni moteur Docker accessible. Le client psql n’est pas disponible. Aucune vérification readiness 200 sur base réelle, récupération après reconnexion, migration ou restauration n’est annoncée réussie. Installer/configurer une base de test dédiée selon `infra/README.md`, puis :

```sh
pnpm db:validate
pnpm db:generate
pnpm dev
```

Vérifier `GET http://localhost:3001/api/v1/health/ready` et le même chemin sur le port 3000 (200). Sur cette seule base dédiée et autorisée, vérifier l’arrêt (503), puis la récupération (200). Lorsqu’un premier modèle et une migration seront approuvés : `pnpm db:migrate:dev`, puis `pnpm db:migrate:deploy` sur une base de validation distincte après vérification de destination. Ne pas utiliser `db push`.

**Linux :** scripts conçus avec CLI Node/pnpm et sans commande shell propre à Windows, mais exécution Linux non réalisée. Rejouer installation figée, génération, lint, typecheck, tests, build et inventaire de licences sur Linux avant validation de cette plateforme.

**Sécurité future :** sessions, cookies, CSRF, permissions, suspension, limitation des tentatives, emails et assainissement métier restent à implémenter et tester. Datacloud n’a pas été testé ni configuré.

**Licences :** une expression alternative, 19 paquets sans notice séparée détectée, licences MPL/EPL et composants natifs/embarqués demandent une revue. Aucun certificat de conformité globale n’est donné.

## Préparation de publication — 12 octobre 2026

Git a été initialisé dans la racine du projet sur main et origin configuré vers le dépôt privé existant Usman-9895/jokkodev, à la demande explicite de l’équipe. Le dépôt distant a été inspecté avec l’authentification Git locale : aucune référence ou branche, aucun historique à intégrer. Aucun commit ni push effectué pendant cette préparation.

AGENTS.md, CONTRIBUTING.md et le modèle de PR décrivent les fonctionnalités depuis develop, PR vers develop, revue Ousmane/Serge, validation explicite avant fusion et promotion develop vers main par PR après recette. Les exclusions couvrent les environnements réels, clés, fichiers personnels, builds, caches et rapports privés. L’exclusion `/reports/` concerne les rapports à la racine ; elle préserve `backend/src/modules/reports/`, emplacement métier des signalements obligatoires.

Les contrôles ont été repris sur une copie propre des blobs préparés dans l’index, sans environnements réels, dépendances, builds, next-env.d.ts ou client Prisma généré. Ce contrôle supplémentaire vérifie les exclusions et la procédure de démarrage depuis le contenu destiné au dépôt ; il ne s’appuie pas sur les fichiers générés du dossier de développement.

| Contrôle du contenu préparé | Résultat |
|---|---|
| Installation `--offline --frozen-lockfile` depuis le cache local | Réussie, 456 dépendances, verrouillage inchangé |
| Validation et génération Prisma | Réussies, schéma sans modèle |
| Export OpenAPI et génération des types | Réussis ; résultats identiques aux fichiers préparés |
| Lint et TypeScript | Réussis dans le dossier principal et la copie propre |
| Tests | 6 backend + 3 client HTTP réussis dans la copie propre |
| Builds | Backend et frontend réussis dans la copie propre |
| Vérifications HTTP de la copie propre | Quatre pages, 404, santé/proxy, readiness 503, Swagger absent en production et configuration invalide : réussis |
| Recherche de secrets dans l’index | 5 occurrences d’exemples/fixtures revues ; aucune occurrence non résolue. Recherche heuristique, pas un audit exhaustif |
| Diff préparé | Contrôle des espaces réussi ; notices tierces explicitement conservées à l’identique |

L’installation de la copie propre a nécessité des autorisations étendues pour réutiliser le store dans cet environnement restreint. Le premier lancement du test HTTP s’est arrêté avec le code Windows 3221226505 ; la réexécution avec autorisations étendues a réussi. La cause précise de ce premier arrêt n’est pas établie. Le moteur Prisma officiel local déjà décrit a été utilisé ; la seule connexion de configuration était une valeur de test dirigée vers un port local indisponible.

La liste exacte des fichiers et les résultats détaillés locaux restent dans `.cache/publication/`, exclu de Git. Après les contrôles, seuls des ajustements de documentation et d’exclusions ont été apportés ; le code exécutable et le verrouillage testés sont conservés. Aucun contrôle Linux ni PostgreSQL réel supplémentaire n’est revendiqué. Les limites métier, sécurité et licences ci-dessus restent applicables : les fondations ne sont pas un MVP fonctionnel.

Voir [plan de publication](publication/initial-publication.md). GitHub renvoie 403 pour les rulesets du dépôt privé et demande une mise à niveau du compte ; aucune protection n’a été appliquée par cette préparation et la fusion automatique reste désactivée.
