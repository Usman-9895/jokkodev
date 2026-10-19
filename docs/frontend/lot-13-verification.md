# Recette du lot 13 — tableau de bord et candidatures

19 octobre 2026. Base develop **a74dce30a5ddb654bae2d9b041927693d17756c9**, branche **feature/frontend-dashboard-applications-integration**. Recette fonctionnelle validée par Ousmane. Publication du commit et de la branche, puis PR vers develop autorisées ; aucune fusion autorisée. Les constats techniques ci-dessous décrivent les contrôles avant publication.

## Préparation

Instructions, README, décisions, guides historiques et guide API lus ; skill jokkodev-ui-fidelity appliqué. Charte, ressources, notes, maquettes 06/12/17/18/30 et planches 26 à 32 effectivement ouvertes. PR du lot 12 retrouvée : #23, fusionnée ; sa tête 79da7297bc30ceaebc05972e7e88d365200192e7 est ancêtre du develop utilisé. Le commit propre de #19 (75c34d36422b9c2077c72c747c6bda8f63fe6916) n’est pas ancêtre. Dossier initial propre ; récupération distante, avance rapide de develop uniquement et création de branche, sans reset/rebase. Aucun backend, migration, package, verrou ou contrat généré modifié.

## Environnement dédié et préservation

Windows, Node24.15.0, pnpm10.34.6, Chrome headless installé. Installation verrouillée existante réutilisée, dépendances inchangées. Le moteur Docker est devenu injoignable pendant la préparation ; la création d’un nouveau conteneur a échoué. L’ancien backend lot12 a ensuite répondu503 (frontend33040 encore200). Cause non démontrée ; aucun redémarrage/arrêt de Docker ou des services/containers de l’équipe. Aucune donnée antérieure effacée ou seed destructif exécuté.

Solution indépendante : PostgreSQL **17.11 natif Windows**, binaires portables [EDB](https://www.enterprisedb.com/download-postgresql-binaries) (archive officielle postgresql-17.11-5-windows-x64-binaries.zip), dans .cache/lot13/postgresql. Empreinte locale conservée dans postgres-download.json ; elle ne constitue pas une vérification indépendante de signature. Aucun service Windows, PATH global, configuration système ou service payant ajouté. Pas de validation Linux revendiquée.

Cluster neuf .cache/lot13/pgdata, écoute127.0.0.1:55475 ; bases **jokkodev_lot13** et **jokkodev_lot13_it**. Destination réelle et absence d’objets applicatifs vérifiées avant les migrations. Les fixtures, masquages, expiration et données privées de test concernent exclusivement ces bases. Données de recette conservées ; champs de contenu long et visibilité temporairement modifiés sont restaurés en finally. Aucun objet de l’équipe utilisé. Le lancement pg_ctl avait gardé le pipe du programme d’initialisation ouvert : seul ce Node temporaire a été arrêté après vérification de PostgreSQL, sans arrêter le cluster.

Build et serveurs isolés dans .cache/lot13/runtime ; builds et processus des lots précédents préservés. Frontend **http://127.0.0.1:33050**, backend **http://127.0.0.1:33051** ; APP_ORIGIN, proxy et build cohérents. Transport email fichier local example.test ; aucun tiers. Secrets uniquement dans les fichiers ignorés env.json/pg.env/test-accounts.json/mail. Le cluster et les deux serveurs lot13 restent disponibles ; PID exacts dans postgres-process.json, frontend-process.json et backend-process.json. Seuls les serveurs possédés par cette mission ont été redémarrés pour build/panne contrôlée. Chrome temporaire fermé après chaque revue.

## Contrôles exécutés

| Contrôle | Résultat réel |
| --- | --- |
| Prisma validate/generate | Réussis |
| Migrations et rejeu | Réussis sur base vide dédiée, puis aucune migration en attente |
| Catalogue et rejeu | Réussis, aucun seed de démonstration destructif |
| Génération OpenAPI/types | Réussie, sans différence ; rejouée après correction finale |
| Lint / TypeScript | Réussis après correction finale du focus |
| Tests backend | **10 réussis**, zéro échec/skip |
| Frontend/client/outillage | **77 réussis**, dont neuf nouveaux tests lot13, zéro échec/skip |
| Intégration PostgreSQL | **85 réussis**, zéro échec/skip, PostgreSQL Windows dédié |
| Builds frontend/backend | Réussis dans le snapshot isolé ; reconstruits après correction finale |
| Smoke | Deux modes réussis : indisponible503 et base dédiée200 ; contrôles de cookies, CSRF, proxy et garde du rendu privé conservés |
| API réelle spécifique lot13 | **13 groupes réussis**, trois comptes et sessions indépendants |
| Navigateur réel | **10 groupes initiaux**, **9 supplémentaires**, **6 finaux**, sans exception JavaScript dans les résultats finaux |
| Production | Les neuf /dev/* répondent404 ; aucune donnée privée dans le HTML anonyme de /espace |

Le smoke a d’abord échoué sur son ancien titre attendu « Espace développeur ». Son assertion suit maintenant « Tableau de bord » et vérifie en plus l’attente de session et l’absence de compteurs privés dans le HTML anonyme. Les deux modes ont ensuite réussi. Résultats PostgreSQL et smoke réutilisés après les derniers changements exclusivement frontend (onglets, textes, focus et composition) ; backend/contrat inchangés. Lint, types, tests, génération et builds rejoués sur le code final.

Une première automatisation navigateur a interrompu sa lecture avant l’ouverture asynchrone du dialogue ; le pilote a été corrigé pour attendre dialog[open], puis repris sans nouvelle soumission. La revue finale a ensuite révélé une sortie du focus en fin de cycle Tab : boucle explicite ajoutée au dialogue produit, reconstruction et nouveau contrôle Tab/Maj-Tab, Échap et retour au déclencheur réussis. Aucun test de sécurité assoupli pour obtenir un succès.

Les neuf tests ajoutés couvrent statuts/permissions, message et limites, projection minimale d’un projet indisponible, critères/liens, verrou des doubles soumissions et relecture après perte réseau, réponse idempotente et incomplète, requêtes réellement construites et destinations de retour sûres. Détails des commandes et sorties dans .cache/lot13/logs et fichiers *-checks.json, ignorés ; ils ne sont pas des documents à publier.

## Parcours réels

Inscription de trois comptes fictifs, puis quatrième compte sans activité ; création de projets dédiés distincts pour acceptation, refus, retrait, fermeture et masquage. Envoi, lecture après rechargement et listes candidat/responsable globale/par projet concordantes. Recherche locale de carte au-delà d’une page évitée : pagination serveur et vue par projet. Filtres de statut et page2 réellement vérifiés pour les listes envoyées et reçues.

Refus du doublon, du propre projet, d’une nouvelle demande d’un membre et de la nouvelle demande après refus/retrait. Responsable seul autorisé aux décisions ; tiers et administrateur de fixture ne lisent ni ne traitent les demandes privées, rôle de fixture restauré. Refus métier conservant la session. Acceptation transactionnelle vérifiée par API, SQL et membres après rechargement ; une seule adhésion, répétition idempotente200. Refus et retrait sur scénarios séparés. Recrutement fermé : nouvelle demande refusée, ancienne en attente acceptée. Concurrence acceptation/retrait : un seul résultat terminal, autre opération409 sans faux succès.

Projet masqué : projection minimale côté candidat, pas d’ancien titre/lien/owner réaffiché, route publique404 et demandes du responsable non exposées. Validation400 structurée, refus anonyme401 ; aucun message privé dans le détail public ou le profil. Dashboard et Mes projets rejoints concordent avec les décisions et les données réelles après rechargement. Non-régression : comptes/profil, création question/réponse, acceptation/retrait de solution JokkoHelp et consultation/gestion JokkoProjects.

Contrôles navigateur supplémentaires autour de transactions backend réelles : réponse PATCH perdue après enregistrement, puis relecture GET sans nouvelle écriture ; réponse POST perdue avec exactement une candidature en base, puis viewerApplication réel sans renvoi. Interception de test d’un jeton CSRF invalide :403, renouvellement, aucune mutation rejouée ; action explicite suivante réussie. Projet devenu masqué entre saisie et POST :404 et aucune candidature créée. Expiration réelle d’une session de test : vues privées retirées. Backend lot13 réellement arrêté puis relancé seul : panne explicite, aucun repli fictif, reprise par action utilisateur. Aucun affaiblissement CSRF ou de la sécurité backend.

## Revue visuelle

24 captures finales réellement ouvertes : dashboard, envoyées, reçues globales, reçues d’un projet, détail privé et formulaire à **1440,768,390,320 px**. Aucun débordement de page mesuré. Captures additionnelles : confirmation320, dashboard vide, demandes vides, contenu non sécable de1000 caractères aux quatre largeurs, conflit, perte de réponse, expiration et panne. Confirmation, vide, contenu long320, conflit et erreurs également examinés visuellement. Clavier/lien d’évitement, menu Échap, focus de résultat après disparition de carte et préférence reduced-motion vérifiés. Pas de lecteur d’écran, appareil physique, Linux ou zoom navigateur réel200 % testé.

Réutilisation des styles et maquettes validés, avec adaptations expliquées dans le [guide](dashboard-applications-integration.md) : sous-navigation envoyées/reçues, détail privé, totaux disponibles uniquement, pseudonymes et dates réels. Illustrations/icônes/footer historiques restent provisoires. L’ancien ordre des membres lorsque les dates sont égales n’est pas corrigé dans ce lot. Les captures sont locales, dans .cache/lot13/screenshots, exclues des changements publiables.

## Accès de recette

Ouvrir http://127.0.0.1:33050/connexion. Identifiants dans **.cache/lot13/test-accounts.json**, clés **owner**, **second**, **third**, **empty** ; lire localement le fichier, ne pas le copier dans un rapport ou une capture. Compte owner = responsable ; second/third = candidats/membres selon projet ; empty = zéro activité.

- Dashboard : http://127.0.0.1:33050/espace
- Envoyées : http://127.0.0.1:33050/espace/candidatures
- Reçues globales : http://127.0.0.1:33050/espace/candidatures?vue=recues
- Projet neuf ouvert, aucun de ces candidats n’a encore postulé : http://127.0.0.1:33050/projets/01a151d8-4eda-76ec-968f-d9a2a8156c94
- Demande laissée en attente, connexion owner : http://127.0.0.1:33050/espace/projets/01a151d4-7de8-747a-b501-68f8eec52eb3/demandes
- Détail laissé en attente : http://127.0.0.1:33050/espace/candidatures/01a151d8-4ec0-7581-8d75-b72849b5a13a

Les autres projets distincts et leurs identifiants restent dans le fichier local. L’unicité est réelle : employer un projet encore vierge pour chaque nouvelle candidature, pas une réinitialisation des données. Le quatrième compte permet de tester une nouvelle candidature sans toucher aux anciennes. L’état de la recette évoluera après les décisions d’Ousmane.

## Réserves

Aucun nouveau défaut backend confirmé dans ce lot. Signalements/modération restent non raccordés ; Teranga Points exclue. Les pages publiques inconnues peuvent garder un HTML initial200 avec streaming malgré une réponse API404 : constat conservé, non présenté comme corrigé. SMTP réel, HTTPS complet, systemd, Datacloud, licences et validations des textes/coordonnées/assets restent ouverts. Le binaire PostgreSQL portable sert seulement à la vérification locale et n’est pas livré dans le dépôt. L’aptitude à la production n’est pas validée. Aucun commit, push, PR ou fusion effectué.

## État final local

Frontend lot13 PID36320 (33050), backend lot13 PID27044 (33051) et PostgreSQL PID43868 (55475), tous laissés actifs. Dernier contrôle HTTP : frontend200, readiness backend200. Aucun Chrome temporaire sur9261. Ancien lot12 : PID40376/39056 toujours actifs, frontend33040 répond200 et readiness33041 répond503 ; aucun arrêt/redémarrage de ces processus par cette mission.

Audit final : 23 fichiers utiles modifiés/nouveaux, index Git vide, HEAD/base inchangé, aucune modification étrangère initiale. Backend, packages, verrou et contrat généré inchangés. Source frontend identique au snapshot construit et examiné. Vérification des secrets connus, tokens emails locaux et motifs de clés : aucun trouvé dans les fichiers proposés. Diff sans erreur d’espacement ; patch complet local .cache/lot13/lot13.patch, vérification inverse réussie, non publié. Fichiers de comptes, environnements, cluster, outils, emails, logs, captures et scripts temporaires restent ignorés.
