# Recette du lot 14 — signalements et administration minimale

19 octobre 2026. Base develop **112ae43c355e4c9a339517ce0e633fb9901b6c85**, branche **feature/frontend-moderation-integration**. PR#24 réellement fusionnée, tête e1decdc3d15bfc274369b4b93094e35fa2a42112 ancêtre du develop utilisé. Le commit propre de #19 (75c34d36422b9c2077c72c747c6bda8f63fe6916) n’est pas ancêtre. Dossier initial propre, origin conforme ; avance rapide de develop uniquement et branche neuve. Validation fonctionnelle accordée par Ousmane après recette. Publication du commit et de la PR vers develop autorisée ; aucune fusion autorisée. Les contrôles ci-dessous portent sur l’état final de la recette, inchangé lors de la préparation de publication hors mise à jour documentaire de cette validation.

## Références et périmètre

AGENTS, README, décisions, guides modération/API lus ; skill jokkodev-ui-fidelity appliqué. Ressources, charte, procédure visuelle, notes séries04/05 et maquettes20/21/22 ainsi que planches26/27/28/29/32 effectivement consultées et ouvertes. Les interfaces existantes sont réutilisées ; modèles, paramètres et payloads dérivés du contrat généré. Aucun changement backend, migration, contrat OpenAPI, types générés, packages, dépendances ou licences. L’administration reste limitée aux signalements : aucune gestion générale des utilisateurs, rôle public, candidatures privées ou Teranga Points.

## Environnement et préservation

Windows, Node24.15.0, pnpm10.34.6, Chrome headless installé, PostgreSQL17.11 natif Windows portable déjà disponible. Installation verrouillée réutilisée, dépendances inchangées. Aucun changement système, service payant ou nouveau conteneur. Le serveur PostgreSQL existant du lot13 sur127.0.0.1:55475 a été réutilisé sans redémarrage, avec **deux nouvelles bases** : jokkodev_lot14 et jokkodev_lot14_it. Noms effectifs et zéro objet applicatif contrôlés avant migrations. Pas de migration, seed destructif, nettoyage ou changement de rôle dans les bases de l’équipe/des lots précédents.

Frontend **http://127.0.0.1:33060**, backend **http://127.0.0.1:33061**, APP_ORIGIN/proxy/build alignés. Snapshot isolé .cache/lot14/runtime, sans écraser les builds des autres recettes. Les seuls serveurs arrêtés/recréés pour les builds et smoke sont ceux du lot14, vérifiés par PID/port. Chrome temporaire fermé. Les services du lot13 et autres processus existants ne sont ni arrêtés ni redémarrés. Transport email fichier local example.test ; aucun email à des tiers. Comptes, secrets, sessions, emails et scripts de pilote restent dans .cache/lot14 ignoré.

Administrateur de test inscrit normalement, email confirmé à partir du message local sans afficher le token, puis rôle attribué par la **commande du dépôt** admin:grant (CLI Nest construite). Une perte de rôle a été testée via admin:revoke, puis rétablie via admin:grant, uniquement sur ce compte dédié. Aucun rôle modifié par SQL et aucun compte de l’équipe utilisé. Les fixtures de contenu long, masquage temporaire et expiration concernent cette base seulement ; contenu/visibilité temporaire restaurés en finally. Les sanctions effectivement testées restent appliquées aux contenus/comptes jetables, sans réactivation cachée.

## Contrôles exécutés

| Contrôle | Résultat |
| --- | --- |
| Prisma validate/generate | Réussis |
| Migrations/rejeu, catalogue/rejeu | Réussis sur bases neuves dédiées, aucune migration en attente au rejeu |
| Génération OpenAPI/types | Réussie, sans différence |
| Lint, TypeScript | Réussis sur le code final |
| Tests backend | **10 réussis**, aucun échec/skip |
| Tests frontend/client/outillage | **85 réussis**, dont huit nouveaux tests lot14, aucun échec/skip |
| Intégration PostgreSQL | **85 réussis**, aucun échec/skip, sur jokkodev_lot14_it |
| Builds frontend/backend | Réussis, snapshot isolé |
| Smoke | Deux modes réussis : base inaccessible503 et base dédiée200 |
| Recette API lot14 | **11 groupes réussis**, vérifications réelles avec sessions distinctes |
| Navigateur | **8 groupes initiaux**, **9 complémentaires**, **8 finaux**, puis trois contrôles ciblés après build/libellés/brouillon réussis ; résultats finaux sans exception JavaScript |
| Production | Neuf aperçus /dev/* en404 ; administration sans données privées avant confirmation d’accès |

Les tests PostgreSQL restent réutilisables après les derniers changements purement frontend ; aucun backend modifié. Lint/types/tests/génération et build sont rejoués après les dernières corrections de présentation. Les preuves de commandes, codes de sortie et captures sont locales dans .cache/lot14 (*-checks.json et logs), exclues du dépôt.

Échecs rencontrés, non masqués : inférence TypeScript trop large du statut corrigée avec le type généré ; anciens tests de retour rejetant /admin adaptés aux routes désormais disponibles, tout en renforçant le rejet des segments de traversée et en conservant refus d’URL externe/query. Un pilote API attendait un booléen mais renvoyait une chaîne d’erreur400 : assertion corrigée, reprise au même point sans recréer les fixtures. Un pilote de double clic recherchait à nouveau un dialogue déjà fermé et a échoué après son premier clic ; l’écriture réelle a été relue, sans la rejouer. Le double clic a ensuite été contrôlé avec la même référence de bouton, sur une autre décision, avec exactement une requête et une action en base. Ces interruptions de pilote ne sont pas présentées comme des parcours produit réussis avant reprise. Avertissement Node MODULE_TYPELESS_PACKAGE_JSON conservé, sans changer les packages pour le supprimer.

## Comportements réels vérifiés

Signalements QUESTION, ANSWER et PROJECT réellement enregistrés ; aucun masquage automatique, doublon ouvert409. Visiteur401 et membre403 côté API administrateur ; au navigateur aucune requête privée avant confirmation du rôle. Listes OPEN/CLOSED, page2, totaux et détail réels. Validation du motif400 avec fieldErrors ; clôture NO_ACTION avec historique unique et contenu inchangé. Répétition de clôture409. Deux résolutions concurrentes : une seule transaction, l’autre REPORT_ALREADY_CLOSED ; relecture en lecture seule sans faux succès, résultat et focus conservés.

Question masquée : détail et réponses404 publics. Réponse acceptée masquée : solution retirée, question non résolue et réponse absente de la liste publique après relecture. Projet masqué : détail et nouvelle candidature404. CANNOT_SUSPEND_ADMIN laisse le signalement ouvert. Compte auteur fictif suspendu : session existante refusée et connexion refusée, mais son autre contenu non masqué reste public. Historiques et décisions relus via API et navigateur, pas seulement par une notification.

Perte contrôlée de la réponse d’un resolve **après transaction réelle** : statut CLOSED et exactement une action en PostgreSQL, message non confirmé, relecture GET explicite sans nouveau POST. Perte de la réponse d’un signalement **après insertion réelle** : exactement une ligne, état de réception incertaine et aucun renvoi automatique ; aucune route de lecture inventée pour le déclarant. Double soumission du formulaire et de la confirmation : une requête réelle chacune. CSRF volontairement invalide dans le pilote navigateur :403, saisie conservée, jeton renouvelé sans rejeu puis soumission explicite réussie.

Cible masquée entre ouverture et envoi :404 réel, consultation invalidée et ancien contenu retiré, fixture restaurée. Limitation provoquée sur un compte fictif distinct :429 réel, Retry-After reçu à travers le proxy et affiché, sans délai inventé. Expiration d’une session administrateur en base dédiée : toutes les lignes privées retirées. Révocation réelle du rôle via CLI : disparition des données, reconnexion membre explicitement refusée, rôle restauré par CLI pour la recette. Panne réseau de lecture simulée **uniquement dans le navigateur** : requête interrompue, anciennes lignes retirées, critères conservés, relecture explicite rétablit les vraies données ; aucun serveur arrêté pour ce scénario.

Motif ressemblant à du HTML et texte non sécable long : affichage échappé, aucun élément img ni exécution, aucun débordement aux quatre largeurs, fixture restaurée. Motifs/déclarants absents des projections publiques. Non-régression réelle : comptes/profil, JokkoHelp, projets, candidatures acceptées/appartenance et tableau de bord. Les résultats attendus ne sont jamais fournis par des fixtures de repli du produit.

## Revue visuelle et HTTP

12 captures finales réellement ouvertes : dialogue de signalement, liste et détail admin à **1440,768,390,320 px**. Comparaison aux maquettes effectuée après correction du titre du contenu dans le dialogue et du menu administrateur mobile. Captures complémentaires examinées : confirmation320, réception perdue, limitation429, motif long320, conflit, expiration et panne réseau. Anciennes captures intermédiaires conservées comme preuves de travail, sans les confondre avec les vues finales. Labels, erreurs associées, Tab/Maj-Tab, Échap, retour au déclencheur, focus de résultat, menu mobile et reduced-motion contrôlés. Footer/icônes provisoires historiques, absence de compteurs d’onglets non livrés et adaptations décrites dans le [guide](moderation-integration.md).

Ressources publiques masquées : **API404**, état visuel introuvable, **HTML initial200** observé pour question et projet après streaming. Ce comportement reste une limite ; aucune promesse de404 HTML faite. Une route admin rend initialement une garde anonyme, jamais le contenu privé. Appareils physiques, lecteurs d’écran, Linux et zoom navigateur réel200 % non validés.

## Accès et scénarios laissés disponibles

Connexion : http://127.0.0.1:33060/connexion. Identifiants dans **.cache/lot14/test-accounts.json** : admin, reporter, other, authorRecipe. author est le compte déjà suspendu pour preuve ; quota est le compte de limitation. Lire le fichier uniquement localement, ne pas copier ses secrets dans les rapports/captures.

- Administration : http://127.0.0.1:33060/admin/signalements
- Clôture sans sanction, encore ouverte : http://127.0.0.1:33060/admin/signalements/01a15355-014d-712f-96aa-b70fe9c9eec9
- Masquage, encore ouvert : http://127.0.0.1:33060/admin/signalements/01a15355-0134-72ba-b890-40eaca60d47f
- Suspension, encore ouverte : http://127.0.0.1:33060/admin/signalements/01a15355-0143-708e-bf2c-89dbc693c897
- Question non signalée par reporter pour nouvel envoi : http://127.0.0.1:33060/questions/01a15355-00cf-711b-9028-435001ba9123
- Projet encore visible : http://127.0.0.1:33060/projets/01a15355-00dc-7730-8070-2dcd323a6a16

authorRecipe est encore actif. La suspension affectera ses sessions mais ne masquera pas ses autres contenus, conformément au contrat. Les autres cibles jetables restent enregistrées dans le fichier local. Employer ces scénarios dédiés sans réinitialiser les bases et sans modifier les rôles de comptes de l’équipe. Les décisions de recette ne sont pas annulées artificiellement : l’état changera lors de la validation.

## Limites et intégration restante

Aucun nouveau défaut backend confirmé. L’absence d’un contrat de relecture/idempotence pour le déclarant limite la réconciliation d’un signalement dont la réponse est perdue ; ce point est documenté, pas contourné. Aucun raccordement des routes d’action directe/historique global, restauration, réactivation ou sanction non prévue. Les notifications/rafraîchissements temps réel interutilisateurs ne sont pas ajoutés : les vues se relisent à la navigation/focus selon leurs conventions.

SMTP réel, HTTPS complet, systemd, Datacloud, arbitrages de licences et contenus/coordonnées/assets définitifs restent ouverts. L’aptitude à la production n’est pas validée. Teranga Points exclue. La publication est autorisée après validation fonctionnelle ; la fusion reste exclue. Les artefacts locaux de recette, comptes, emails et captures sont exclus du commit.

## État final local

Frontend lot14 **PID45564/33060**, backend lot14 **PID50404/33061**, laissés actifs. Readiness backend et proxy, et page frontend :200. Serveur PostgreSQL réutilisé **PID43868/55475**, sans redémarrage et sans nouveau processus PostgreSQL créé par ce lot. Services lot13 **PID36320/33050** et **PID27044/33051** toujours actifs et répondant200 ; ancien backend lot12/33041 toujours503, cause non établie, aucune action corrective sur ces services. Aucun Chrome temporaire sur9271.

Huit nouveaux tests frontend ; le test de retour historique utilise désormais une route admin inconnue, tandis que les routes admin connues sont autorisées et les chemins de traversée sont explicitement rejetés. Le dernier avertissement obsolète sur /questions/actions est remplacé par l’orientation vers Signaler ; contrôle navigateur aux quatre largeurs et captures1440/320 examinées. Les libellés finaux de l’historique remplacent les identifiants techniques par la cible lisible ; le message de réception incertaine reste compréhensible sans exposer le contrat API dans le produit. Contrôle ciblé réel et captures finales examinés.

Résultats smoke et PostgreSQL réutilisés après ces derniers changements exclusivement frontend ; génération, lint, TypeScript, tests et builds rejoués sur l’état final. Backend, contrats et migrations inchangés. Aucun secret, compte de test, environnement réel, email, token, cache, log, build, binaire PostgreSQL ou capture ne fait partie des fichiers proposés. Les preuves et le patch complet restent locaux et ignorés. Index Git vide ; aucun commit, push, PR ou fusion.

Correction de recette finale : le motif et la décision sont désormais conservés dans le parent protégé du signalement pendant les relectures, et séparés par identifiant. Test réel au navigateur : resolve refusé en403 CSRF, choix/motif retrouvés après le GET privé, aucun rejeu automatique, nouvelle confirmation explicite avec une seule action en base ; autre signalement avec brouillon vide. Lint, TypeScript, génération,85 tests frontend,10 backend et builds ont été rejoués après cette correction. Capture lot14-decision-csrf-draft-390.png examinée.
