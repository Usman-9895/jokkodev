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

## Base PostgreSQL et modèle initial — 17 octobre 2026

Exécution par Serge sur Linux (Ubuntu 24.04), Node.js 24.15.0, pnpm 10.34.6, branche `feature/database-schema`. Base dédiée PostgreSQL 17.11 dans un conteneur local publié sur 127.0.0.1 uniquement, rôle applicatif `jokkodev` distinct du superutilisateur, bases `jokkodev` et `jokkodev_test`. Aucune base partagée ni de production utilisée.

| Contrôle exécuté | Résultat |
|---|---|
| `pnpm install --frozen-lockfile` sur Linux | Réussi, verrouillage inchangé |
| Readiness sur base réelle | 200 ; base arrêtée : 503 avec liveness 200 ; base relancée : 200 sans redémarrer NestJS |
| `pnpm db:validate` / `pnpm db:generate` | Schéma du modèle initial valide, client généré |
| `prisma migrate dev` (base de développement vide) | Migration `init` appliquée |
| `prisma migrate diff` base / schéma | Vide : les CHECK et index partiels ajoutés en SQL ne créent pas de dérive |
| `prisma migrate deploy` sur une base de validation distincte | Migration appliquée, puis rejeu sans migration en attente ; `migrate status` à jour |
| `pnpm db:seed` exécuté deux fois | 50 technologies créées, puis 0 |
| `pnpm test:integration` | 14 tests réussis sur PostgreSQL réel ; schéma temporaire supprimé |
| `pnpm lint`, `pnpm typecheck`, `pnpm build` | Réussis |
| `pnpm test` | 6 tests backend et 26 tests frontend/client réussis |
| `pnpm api:generate` | Contrat OpenAPI et types inchangés (aucune route ajoutée) |

Non exécuté sur cette branche : `pnpm test:smoke`, `pnpm licenses:inventory` (aucune dépendance ajoutée). L'exécution Linux du socle est désormais vérifiée pour l'installation, le lint, le typage, les tests et les builds.

## Comptes, sessions et CSRF — 17 octobre 2026

Branche `feature/auth`, mêmes environnement et base dédiée que ci-dessus.

| Contrôle exécuté | Résultat |
|---|---|
| `pnpm test` | 10 tests backend sans base (dont CSRF, origine, configuration de production) et 26 tests frontend/client réussis |
| `pnpm test:integration` | 25 tests sur PostgreSQL réel, réussis trois fois de suite |
| `pnpm lint`, `pnpm typecheck`, `pnpm build` | Réussis |
| `pnpm api:generate` | Contrat et types régénérés avec les routes `/auth/*` |
| Parcours via le proxy Next.js (port 3000) | Mutation sans jeton 403, origine étrangère 403, inscription 201 avec cookies HttpOnly SameSite=Lax Path=/ sans Domain, `/auth/me` 200 |
| `pnpm admin:grant` / `admin:revoke` | Usage, compte inconnu et email non vérifié refusés ; attribution puis retrait réussis |
| `pnpm licenses:inventory` | Exécuté ; nouvelles dépendances relevées dans `docs/licenses/open-questions.md`, fichiers générés non versionnés dans cette PR |

Non vérifié : envoi SMTP réel (fournisseur non choisi), cookies `__Host-` en HTTPS (aucun environnement HTTPS disponible), `pnpm test:smoke`.

## Profils et technologies — 17 octobre 2026

Branche `feature/profiles`. `pnpm lint`, `pnpm typecheck`, `pnpm build` et `pnpm api:generate` réussis ; `pnpm test` : 10 tests backend et 26 frontend/client ; `pnpm test:integration` : 31 tests sur PostgreSQL réel (ajout du catalogue, du profil public/privé, des champs protégés, des URLs refusées, des compteurs visibles et du caractère NUL rejeté).

## JokkoHelp — 17 octobre 2026

Branche `feature/questions`. `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm api:generate` réussis ; `pnpm test` : 10 tests backend et 26 frontend/client ; `pnpm test:integration` : 42 tests sur PostgreSQL réel, dont 11 pour JokkoHelp (création et validation, propriété, acceptation/remplacement/retrait/répétition, solution étrangère ou masquée refusée, quatre acceptations concurrentes laissant une seule solution, recherche et filtres combinés, pagination, balises conservées sans transformation, question masquée inaccessible par toutes les routes publiques).

## JokkoProjects — 17 octobre 2026

Branche `feature/projects`. `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm api:generate` réussis ; `pnpm test` : 10 backend et 26 frontend/client ; `pnpm test:integration` : 48 tests sur PostgreSQL réel, dont 6 pour les projets (responsable déduit de la session et membre une seule fois, échec simulé de l'adhésion par trigger sans projet partiel, propriété, fermeture et réouverture du recrutement, filtres combinés, membres publics sans données privées, projet masqué inaccessible, profils sans doublon).

## Candidatures — 17 octobre 2026

Branche `feature/applications`. `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm api:generate` réussis ; `pnpm test` : 10 backend et 26 frontend/client ; `pnpm test:integration` : 57 tests sur PostgreSQL réel, réussis trois fois de suite, dont 9 pour les candidatures (parcours complet, message privé absent des vues publiques et refusé aux tiers comme à l'administrateur, trois envois simultanés pour une seule demande, règles de candidature, fermeture avec demandes en attente traitables, cinq candidatures concurrentes d'une fermeture, transitions par partie, décisions simultanées sur cinq tours avec une seule issue et une adhésion cohérente, projet masqué).

## Signalements et modération — 17 octobre 2026

Branche `feature/moderation`. `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm api:generate` réussis ; `pnpm test` : 10 backend et 26 frontend/client ; `pnpm test:integration` : 69 tests sur PostgreSQL réel, réussis trois fois de suite, dont 12 pour ce lot (doublons simultanés, cibles invalides, refus membre et visiteur sur toutes les routes admin, clôture sans action, masquage de la solution acceptée, masquage concurrent d'une acceptation sur cinq tours, suspension effective sur session ouverte, décisions simultanées de deux administrateurs, actions directes).

## Exploitation et répétition de production — 17 octobre 2026

Branche `feature/operations`. Contrôles du dépôt réussis (`pnpm lint`, `typecheck`, `build`, `api:generate`, 10 + 26 tests, 69 tests d'intégration). Répétition sur une instance PostgreSQL 17.11 isolée puis supprimée :

| Contrôle | Résultat |
|---|---|
| `infra/postgres/roles.sql` puis migrations par `jokkodev_migrator` et `grants.sql` | Réussis ; le rôle applicatif ne peut ni créer ni supprimer de table ni lire `_prisma_migrations` |
| `pnpm db:seed` et `pnpm db:seed:demo` avec le rôle applicatif | Réussis, mots de passe aléatoires affichés une fois |
| API en `NODE_ENV=production` avec le rôle applicatif | Santé 200, Swagger 404, cookies `__Host-` Secure, version dans le journal de démarrage |
| Configuration de production incomplète | Démarrage refusé, variables fautives nommées sans leur valeur |
| `backup.sh` puis `restore.sh` dans une base vide | Sauvegarde chiffrée de 54 Ko ; restauration en 1 seconde (16 tables, 1 migration, 3 comptes) ; `migrate status` à jour |
| Restauration vers la production ou d'une sauvegarde altérée | Refusées |
| nginx 1.28 en HTTPS (certificat autosigné) devant NestJS et Next.js | `nginx -t` et `post-deploy-check.sh` réussis ; inscription et session en HTTPS |
| `X-Forwarded-For` falsifié à chaque tentative de connexion | Ignoré : 5 refus puis 429 |

Non vérifié : Datacloud, SMTP réel, calibrage Argon2 sur le serveur cible.

## Alignement avec le frontend — 17 octobre 2026

Branche `feature/frontend-alignment`. Contrôles du dépôt réussis ; `pnpm test:integration` : 72 tests sur PostgreSQL réel, suite complète rejouée six fois avec traçage des erreurs internes (seule l'erreur 500 provoquée volontairement par le test d'atomicité des projets apparaît). Migration additive `code_language` appliquée sur la base de développement, sans dérive du schéma.

## Teranga Points — 17 octobre 2026

Branche `feature/teranga-points`. Contrôles du dépôt réussis ; `pnpm test:integration` : 82 tests sur PostgreSQL réel, trois exécutions réussies, dont 10 pour Teranga Points (attribution, autoacceptation à zéro, quatre acceptations simultanées pour une seule attribution, changement de solution compensé, cycle accepter/retirer/réaccepter, neutralisation au masquage de la réponse et de la question, masquage concurrent sur cinq tours, échec simulé du registre sans changement partiel, contraintes de la base, score non modifiable). Migration `teranga_points` appliquée sans dérive ; `pnpm reputation:rebuild` exécuté deux fois sans écriture sur la base de développement.
