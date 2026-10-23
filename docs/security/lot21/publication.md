# Publication pour revue du lot 21

La publication est autorisée par Ousmane après la revue locale. Elle ne vaut ni fusion, ni autorisation de déploiement ou d’exposition publique.

Base vérifiée à nouveau avant publication : `d300b0ba17fbf8d0665c26f6cad52c17ac0011a2`. Après récupération des références distantes, `origin/develop` est toujours identique à cette base. Aucun rebase ou changement de base n’a été effectué.

Le [rapport](rapport.md), le [suivi des dépendances](dependances.md), les [résultats des contrôles](checks-evidence.json) et les JSON de reproduction sont les preuves versionnées à lire pour la revue. Ils décrivent aussi les incidents intermédiaires et les réserves non résolues. Leur lecture ne nécessite ni comptes, ni journaux privés, ni accès au worktree historique du lot 20.

`etat-final.md`, `state-evidence.json`, `processes-final.json`, `github-evidence.json` et `preuves-manifest.json` restent des **instantanés historiques de la fin des vérifications, avant publication**. Leurs mentions « aucun commit », « sans publication » et les états CI concernent cet instant, pas l’état ultérieur de la PR. Le manifeste conserve les empreintes originales des fichiers testés ; les chemins de logs et captures qu’il mentionne correspondent à des pièces locales exclues de la publication. Il ne permet pas de reconstituer ces pièces et n’est pas une attestation indépendante.

Avant indexation, les 92 empreintes du manifeste ont été revérifiées sans différence. Le code, les dépendances, le workflow et les scripts correspondent donc à l’état testé : les contrôles réussis sont réutilisés, sans nouvelle migration ni redémarrage de service. Seule cette note éditoriale a été ajoutée pour clarifier la portée des instantanés. Les contrôles Git de publication et l’état réel des nouvelles exécutions CI sont rapportés dans la PR et le compte rendu de publication.

Pour un rejeu indépendant, utiliser les scripts et les prérequis de [reproduction.md](reproduction.md). Les lanceurs spécifiques au poste nécessitent une configuration privée dédiée à préparer localement ; cette configuration n’est pas livrée. Le test `pnpm test:security-ip` accepte la configuration explicite de la base éphémère CI documentée et ne dépend pas des comptes privés de la recette originale. Les cinq tests du relais sont également exécutables sans cette base avec `node --test tests/api-relay.test.mjs`.

Les limites restent ouvertes : alerte braces, CI distante non validée, validation du frontal et de l’isolation des ports sur SystaLink, HTTPS et exploitation, composants natifs/WASM et licences. Les essais Linux sont ciblés et ne constituent pas une recette Linux complète. Aucun résultat local n’est une certification de sécurité.
