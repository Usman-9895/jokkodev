# Questions de licences

Le contexte CADEV exclut GPL, LGPL et AGPL. Confirmer avec les organisateurs si la restriction inclut outils de développement, dépendances optionnelles propres aux plateformes, bibliothèques natives embarquées, images système et polices.

L’inventaire automatisé couvre les dépendances installées directes et transitives sur cette machine, outils compris. Les licences déclarées ne suffisent pas à prouver la conformité : lire les fichiers LICENSE/NOTICE et les licences des bibliothèques embarquées. Les alternatives multiples, valeurs inconnues ou ambiguës sont à arbitrer avant publication. Compléter l’inventaire sur Linux lors du premier build Linux, car les paquets natifs optionnels diffèrent.

Depuis le lot 1 frontend, Inter, Source Serif 4 et JetBrains Mono sont distribuées localement avec leurs notices SIL OFL 1.1 : provenance et empreintes exactes dans [fonts/](fonts/README.md). Les logos validés du skill sont intégrés sans modification, avec empreintes de provenance. Le périmètre CADEV sur les polices et les droits de distribution des ressources de marque restent des points de validation de l’équipe ; aucune conformité juridique globale n’est annoncée. Les illustrations et images système futures gardent la même exigence de provenance et de notices.

Le code original JokkoDev reste sans licence attribuée ; décision explicite de l’équipe requise. Conserver les notices originales des dépendances lors des distributions, puis établir un dossier de notices pour le livrable final selon son contenu effectif.

Lot 2 : le logo original fourni et la silhouette Afrique Natural Earth ont leur [fiche de provenance](home-assets.md). Aucune bibliothèque supplémentaire installée. La signature officielle DevTeranga reste à obtenir ; la présentation actuelle est explicitement provisoire dans la documentation du lot.

Prévention retenue : `sharp`, optionnel dans Next.js, est exclu de l’installation et l’optimisation d’images est désactivée. Éviter ainsi l’ajout automatique de libvips ne dispense pas de la revue des autres composants natifs et des alternatives de licences signalées dans l’inventaire.

## Résultat du premier inventaire Windows

456 entrées de dépendances installées et 590 notices conservées dans `third-party-notices.txt`. Aucune déclaration GPL/LGPL/AGPL ni licence déclarée inconnue détectée dans ce graphe installé. Cela ne couvre pas une revue juridique de chaque composant embarqué ou des binaires Linux.

- `type-fest@4.41.0` : `(MIT OR CC0-1.0)`, alternative à choisir et documenter lors de la distribution.
- `lightningcss@1.32.0` et son binaire Windows : MPL-2.0 ; `elkjs@0.11.1` : EPL-2.0. Ces licences ne sont pas les licences GNU exclues, mais leurs obligations de redistribution doivent être examinées.
- Next.js déclare MIT ; certaines notices intégrées sous `dist/compiled/@vercel/og` et `satori` contiennent MPL-2.0. Ne pas réduire la licence de tous les éléments embarqués à celle du paquet racine.
- 19 paquets n’ont pas de fichier de notice séparé détecté par le collecteur ; ils sont marqués dans l’inventaire. Vérifier leurs README, sources officielles et révisions correspondantes avant redistribution.
- Certaines notices mentionnent GPL dans leurs clauses de compatibilité ou leur historique (Python/argparse, MPL, EPL) ; cette mention textuelle seule n’établit pas que le paquet est distribué sous GPL.

L’inventaire porte sur les dépendances du workspace après exclusion de sharp. Les archives de téléchargement et anciennes versions présentes dans le cache local ne font pas partie du livrable à publier.

## Dépendances backend ajoutées (comptes et sécurité)

Relevé du 17 octobre 2026 avec `pnpm licenses:inventory` sur Linux. L'inventaire et les notices versionnés ne sont pas régénérés dans la même PR : le script produit des chemins et des paquets optionnels propres à la plateforme (Windows ou Linux), ce qui masquerait les changements réels. Régénérer l'ensemble sur la plateforme de référence avant la soumission.

| Paquet | Version | Type | Licence déclarée | Point d'attention |
|---|---|---|---|---|
| argon2 | 0.45.1 | Directe | MIT | Module natif : binaires précompilés de l'implémentation de référence Argon2 (CC0 ou Apache-2.0 selon le dépôt amont), notice à joindre |
| @phc/format | 1.0.0 | Transitive | MIT | |
| node-addon-api | 8.9.2 | Transitive | MIT | |
| node-gyp-build | 4.8.4 | Transitive | MIT | |
| cross-env | 10.1.0 | Transitive | MIT | Script d'installation non exécuté (`ignoredBuiltDependencies`) |
| csrf-csrf | 4.0.3 | Directe | ISC | Dernière publication en mai 2025, à surveiller |
| http-errors | 2.0.1 | Transitive | MIT | Déjà présent via Express |
| nodemailer | 10.1.2 | Directe | MIT-0 | |
| @types/nodemailer | 8.0.2 | Développement | MIT | |

Aucune licence GPL, LGPL ou AGPL déclarée dans ces ajouts.
