# Lot 19 — Teranga Points et journal de réputation

## Base et comparaison avec l’ancienne PR

Base `develop` : `d0fd6bda5de77890d7e853d74400618b057ad3aa`, fusion de #29 (photos/contact). Dossier propre au départ, distant de référence conservé. Branche locale `feature/teranga-points-integration`. L’ancienne PR #19 reste ouverte, non fusionnée et non modifiée ; son commit `75c34d36422b9c2077c72c747c6bda8f63fe6916` a été examiné en lecture seule avec sa description, sa décision 004, son service, sa migration et ses dix tests.

Éléments repris : structure du journal, constante de barème, synchronisation par différence, dix tests de base adaptés aux sources actuelles. Les anciens services, projections et fichiers générés ne sont pas appliqués comme un patch global. Adaptations : `deletedAt`, suppression propriétaire, profils photo/contact, motifs détaillés, immutabilité SQL, calcul par couple réponse/bénéficiaire et reconstruction atomique excluant les mutations normales. L’ancien préalable de déploiement est remplacé par l’autorisation du lot 19 ; aucun déploiement autorisé.

## Règles, données et transactions

Le barème validé par Ousmane est `POINTS_PER_ACCEPTED_ANSWER = 10`, unique constante dans `backend/src/modules/reputation/reputation.service.ts`. L’auteur d’une réponse actuellement acceptée reçoit dix points si la réponse appartient à la question, que les deux sont visibles, que la question n’est pas supprimée et que les deux auteurs diffèrent. Aucun point pour publication, projet, candidature ou signalement. Aucune pénalité supplémentaire à la suspension.

`ReputationEvent` porte bénéficiaire, question, réponse, delta, motif, séquence et date. Le score est la somme du journal ; aucun compteur dénormalisé ni montant client. Les compensations précèdent les nouvelles attributions au sein de la transaction. Répétition sans nouveau mouvement. Retrait/changement, masquage de réponse/question et suppression propriétaire neutralisent les attributions concernées. Les historiques, réponses et relations restent conservés.

Migration additive `20261022160000_teranga_points` : nouvelle table/énumération, clés étrangères restrictives, unicité réponse/séquence, CHECK du sens des mouvements et de la séquence. Le trigger append-only refuse UPDATE, DELETE et TRUNCATE ; il ne prétend pas empêcher une intervention DBA privilégiée sur le schéma. Les migrations partagées, les champs de suppression, les photos et contacts sont inchangés.

Les mutations de réputation prennent le verrou advisory partagé `(1949387571,19)` **avant** le verrou de question existant, puis mettent à jour l’état et le journal dans la même transaction. Des questions différentes restent traitables simultanément. La reconstruction prend ce verrou en mode exclusif avant les questions ordonnées par identifiant ; elle ne verrouille ni utilisateurs ni signalements. Les autres écritures existantes sur questions n’ajoutent pas de mouvements et conservent leurs protections.

## Reconstruction et activation future

Commande : `pnpm reputation:rebuild`, après configuration de l’environnement backend et confirmation explicite `REPUTATION_REBUILD_DATABASE=<nom vérifié>`. En PowerShell, définir cette variable dans le processus avant la commande. Le nom doit correspondre à `DATABASE_URL`, mais cette comparaison n’identifie pas à elle seule une production : l’opérateur doit vérifier hôte, port, base, schéma, sauvegarde et autorisation. Aucun identifiant secret n’est imprimé. L’outil n’est jamais lancé automatiquement par une migration ou un démarrage.

La procédure parcourt les questions ayant une solution ou un historique ; elle compare les sommes aux attributions attendues et ajoute uniquement les différences. Elle couvre les solutions acceptées avant l’installation et un journal incohérent sans réécrire les événements. Un deuxième passage cohérent n’écrit rien. Un échec annule l’ensemble du passage ; la transaction est bornée à120 secondes et les limites de requête du socle restent actives. Sur un gros volume, mesurer la durée et prévoir une fenêtre contrôlée ; pas de promesse de reconstruction en ligne sans attente des mutations.

## Contrat et présentation

`terangaPoints` enrichit les profils public et propriétaire, via NestJS puis `pnpm api:generate`. Aucun email/contact privé ajouté aux projections publiques ; les champs existants restent conservés. Aucun endpoint de journal public ou de modification arbitraire du score.

Composant commun `TerangaPoints` : score et libellé, explication courte, zéro distinct du chargement. Profil public dans la carte de contributions ; profil propriétaire dans la carte principale, avant la photo, pour rester visible sur mobile. Les autres cartes/auteurs n’affichent pas le score. Relecture après invalidation des contributions, montage et retour au premier plan/pageshow ; aucun calcul de bonus dans le navigateur. Le profil privé utilise la session réelle, des lectures sans cache et le rejet des réponses de session périmées. Les erreurs gardent leur état réel et proposent une nouvelle lecture.

Les maquettes13/14 et notes de la série03 ont été examinées ; elles n’incluent pas ce nouveau score. La charte et les composants existants sont conservés. Première capture : le score propriétaire était dans la colonne de confidentialité masquée sur mobile. Le contrôle visuel l’a détecté ; déplacement dans la carte principale et contrôle de visibilité réelle ajoutés à la recette Chrome. Les longs pseudonymes fictifs se replient, sans débordement ; la composition publique garde une hauteur de cartes commune au bureau.

## Vérifications exécutées

Environnement : Windows, Node24.15.0, pnpm10.34.6, PostgreSQL17.11. Bases nouvellement créées `jokkodev_lot19` et `jokkodev_lot19_it`, hôte127.0.0.1:55475, noms et absence d’objets contrôlés avant migration. Aucun effacement ou migration sur une base de l’équipe. Dépendances et verrouillage inchangés ; aucune nouvelle notice nécessaire.

Prisma valide/génère ; migrations et catalogue appliqués puis rejoués. Génération OpenAPI/types stable entre deux passages. Lint, TypeScript, builds backend/frontend et deux modes smoke réussis. Les neuf aperçus de développement renvoient404 dans le smoke production. Les builds de recette et smoke sont isolés des recettes précédentes.

Tests : **13 backend, 93 frontend/client/outillage et 123 PostgreSQL** réussis au passage final. Les vingt et un tests de réputation comprennent les dix scénarios historiques et onze ajouts : migration sur données existantes, suppression, suspension sans pénalité, solutions antérieures, reconstruction incohérente/rejouée, question supprimée, immutabilité SQL, décisions concurrentes, suppression/masquage concurrents, reconstruction concurrente, verrou exclusif avant mutation et rollback du passage après une première écriture possible. Les premiers passages obtenaient121 puis122 avant l’ajout des garanties explicites de verrou et de migration. Aucun test désactivé ou protection assouplie.

Le test de migration applique réellement les migrations précédentes dans un schéma neuf, y insère une solution acceptée, une question supprimée et des champs photo/contact, puis applique la nouvelle migration. Les données restent identiques ; la reconstruction ajoute une attribution puis zéro au rejeu. Ce schéma de test est ensuite supprimé, sans toucher à une base ou un schéma de l’équipe.

Recette réelle via le proxy : attribution+10, répétition, changement/retrait, autoacceptation, masquages et suppression ; égalité entre somme SQL, profils API public/privé. Commande CLI sur une solution préexistante : une écriture, rejeu zéro. Tentative PATCH du score refusée400. Photo normalisée, contact partagé après adhésion effective, refus ADMIN tiers et absence du contact public revérifiés. Les tests d’injection d’échec et de concurrence utilisent les schémas jetables PostgreSQL, sans provoquer de panne sur les services précédents.

Chrome réel aux largeurs1440/768/390/320 : profils publics positifs et propriétaires à zéro, profil privé positif, photo/biographie, changement de compte, acceptation/retrait via confirmations, focus sûr/Échap/retour et relecture du score après retour au premier plan. Captures dans `.cache/lot19/screenshots/`, preuves dans `browser-checks.json` et `real-checks.json`. Les captures sont locales, hors Git. Aucun résultat CI distant n’est déduit des tests Windows. Aucun incident HTTP500 inattendu constaté dans ces contrôles ; les500 injectés pour rollback sont des résultats attendus de tests. Les incidents de lots antérieurs restent dans leurs rapports, sans explication inventée.

## Recette laissée disponible

- Site : http://127.0.0.1:33120 ; connexion `/connexion`, profil propriétaire `/espace/profil`.
- API/readiness : http://127.0.0.1:33121/api/v1/health/ready.
- Ouvrir localement `.cache/lot19/test-accounts.json` pour les comptes owner/member/other/admin et les identifiants de questions/réponses/projet. Ne pas servir ce fichier par HTTP. Aucun mot de passe, cookie, token ou email local dans ce guide.
- `questions.principale` : solution du compte member, utile pour changer/retirer/réaccepter ; `questions.anterieure` contribue aussi au score de ce compte. member a20 points au terme de la recette, owner/other zéro. Les champs `questions.auto`, `reponse_masquee`, `question_masquee` et `question_supprimee` identifient les cas séparés. Le projet actif conserve le contact entre collaborateurs.
- Profils : `/profils/<member.id>` positif avec photo, `/profils/<owner.id>` à zéro. Les scénarios masqués/supprimés sont volontairement indisponibles publiquement.

Processus créés : backend du lot19 sur33121, frontend sur33120 ; identifiants actuels dans `.cache/lot19/backend-process.json` et `frontend-process.json`. Le frontend de ce lot a seul été remplacé par son build final après correction mobile. Les anciens services sont préservés. Chrome9294 et smoke33130/33131 sont temporaires et fermés après vérification.

Dernier constat : backend PID39348, frontend PID51236 ; ports33120/33121 répondent200. Les services33070/33071/33080/33081/33090/33091/33100/33101 répondent également200, sans arrêt ni redémarrage de notre part. Les ressources inconnues question/projet ont été relues : HTML200 et API404, limite reproduite. L’audit constate28 fichiers modifiés/nouveaux, index vide, aucun secret détecté et sources identiques aux snapshots de recette ; génération stable. Les fichiers de comptes, emails, stockage, logs et captures restent ignorés.

## Limites et préalables

La reconstruction doit être autorisée et exécutée sur la cible au moment de l’activation, après sauvegarde, migration additive et contrôle de destination ; elle n’a été testée ici que sur bases dédiées. Prévoir les droits minimaux et la protection du journal face aux opérateurs privilégiés. Pas de restauration de contenu ni purge dans ce lot. Les évolutions éventuelles de barème doivent passer par une décision et une réconciliation explicite.

Limite de streaming HTML initial200/API404 conservée. HTTPS cible, Linux, lecteur d’écran, appareil physique, zoom navigateur réel200%, budgets/charge et production non validés. Les échecs de démarrage CI des lots précédents ne constituent pas des tests exécutés et ne sont pas corrigés par ce lot. Contenus définitifs, environnement SystaLink, stockage photo et arbitrages de licences restent distincts. Aucune conformité globale ou aptitude au déploiement annoncée.

Lors de la livraison initiale, aucun commit, push, PR, modification de l’ancienne PR #19, fusion, déploiement ou migration d’équipe n’avait été effectué. Ousmane a ensuite validé fonctionnellement le lot 19 et son barème de dix points, puis autorisé un commit et la publication de la branche avec une nouvelle PR vers `develop`. Cette autorisation ne couvre aucune fusion, aucun déploiement ni aucune migration/reconstruction sur une base de l’équipe. L’ancienne PR #19 reste inchangée.
