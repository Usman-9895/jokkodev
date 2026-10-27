# Conservation — corrections du 27 octobre 2026

Branche `feature/data-retention`, base `33a0d9f548f3345c42066530fa15649cf646dab2`. Complément au rapport initial du 26 octobre, conservé. Aucun commit, push, PR, déploiement, accès au VPS ou activation.

## Corrections

- Rotation des deux familles de sauvegardes : base PostgreSQL et fichiers/photos/configurations, avec fractions facultatives jusqu’à 9 chiffres. Comparaison à la nanoseconde, dates invalides ignorées, clés préservées, simulation sans écriture et refus des liens symboliques.
- Progression des lots d’inactivité : les préavis en attente n’occupent plus les places des comptes à traiter ; les délais restent respectés. SENT sans date confirmée passe en revue. Quatre comptes sont couverts par quatre passages de taille 1 ; truncated indique le travail restant.
- Chemin Node des deux unités corrigé en `/usr/local/bin/node`. Conditions d’activation et absence de [Install] préservées. Contrôle statique uniquement, sans exécution systemd sur la cible.

## Reproductions et contrôles

Les nouveaux tests d’archives et les trois scénarios PostgreSQL reproduisaient les défauts avant correction, puis passent après correction.

| Contrôle relancé | Résultat |
|---|---|
| Lint et TypeScript | Réussis |
| Compilation backend/frontend/client | Réussie |
| Génération OpenAPI/types | Réussie, empreintes avant/après inchangées |
| Tests backend unitaires | 16 réussis |
| Tests frontend/client/outillage Windows | 102 réussis sur 103 ; 1 ignoré, aucun échec |
| Rotation des copies sous Linux isolé | 4 réussis, aucun ignoré |
| Intégration PostgreSQL | 147 réussis, aucun ignoré |
| Six migrations sur base vide dédiée | Réussies ; rejeux par schéma dans les tests d’intégration |
| Smoke sans base / avec base dédiée | Deux modes réussis ; neuf aperçus 404, Swagger absent, cookies/CSRF et quota 429/CORS |

L’unique test ignoré sous Windows concerne la création d’un lien symbolique, non autorisée pour ce compte. Il a été exécuté avec succès sous Linux, image locale node:24-alpine, réseau désactivé, dépôt monté en lecture seule et fixtures dans /tmp. Cela ne constitue pas une recette Linux complète du site.

Un nouveau PostgreSQL 17.11 Alpine dédié, `jokkodev-retention-review-aad1d35b`, est utilisé sur `127.0.0.1:61435`, base `retention_corrections`. Destination et vacuité vérifiées avant les migrations. Les schémas de tests sont supprimés par leurs helpers. L’ancien conteneur de recette reste intact. Les smoke utilisent 33512/33513 et arrêtent leurs seuls serveurs temporaires. Le nouveau conteneur est arrêté en fin de contre-recette, ses données fictives conservées.

## Limites et suite

Les preuves initiales de préavis et de réconciliation après restauration restent celles du 26 octobre ; aucune nouvelle restauration opérationnelle n’est annoncée ici. Aucun nettoyage de copies réelles, email réel, journal ou boîte LWS. Les durées et la migration ne sont pas modifiées par ces trois corrections. Aucun paquet ajouté.

Les tâches restent désactivées. Revue du diff complet, publication et fusion autorisées, puis migration/simulation ciblées et activation progressive selon le guide restent nécessaires. Préserver la distinction entre politique adoptée, mécanismes préparés et traitements réellement activés dans les pages d’information. Les dossiers avec tiers, sanctions, photos ou réputation restent manuels. Aucune aptitude production ou conformité juridique globale nouvelle n’est affirmée.
