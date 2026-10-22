# Lot 17 — suppression logique propriétaire

Base `develop` : **77820fea6edc3e9bd76445d12f75ba3b188af534**, fusion de #27 vérifiée via Git et GitHub. Commit du lot16 ancêtre, #19 (`75c34d36422b9c2077c72c747c6bda8f63fe6916`) exclue. Dossier initial propre, distant conforme, fast-forward puis branche **feature/owner-content-deletion**. Préparation réalisée sans publication ni migration sur une base de l’équipe. Recette fonctionnelle validée par Ousmane ; publication autorisée pour revue vers develop, sans fusion ni déploiement.

## Modèle et contrat

La [décision 004](../decisions/004-owner-content-deletion.md) a été écrite avant extension des requêtes. Migration additive `20261022020000_owner_content_deletion` : deux colonnes nullable `Question.deletedAt` et `Project.deletedAt`, indépendantes de `visibility`. Aucune ligne ni FK supprimée, aucune migration partagée réécrite. La suppression propriétaire n’est pas une sanction ; pas de purge, restauration utilisateur ou suppression de réponse/compte.

`DELETE /api/v1/questions/:id` et `DELETE /api/v1/projects/:id` exigent session et CSRF, propriétaire déterminé en base. Réponse204 ; répétition par le même propriétaire204 sans changer la date ; inconnu404 ; tiers403 NOT_AUTHOR/NOT_OWNER sur contenu actif,404 sur contenu supprimé. ADMIN n’a pas de privilège d’auteur. Le propriétaire peut aussi supprimer un contenu masqué depuis sa liste privée.

Question : retrait transactionnel de la solution, réponses et relations conservées. Les modifications, publications de réponse et choix/retrait de solution prennent le verrou de la question et refusent l’état supprimé. Projet : recrutement fermé dans la transaction, relations conservées ; modifications, candidatures et décisions prennent le verrou du projet. Une opération antérieure déjà validée reste conservée, sans rétablir le contenu après suppression. Modération et suppression utilisent les mêmes lignes verrouillées, mais restent distinctes.

Routes publiques, recherche, pagination, profils, compteurs et réponses d’une question supprimée excluent les éléments supprimés ; détail/réponses/membres404. Les totaux sont filtrés côté serveur. Aucun filtrage local d’une page présenté comme global.

## Projections privées et administration

- Mes questions conserve « Question supprimée », date, contenu/technologies neutralisés et aucune action ni lien public. Les filtres résolues/non résolues concernent les éléments non supprimés ; Toutes conserve les références supprimées.
- Mes projets conserve « Projet supprimé » et rôle créé/rejoint, sans republier titre, objectif, technologies ou nombre fictif de membres. Aucune modification, nouvelle suppression, gestion active de demandes ou lien public.
- Les candidatures conservent statut et message privé autorisé. Le projet devient `available=false`, avec `deletedAt`, titre/recrutement/responsable null. ACCEPTED reste ACCEPTED et l’adhésion reste en base. Nouvelles candidatures et décisions refusées ; répétition d’une décision appliquée idempotente. Le retrait d’une demande PENDING par son candidat reste permis, comme pour un projet masqué.
- Le responsable conserve la lecture privée des demandes archivées dans la liste reçue générale et le détail de candidature. La vue d’un projet dépendant du détail public ne s’ouvre plus pour ce projet supprimé : utiliser les lectures privées, sans reconstituer un détail public.
- Le tableau de bord exclut les suppressions de ses compteurs questions/projets et affiche les références supprimées sans lien actif. Les compteurs de candidatures conservent leurs statuts historiques.
- L’administration reçoit `target.deletedAt`, distinct de la visibilité, sans clôture automatique des signalements. Pour une cible ANSWER, la date provient de sa question parente ; l’interface l’indique sans attribuer une suppression de réponse à son auteur. Le masquage éventuel reste affiché séparément. Historique conservé et plus de lien public pour la cible supprimée. Ces données ne sont pas exposées publiquement.

DTO privés OwnQuestionSummaryDto, OwnProjectSummaryDto, ApplicationProjectDto et DTO administratif ReportTargetDto étendus dans NestJS, puis génération habituelle OpenAPI/types. Aucun fichier généré édité à la main.

## Interface et relecture

`OwnerDelete` est commun aux détails et listes privées. Identifiants réels et session résolue ; aucun droit tiré d’un pseudonyme ou d’un rôle global. Démonstrations historiques conservées, sans mutation fictive ajoutée.

Dialogue adapté des composants existants et des planches16/19/29 : titre du contenu, retrait public, conséquences sur réponses/solution ou membres/candidatures, conservation et absence de restauration actuelle. Style destructif fondé sur `--color-danger`, focus initial Annuler, confinement Tab, Échap/retour au déclencheur, attente et verrou synchrone contre les doubles soumissions. Texte React, sans HTML non fiable.

Après succès réel : invalidation commune des vues et redirection vers la liste privée avec relecture. Après réponse perdue : incertitude explicite, aucun faux succès ou rejeu automatique. `readDeletion` consulte les pages privées jusqu’à la référence ; seule la date privée confirme la suppression. Un404 public ou l’absence dans une page ne la prouve pas. Une référence encore active permet une nouvelle confirmation explicite ; absence/erreur conserve l’incertitude. Aucun stockage persistant de donnée privée ajouté.

## Environnement et contrôles exécutés

Windows, Node24.15.0, pnpm10.34.6, PostgreSQL17.11. Bases **jokkodev_lot17** et **jokkodev_lot17_it**, destination127.0.0.1:55475 et zéro objet vérifiés avant migration. Aucun seed destructif ou changement de rôle d’un compte de l’équipe. Email fichier local, comptes fictifs uniquement. Dépendances et verrouillage inchangés ; aucune nouvelle installation nécessaire.

| Contrôle | Résultat |
| --- | --- |
| Prisma validation/génération | Réussi |
| Migrations/rejeu et catalogue/rejeu | Réussis sur les bases neuves dédiées |
| Génération OpenAPI/types, lint, TypeScript | Réussis |
| Tests backend |10 réussis |
| Tests frontend/client/outillage |91 réussis, dont3 nouveaux tests |
| Intégration PostgreSQL |96 réussis, dont8 nouveaux scénarios |
| Builds frontend/backend | Réussis dans le snapshot isolé, anciens builds préservés |
| Smoke final | Deux modes réussis, dont neuf aperçus404 en production |
| Recette API réelle | Six groupes réussis ; permissions, répétition, recherche, relations, statuts et historique |

Premier passage PostgreSQL :95 réussites/1 échec, une assertion exacte de l’ancien DTO de projet masqué omettait `deletedAt:null`. Attente mise à jour pour le contrat sans retirer les autres assertions, trace conservée, suite complète relancée. Un contrôle navigateur a rencontré la disparition du frontend temporaire, journal sans cause démontrée ; seul ce frontend du lot a été relancé. Le diagnostic suivant confirme identité, propriété et bouton sans correction de code. Un autre contrôle a échoué dans une expression de sélecteur du pilote mal échappée : corrigée sans changement produit ni suppression déjà jouée.

Preuves, journaux, comptes locaux et captures dans `.cache/lot17/`, ignorés. Les tests Node à transport simulé sont distincts de la recette HTTP/PostgreSQL et du navigateur réel. Les tests locaux ne valident pas la CI distante.

## Diagnostic CI en lecture seule

Configuration `.github/workflows/quality.yml` examinée : versions du dépôt, permissions `contents:read`, PostgreSQL éphémère, aucun secret de production ni déploiement. Pour les exécutions de #27 **39705916815**, **39705888575** et **39707303228**, l’API livre `completed/startup_failure`, chemin `BuildFailed`, aucun job ni annotation accessible dans les check-runs associés. Aucun test distant exécuté, cause non démontrée avec ces éléments. Aucun paramètre GitHub, permission, ressource payante ou contrôle modifié. Détails locaux : `.cache/lot17/ci-diagnosis.json`.

## Limites

Suppression logique uniquement ; les durées de conservation et la purge éventuelle restent à définir. Une opération validée avant suppression peut recevoir sa réponse concurremment ; la relecture fait autorité, sans restauration. Les références privées restent paginées côté serveur.

HTML initial200 après streaming reste distinct du404 API. Linux, lecteur d’écran, appareil physique, zoom navigateur réel à200%, contenus définitifs, licences et environnement cible non validés. Teranga Points exclue, production non validée. Recette fonctionnelle validée par Ousmane ; cette validation ne vaut pas validation de production.

Confidentialité de DELETE : un contenu masqué ou déjà supprimé est404 pour un tiers, y compris ADMIN. Seul son propriétaire peut agir sur sa référence privée masquée ou répéter une suppression.403 NOT_AUTHOR/NOT_OWNER concerne le contenu visible actif.

Après confirmation de suppression, l’invalidation commune est stricte : la génération d’identité des lectures change, afin de ne pas conserver une ancienne donnée pendant la relecture, même dans une vue conservée par la navigation cliente. Les autres mutations gardent leur comportement de focus existant. Aucun cache de données privées ou données de fixture ajouté.

## Recette disponible pour validation

Site : **http://127.0.0.1:33090** (utiliser cette origine exacte, pas localhost). API/readiness : `http://127.0.0.1:33091/api/v1/health/ready`. Comptes fictifs dans le fichier local ignoré `D:\DEV\JokkoDev\.cache\lot17\test-accounts.json`, entrées owner/member/other/admin. Ouvrir ce fichier localement ; ne pas le servir sur HTTP ni le publier. Les autres clés recensent uniquement les cibles de cette recette.

Scénarios intacts, à utiliser avec owner :

- Question sans réponse : `/questions/01a16160-21fd-741d-95a5-c782fe4df171`.
- Question avec réponse tierce et solution acceptée : `/questions/01a16160-2217-776d-b63e-f9c3745d227c`.
- Projet avec son seul responsable : `/projets/01a16160-2260-707e-b0f7-269318e08df6`.
- Projet avec membre accepté et demande en attente : `/projets/01a16160-22c4-71dd-b559-0cd738ee7c20`. member est le membre accepté, other le candidat en attente.
- Question déjà masquée : référence questions.hidden dans le fichier local, suppression accessible dans Mes questions.
- `/espace/questions`, `/espace/projets`, `/espace/candidatures?vue=recues` et `/admin/signalements` présentent les références et statuts conservés. La pagination privée contient les nouvelles références supprimées ; leurs compteurs ne sont pas les compteurs publics.

Les cibles apiDeleted/browser/uncertain/cache/adminContext ont déjà été consommées exclusivement pour les vérifications. Ne pas réinitialiser la base pour répéter ces essais. Les quatre cibles ci-dessus restent actives et n’ont pas été supprimées.

Processus finaux créés pour ce lot : backend Node PID34024 sur 33091 ; frontend Node PID14932 sur 33090. Les relances ont concerné uniquement les processus temporaires de ce lot, après contrôle de leurs PID/ports. Les recettes précédentes et le cluster PostgreSQL existant sont conservés. Les Chrome de vérification sont temporaires et fermés en fin de pilotage.

## Compléments de vérification et incidents de pilotage

Huit groupes de recette Chrome ont vérifié propriétaires/tiers/ADMIN/visiteurs, confirmations aux quatre largeurs, focus sûr, Tab/Échap, absence de débordement, suppression réelle de question/projet, double envoi bloqué et réponse204 perdue suivie d’une lecture privée sans rejeu. La relecture finale API confirme les compteurs de profil/tableau de bord, les adhésions et statuts archivés. Un contrôle supplémentaire retient la lecture privée après suppression confirmée : l’ancien titre disparaît avant la réponse, une seule mutation, puis404 public. Les événements de perte sont simulés dans le navigateur, mais la mutation et sa conservation sont réelles sur PostgreSQL.

Une présentation du bouton de contenu masqué a été corrigée pour le séparer du paragraphe explicatif ; les confirmations sont une adaptation documentée de la planche29, sans nouvelle maquette de suppression fournie. Les captures des modales utilisent la fenêtre visible : une capture pleine page représente mal le backdrop natif hors fenêtre. L’espace insécable avant le point d’interrogation évite une ponctuation isolée sur mobile ; sa première écriture littérale a été refusée par lint, puis remplacée par une expression Unicode JSX, sans désactiver la règle. Une commande auxiliaire de génération lancée sans le PATH pnpm requis a échoué avant export ; reprise avec l’environnement du dépôt et génération stable. Ces incidents ne remplacent pas les résultats finaux exécutés.

La vérification de branche GitHub confirme develop **non protégée** au contrôle ; les règles documentées et le fichier CI ne constituent pas une protection effective. Aucun réglage modifié.

Le dernier pilote visuel supposait initialement la référence masquée en première carte ; les nouvelles références supprimées avaient modifié cet ordre. Le ciblage de l’action visible a été corrigé dans le pilote, sans changement produit ni reprise de mutation.

## Revue visuelle finale et état du dossier

Captures réelles et contrôles à1440×1000,768×1024,390×844 et320×800 : confirmations question/projet, Mes questions/Mes projets et variantes de propriété. Images effectivement examinées : confirmations question1440/390 et projet320, Mes questions768, Mes projets390, action de question masquée320, contexte administratif de parent supprimé320 et survol destructif390. Pas de débordement constaté ; focus sûr, Tab/Échap et retour au déclencheur vérifiés. Les dialogues reprennent les composants de confirmation existants ; textes de suppression adaptés, sans prétendre disposer d’une maquette dédiée.

Fichiers dans `.cache/lot17/screenshots/` : `lot17-question-confirm-{1440,768,390,320}.png`, `lot17-project-confirm-{1440,768,390,320}.png`, listes privées aux mêmes largeurs, variantes membre/candidat/admin, résultat incertain et `lot17-destructive-hover-390.png`. Les images ne sont pas ajoutées au dépôt. Les neuf aperçus restent404 en production.

Dernière correction CSS : le survol conserve le style destructif, sans hériter du bleu du bouton principal. Build frontend relancé avec succès ; contrôle Chrome du fond destructif, cible≥44px et retour Échap réussis. Contrôles fonctionnels, génération, PostgreSQL et smoke réutilisés après ce dernier changement purement visuel. Aucun contrôle distant n’est déduit de ces résultats locaux.

À la fin de la préparation, sources, contrat généré et migration étaient locaux pour revue, avec index vide et sans publication. Le patch complet et son manifeste sans secrets sont conservés dans `.cache/lot17/lot17.patch` et `.cache/lot17/final-evidence.json`. Les références actives de validation sont conservées, aucun service des lots antérieurs arrêté ou redémarré.

Contrôle final des services : frontend/backend lot17 et recettes précédentes sur33070/33071/33080/33081 répondent200 ; aucun de ces anciens services arrêté ou redémarré. Les PID finaux lot17 sont14932 (frontend) et34024 (backend). Port de pilotage Chrome9292 fermé. Les contrôles de ce lot ne constituent pas une validation HTTPS ou de production.

## Publication pour revue

Recette fonctionnelle validée par Ousmane. Commit, publication de `feature/owner-content-deletion` et PR vers `develop` autorisés ; aucune fusion, fusion automatique, promotion ou migration sur une base de l’équipe. Les résultats locaux ci-dessus sont réutilisés après vérification d’identité des sources avec le snapshot testé ; seules les mentions documentaires de validation ont changé. Les résultats GitHub doivent être rapportés séparément : un `startup_failure` sans job ne constitue pas un test exécuté. Les services de recette restent préservés.
