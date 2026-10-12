# Décision 001 — fondations locales

État : socle à relire par Ousmane et Serge. Versions vérifiées dans les documentations officielles et dans le registre npm le 11 octobre 2026 ; les versions directes sont exactes dans les manifests et les transitives verrouillées dans l’unique pnpm-lock.yaml.

| Composant | Version retenue | Motif / contrainte |
|---|---|---|
| Node.js | 24.15.0, branche 24 | LTS disponible, plancher commun du projet ; moteur limité à `<25` |
| pnpm | 10.34.6 | Workspaces simples, CLI JavaScript portable et version épinglée |
| Next.js | 16.4.0 | App Router stable, Node >=20.9 ; lint externe |
| React / React DOM | 19.3.0 | Paire identique, compatible Next 16 |
| TypeScript | 6.0.3 | Strict, compatible Nest 12 et typescript-eslint retenu ; pas de TS 7 imposé |
| Tailwind / PostCSS plugin | 4.3.3 | Configuration officielle PostCSS et tokens CSS |
| NestJS | 12.1.2 | REST monolithique modulaire ; dépendances ESM consommées via Node 24 |
| Nest Swagger | 12.0.2 | Peer dependencies Nest 12 / TypeScript 6 |
| Prisma / client / adapter-pg | 7.10.0 | Même version, configuration datasource externe et adaptateur PostgreSQL |
| pg | 8.23.1 | Driver PostgreSQL de l’adaptateur Prisma |
| PostgreSQL | 17.11 cible | Branche maintenue ; installation non effectuée par ce socle |
| ESLint | 10.12.0 | Branche maintenue ; ESLint 9 est en fin de vie |
| openapi-typescript | 7.13.0 | Types dérivés du contrat exporté, sans runtime Nest dans le frontend |

Compatibilité du générateur : openapi-typescript 7.13.0 déclare un peer TypeScript `^5.x`. Le seul package api-client épingle donc TypeScript 5.9.3 pour la génération/vérification ; les applications utilisent 6.0.3. Les types produits restent compatibles avec les deux compilateurs. pnpm vérifie strictement les peer dependencies. Le script de télémétrie facultatif `@scarf/scarf` est désactivé explicitement.

Lint : utilisation directe de `@next/eslint-plugin-next` 16.4.0 (règles recommandées et Core Web Vitals), avec ESLint et typescript-eslint. Le regroupement `eslint-config-next` n’est pas installé : ses plugins React/import/accessibilité ne déclarent pas encore tous ESLint 10 compatible. La revue d’accessibilité reste nécessaire ; ne pas assimiler ce lint à un audit d’accessibilité complet.

Prisma 8 était proposé via une release candidate par le tag latest : il n’a pas été retenu. Pas de canary, beta ou fonctionnalité expérimentale indispensable. Les builds ne téléchargent aucune police. Pas de Turborepo, Nx, Redis, Socket.IO, PostGIS, microservices ou orchestration ajoutée.

Le backend est compilé en CommonJS via NodeNext ; Node 24 sait charger les dépendances ESM compatibles par require(esm). Prisma génère explicitement un client CommonJS. Cette combinaison est vérifiée par compilation et exécution, et nécessite le plancher Node du projet. Le frontend utilise la résolution bundler. Le package partagé exporte du TypeScript consommé par Next.js ; aucun Prisma/NestJS n’y est importé.

La connexion est différée jusqu’à readiness ou un futur appel aux données. Arrêt : hooks NestJS et $disconnect Prisma. Pas de connexion pendant l’export OpenAPI.

L’optimisation d’images Next.js est désactivée (`images.unoptimized`). Sa dépendance optionnelle `sharp` est exclue via `ignoredOptionalDependencies` pour éviter d’introduire les composants natifs libvips soumis à une revue LGPL dans ce socle sans images. Ne pas réactiver cette optimisation sans décision de licence et tests associés. Les autres dépendances natives restent soumises à l’inventaire et à la revue de leurs notices.

## Sources officielles

- [Installation Next.js](https://nextjs.org/docs/app/getting-started/installation)
- [Migration NestJS 12](https://docs.nestjs.com/migration-guide)
- [Prérequis Prisma 7](https://docs.prisma.io/docs/orm/v7/reference/system-requirements)
- [Adaptateurs Prisma](https://docs.prisma.io/docs/orm/v7/core-concepts/supported-databases/database-drivers)
- [Installation pnpm et compatibilité Node](https://pnpm.io/installation)
- [Tailwind avec PostCSS](https://tailwindcss.com/docs/installation/using-postcss)
- [Support ESLint](https://eslint.org/version-support/)
- [Versions PostgreSQL maintenues](https://www.postgresql.org/support/versioning/)

## Questions ouvertes

Licence du code original ; périmètre exact de l’exclusion GPL/LGPL/AGPL ; notices des composants natifs ; ressources visuelles validées ; détails de pagination ; normalisation Unicode des identifiants ; politique des contenus ; sessions/CSRF et hachage ; règles de recrutement et modération ; décision Teranga Points ; services Datacloud réellement disponibles, proxy fiable, sauvegardes/RPO/RTO et procédure de migrations.
