# Dépendances — correction ciblée du 23 octobre 2026

Avant : 7 avis (2 critiques, 4 high, 1 moderate), sur le même verrou que l’audit. Après : **1 avis high conservé**, zéro critique/moderate dans le résultat du registre. `pnpm audit --json` reste donc en **code 1**, pas annoncé vert. Voir `dependencies-evidence.json` pour versions, chemins et résultats expurgés avant/après.

| Composant | Avant | Après | Décision |
|---|---|---|---|
| Next, @next/eslint-plugin-next, @next/env, SWC correspondant | 16.4.0 | **16.4.2** | Version stable du registre, compatible React 19.3 et Node 24 ; pas de canary ou fonctionnalité nouvelle |
| Prisma CLI, client, adapter-pg et famille 7.10 associée | 7.10.0 | **7.10.1** | Patch parent compatible ; pas de Prisma 8 RC même si proposé par latest |
| deepmerge-ts via Prisma/config | 7.1.5 | **8.0.2** | Version choisie par le parent publié, aucun override majeur manuel |
| mysql2 via Prisma CLI | 3.15.3 | **3.24.4** | Même principe ; runtime produit toujours PostgreSQL |
| braces via plugin Next → fast-glob → micromatch | 3.0.3 | **3.0.3** | Alerte conservée : aucun correctif publié et chaîne parente compatible toujours affectée |

## Sources officielles et applicabilité

Les trois avis Next cités par l’audit corrigent les versions 16.0–16.4.0 à partir de 16.4.1 : [SVG/optimiseur](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw), [Server Actions](https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r), [`use cache`](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr). Choix de [16.4.2 stable](https://github.com/vercel/next.js/releases/tag/v16.4.2), correctif de la même branche. Lecture de la [liste mainteneur actuelle](https://github.com/vercel/next.js/security/advisories) et nouvel audit du graphe : aucun autre avis affectant la version choisie remonté par ce contrôle, sans prétendre couvrir des failles inconnues.

`images.unoptimized` et `ignoredOptionalDependencies: sharp` restent présents. Aucun sharp/libvips installé ou réactivé. Aucune Server Action ou Cache Component ajouté. Les préconditions absentes décrites au lot 20 ne sont pas utilisées comme substitut à la mise à jour.

[Prisma 7.10.1](https://github.com/prisma/orm/releases/tag/7.10.1) publie notamment les mises à jour de sécurité parentes. Avis : [deepmerge-ts](https://github.com/RebeccaStevens/deepmerge-ts/security/advisories/GHSA-ggr8-5vv4-36mx), [mysql2/auth](https://github.com/sidorares/node-mysql2/security/advisories/GHSA-3f6p-5ww8-9rcr), [mysql2/décompression](https://github.com/sidorares/node-mysql2/security/advisories/GHSA-rgwj-5xj2-c3m3). Le moteur interne `@prisma/engines-version` passe à `8.1.0-1.d1b3f377ca835d73fd50954a5e22128b9ebdd6b8` : **pin officiel de @prisma/engines 7.10.1** vérifié dans le registre, pas installation du CLI Prisma 8 RC. Compatibilité vérifiée par génération, migrations/rejeux et 123 tests PostgreSQL ; cela ne constitue pas un audit binaire du moteur.

## Alerte conservée, sans masquage

[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) affecte braces `<=3.0.3`. Au 23 octobre, `braces@latest=3.0.3`, micromatch 4.0.8 et fast-glob 3.3.3 dépendent encore de cette branche ; le plugin Next 16.4.2 choisit fast-glob 3.3.1. Aucune version corrigée indiquée (`<0.0.0` du scan est un marqueur, pas une version installable). Pas de suppression d’alerte, d’audit fix, de réécriture du compilateur glob ou d’override non validé.

Chemin d’outillage ESLint ; les motifs examinés proviennent de la configuration du dépôt, pas d’une recherche HTTP utilisateur. Risque résiduel : motif de compilation hostile pouvant épuiser la pile de l’outil ; aucune charge de saturation exécutée. Les PR restent du code non fiable à isoler en CI, indépendamment de cet avis. **Suivi proposé** : responsable frontend/dépendances, revue des versions mainteneurs à la prochaine préparation de livraison et avant exposition, remplacement par version corrigée compatible lorsqu’elle existe ; accepter explicitement ou corriger ce résiduel, sans le déclarer résolu parce que son exploitation produit n’est pas démontrée.

## Notices, WASM et plateformes

Inventaire standard relancé sur **win32/x64 : 469 → 467 entrées** ; notices générées mises à jour. Trois transitives de mysql2 retirées et sql-escaper ajouté, solde −2 : pas de variantes Linux supprimées silencieusement. Comparaison détaillée dans la preuve ; même plateforme avant/après. Les fontes, assets et leurs notices séparées restent conservés. Le nouvel sql-escaper 1.5.2 vient de mysql2, notice incluse. Aucun nouvel outil de traitement photo.

Les cinq tests purement JavaScript du relais ont également été exécutés dans Node Linux 24.19.0/alpine, pas une installation native complète ou un inventaire Linux du workspace. Conserver les réserves WASM libwebp embarqué, Argon2, Prisma, SWC, bibliothèques système et images de conteneurs. Le scan npm ne couvre pas tout leur contenu. Pas de conformité CADEV globale ni d’arbitrage implicite des licences exclues.
