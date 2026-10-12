# Publication initiale — préparation à valider

État au 12 octobre 2026 : préparation locale, **aucun commit ni push effectué**. Ce document décrit le plan soumis à DevTeranga ; il ne prouve pas une publication accomplie.

## Projet et dépôt inspectés

La racine du projet contient frontend/, backend/, packages/, pnpm-workspace.yaml et l’unique pnpm-lock.yaml du projet. Elle n’était pas un dépôt Git ; Git a été initialisé dans cette seule racine sur main, à la demande de l’équipe. Aucun dossier parent n’a été initialisé. origin pointe vers https://github.com/Usman-9895/jokkodev.git.

Dépôt de référence : [Usman-9895/jokkodev](https://github.com/Usman-9895/jokkodev), privé. Lecture distante réussie : aucune référence ; API GitHub : aucune branche, taille zéro et branche par défaut déclarée main. Aucun historique distant à intégrer à cette date. L’authentification Git locale permet l’accès et l’écriture ; l’identité de commit existante est conservée, sans modification de la configuration globale. La CLI gh n’est pas installée et le connecteur GitHub de cette session n’a pas accès à ce dépôt ; Git local est le canal de publication prévu.

Avant toute publication, relire à nouveau les références distantes. Si de nouveaux commits ou branches apparaissent, suspendre ce plan, les inspecter et proposer une intégration conservant leur historique avant nouvelle validation. Ne jamais forcer le push.

## Contenu préparé

Code frontend/backend, package API partagé, configurations, scripts, tests, schéma et configuration Prisma sans modèle, contrat OpenAPI exporté, types générés, exemples d’environnement, documentation, inventaire et notices de dépendances, modèle de PR et instructions de collaboration. Les règles Git locales normalisent les fichiers texte en LF, sauf le recueil des notices de tiers conservé à l’identique (espaces et fins de ligne compris).

Exclusions : environnements réels, secrets et clés, configuration personnelle, node_modules, builds, caches, logs, temporaires, rapports privés et sauvegardes. next-env.d.ts et le client Prisma sont régénérés localement ; le contrat OpenAPI et les types partagés sont conservés. Aucun fichier local n’est supprimé au seul motif de son exclusion.

La liste exacte des 88 fichiers préparés et l’audit local sont conservés dans le dossier ignoré .cache/publication/. La recherche sur les blobs exacts de l’index a signalé uniquement cinq occurrences de fixtures ou de valeurs d’exemple, revues sans afficher leurs valeurs. Aucune occurrence non résolue ; cette recherche heuristique ne constitue pas un audit exhaustif. Les faux secrets et connexions de test documentés ne sont pas des identifiants réels.

## Vérifications et limites

Les contrôles du socle et leur portée sont consignés dans [verification.md](../verification.md). La préparation ajoute les règles de branches et les exclusions de publication ; le code métier reste absent. Une copie propre de l’index a passé l’installation figée, la validation/génération Prisma, la génération OpenAPI, lint, TypeScript, neuf tests, les builds et les vérifications HTTP. Aucun environnement réel ou client Prisma déjà généré n’était présent dans cette copie. Le contrat et les types régénérés sont identiques aux fichiers préparés. Les fondations ne sont pas un MVP fonctionnel.

Limites conservées : PostgreSQL réel et readiness positive non vérifiés, exécution Linux non vérifiée, audit de licences incomplet, authentification et fonctionnalités métier absentes. Aucune migration ni ressource Datacloud n’est créée.

## Opérations après validation explicite

Message du premier commit :

```text
chore: initialize JokkoDev project foundations
```

Une fois la liste préparée, les résultats et ce plan validés explicitement, et après confirmation que le dépôt est toujours vide :

```sh
git ls-remote --symref origin
git diff --cached --check
git commit -m "chore: initialize JokkoDev project foundations"
git push --set-upstream origin main
git switch --create develop
git push --set-upstream origin develop
git switch develop
git status --short --branch
git rev-parse HEAD
git ls-remote --heads origin main develop
```

main et develop doivent désigner le même commit initial. develop doit être la branche locale active et chacune doit suivre sa branche distante. Ne pas créer de PR entre ces branches identiques, de branche de fonctionnalité anticipée, de fusion, d’invitation ou de modification de visibilité. Ne pas activer la fusion automatique.

Si un push échoue après le commit ou si l’état distant change, conserver le travail et signaler l’état exact. Aucun amendement, reset ou push forcé automatique.

## Collaboration après publication

Une branche par fonctionnalité depuis develop ; exemples futurs feature/auth, feature/questions, feature/projects. Chaque PR de fonctionnalité cible develop et détaille comportement, tests, limites et changements du contrat API. Ousmane et Serge effectuent la revue ; une approbation indépendante du partenaire de l’auteur est requise. Toute fusion nécessite la validation explicite de l’équipe. Promotion develop → main par PR après recette et validation, manuellement.

## Protections GitHub : état et recommandations

État inspecté : aucune branche n’existe encore. La fusion automatique est désactivée. L’API des rulesets renvoie 403 et demande une mise à niveau GitHub Pro ou un changement de visibilité pour cette fonctionnalité sur le dépôt privé. Aucun réglage de protection n’est appliqué par cette préparation ; ne pas présenter les règles de contribution comme techniquement imposées.

La [documentation GitHub sur les branches protégées](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) indique leur disponibilité sur les dépôts publics avec GitHub Free, et sur les dépôts privés avec les offres adaptées, notamment GitHub Pro pour un compte personnel. Aucune modification du compte ou de la visibilité n’est autorisée par ce plan.

Lorsque le compte permet ces protections, configurer des règles actives séparées pour main et develop :

- PR obligatoire et au moins une approbation indépendante ; l’auteur ne peut pas approuver sa propre PR, donc ne pas demander deux approbations externes à une équipe de deux personnes.
- Résolution des discussions obligatoire et approbations obsolètes annulées après de nouveaux changements.
- Application aux administrateurs également, sans contournement permanent permettant les push directs.
- Push forcés et suppressions de branches interdits.
- Contrôles CI obligatoires seulement après création d’un vrai workflow et identification de ses checks ; aucun workflow CI n’est configuré dans ce socle.
- Fusion automatique conservée désactivée.

Les limitations des restrictions par liste d’acteurs varient entre comptes personnels et organisations ; ne pas supposer que les options d’organisation sont disponibles ici. La stratégie stable/intégration et les cibles de PR restent à faire respecter par la revue tant qu’une règle effective ne les contrôle pas.

## Clonage par Serge après publication

```sh
git clone https://github.com/Usman-9895/jokkodev.git
cd jokkodev
git switch develop
```

Le dépôt étant privé, Serge devra disposer des droits d’accès et de son authentification GitHub. Aucune invitation n’est effectuée par cette préparation.
