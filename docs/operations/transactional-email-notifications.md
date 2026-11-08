# Notifications transactionnelles — livraison locale

Branche `feature/transactional-email-notifications`, base origin/develop revérifiée `7fb6632518a1e0a82758510ae366f46aa62b075e`. Intervention backend explicitement demandée, recette validée par l’utilisateur et publication en PR autorisée. Revue Serge indépendante à prévoir avant fusion. Migration et activation de production restent des étapes distinctes ; aucun accès VPS ou déploiement de ce lot.

## Décisions et confidentialité

Deux événements seulement : candidature passant de PENDING à ACCEPTED ; compte passant de SUSPENDED à ACTIVE par une nouvelle décision de réactivation. L’écriture de `EmailNotification` se fait dans **la même transaction** que la décision, l’adhésion ou l’historique. Une erreur d’écriture annule la transaction. Un échec SMTP intervient plus tard et ne remet jamais la décision en cause.

Index unique `decisionKey` : `application:<id candidature>` ou `reactivation:<id décision administrative>`. Répétition identique d’une acceptation ne réinsère rien ; répétition d’une réactivation déjà faite reste un conflit. Les décisions concurrentes suivent les verrous/mises à jour conditionnelles existants. Une nouvelle suspension puis réactivation est une nouvelle décision et peut produire une nouvelle notification.

Collecte **désactivée par défaut**, variable API `NOTIFICATION_EVENTS_ENABLED=0`. Après activation à `1`, seuls les nouveaux changements d’état sont enregistrés ; aucun balayage historique ou rattrapage implicite. Arrêter le worker seul n’arrête pas cette collecte.

À la décision, absence de compte/adresse vérifiée : état terminal **SKIPPED / UNVERIFIED_ADDRESS**. L’adresse n’est pas copiée dans la file. À l’envoi, nouvelle lecture de l’adresse de compte et de sa vérification ; compte suspendu ou projet masqué/supprimé depuis l’acceptation : notification ignorée. L’adresse vérifiée courante du même compte est utilisée. La file contient seulement identifiants techniques, type, titre de projet public au moment de la décision, dates/état/reprises. Le lien destinataire est construit depuis `APP_ORIGIN` validé, jamais depuis une requête HTTP. Aucun motif administratif, message de candidature ou contact de collaboration dans l’e-mail. Aucun secret de session, lien à jeton ou contact enregistré dans la file.

E-mails texte : acceptation avec nom du projet et `/espace/projets` ; réactivation avec `/connexion` et nécessité d’une nouvelle session. Les anciennes sessions restent révoquées, les décisions de contenu inchangées. Pas de changement du contrat HTTP, du client généré, du frontend ou de la PWA. Aucune dépendance ajoutée ; Nodemailer existant réutilisé.

## Traitement, reprises et incertitude

Aucun traitement au démarrage de l’API. CLI séparée `pnpm notifications`, mode `status` par défaut. Connexion dédiée **NOTIFICATION_DATABASE_URL**, nom et hôte/port à confirmer explicitement pour chaque commande. `process`, `prune` et `resolve` exigent à la fois `NOTIFICATION_WORKER_ENABLED=1` et `--execute`. Les confirmations contrôlent les erreurs de destination ; elles ne remplacent pas les permissions SQL.

Chaque traitement réserve une ligne via **FOR UPDATE SKIP LOCKED**, écrit SENDING et un jeton de réservation, puis commit **avant SMTP**. La finalisation est conditionnée au jeton et à l’état. Deux traitements ne peuvent pas réserver simultanément la même ligne. `SENT` signifie remise au transport, pas réception effective par la boîte destinataire.

- Au maximum **5 tentatives**, pendant **7 jours** depuis l’événement. Refus SMTP explicite 4xx ou erreur connue avant connexion : délais de 1 minute, 5 minutes, 30 minutes et 2 heures. Pas de boucle immédiate ni d’envoi depuis le retour HTTP de décision.
- Réponse SMTP négative 5xx : FAILED. Épuisement : FAILED / ATTEMPTS_EXHAUSTED. Âge dépassé : FAILED / EXPIRED.
- Timeout après DATA, erreur non classée, ou réservation SENDING abandonnée depuis plus de 5 minutes : **UNCERTAIN / OUTCOME_UNKNOWN**. Aucun renvoi automatique. Un crash avant SMTP peut donc aussi devenir incertain : priorité à l’absence de rejeu aveugle.
- Si le transport réussit mais l’écriture de SENT échoue, la ligne reste SENDING puis devient UNCERTAIN. Le worker ne réinterprète pas l’échec SQL comme un refus SMTP.
- Délais du transport bornés : connexion/greeting 10 s, socket 30 s. Le MailService partagé applique aussi ces bornes aux autres e-mails de compte ; tests du socle rejoués. Message-ID stable par événement pour faciliter l’enquête, **sans garantie de déduplication ou de réception unique SMTP**.

`status` affiche des compteurs par type/état/code ; `inspect` liste au plus 100 événements terminaux problématiques avec ID, type, dates et tentatives, sans adresse, titre ou contenu. Les erreurs du programme donnent un événement générique, jamais l’erreur SMTP brute. La CLI ne journalise pas les URLs de base, destinataires ou corps.

Pour un UNCERTAIN, rapprocher l’heure et le Message-ID `<notification-ID@domaine APP_ORIGIN>` des traces protégées du prestataire. Après examen humain seulement : `resolve --id UUID --resolution sent --execute`, ou `--resolution abandoned`. Ces commandes ne renvoient aucun e-mail. Une résolution `sent` est une déclaration opérateur, pas une vérification automatique de réception. Si le résultat demeure inconnu, conserver l’incertitude et ne pas fabriquer une nouvelle notification pour la même décision.

## Conservation

Les événements terminaux sont éligibles à suppression **30 jours après leur création**, y compris SKIPPED, FAILED et UNCERTAIN. `prune` récupère les réservations périmées et expire les PENDING anciens, sans envoyer d’e-mail, puis supprime au plus 1 000 lignes par invocation. Une réservation encore active n’est jamais supprimée. Le timer de purge horaire est distinct du timer d’envoi. Contrôler le volume et les lignes anciennes : un lot plein impose une fréquence ou des lots supplémentaires bornés ; l’absence de timer ou un échec de purge peut prolonger la conservation. Pas de conservation indéfinie volontaire des incertitudes ; l’opérateur dispose de la fenêtre avant purge pour son examen.

Les journaux système doivent garder la rotation de 30 jours du VPS. Les dumps chiffrés conservent leur rétention existante ; aucune modification/purge de sauvegarde dans ce lot. Les fichiers mail ne sont utilisés qu’en local/test et doivent être nettoyés après validation ; jamais exposés par le serveur web ni committés.

## Migration et déploiement futur (non exécuté)

Migration additive **`20261109090000_transactional_email_notifications`** : nouvelle table, index unique de décision, index de traitement/conservation, contraintes de type/état/tentatives et FK User avec SET NULL à suppression. Aucun enum existant modifié, aucune décision historique transformée. Ancienne API compatible avec la présence de cette table ; elle n’y écrit pas.

1. Revue, autorisation de déploiement/migration séparée, SHA exact, processus réellement actifs, sauvegardes PostgreSQL/fichiers réussies et empreintes vérifiées. Vérifier base `jokkodev` sur `127.0.0.1:5432`, migrations et propriété de User.
2. Préparer une release détachée, pnpm figé, génération Prisma/build et permissions. Appliquer **prisma migrate deploy** avec le rôle migrateur propriétaire de schéma et droits REFERENCES sur User/historique Prisma, jamais `db push`. Vérifier checksum, table/contraintes/index et absence d’échec partiel avant activation. Ne pas migrer avec le rôle applicatif.
3. Accorder à `jokkodev_app` SELECT/INSERT sur la nouvelle table, sans DDL. Un rôle worker distinct, non superutilisateur, reçoit SELECT/UPDATE/DELETE sur EmailNotification, SELECT(id,email,emailVerifiedAt,status) sur User et SELECT(id,visibility,deletedAt) sur Project. Aucun droit DML sur l’historique Prisma ni écriture sur décisions/membres. Vérifier les privilèges effectifs. Les rôles de migration, API et traitement restent distincts.
4. Activer la nouvelle API avec `NOTIFICATION_EVENTS_ENABLED=0`. Vérifier disponibilité et parcours de décision. Pour le worker, créer explicitement `/opt/jokkodev/notifications` comme lien vers **la release backend vérifiée**, indépendamment du lien current du web. Le répertoire de travail des unités est `/opt/jokkodev/notifications/backend` ; il n’est pas déduit de la release frontend active.
5. Préparer `/etc/jokkodev/notifications.env` protégé root avec configuration mail/APP_ORIGIN de production, NOTIFICATION_DATABASE_URL du rôle dédié et NOTIFICATION_WORKER_ENABLED=1. Ne pas copier un fichier local. Installer/revoir les quatre modèles `infra/systemd/jokkodev-notifications*`, leurs chemins et permissions, sans activer les timers automatiquement. `status` et `inspect` permettent d’examiner la file sans envoi. Les identifiants ne sont pas passés en argument de commande.
6. Au moment explicitement retenu, mettre `NOTIFICATION_EVENTS_ENABLED=1` dans la configuration API et redémarrer l’API. À partir de là, nouvelles décisions seulement. Activer séparément le traitement et la purge : `systemctl enable --now jokkodev-notifications.timer jokkodev-notifications-prune.timer`. Vérifier les compteurs et premiers événements autorisés. `OnUnitInactiveSec` empêche le chevauchement normal d’une même unité ; le verrou SQL protège aussi plusieurs invocations indépendantes.

Exemples de commandes, depuis le backend de la release avec environnement protégé déjà chargé par l’opérateur :

```sh
pnpm notifications status --confirm-database jokkodev --confirm-host 127.0.0.1:5432
pnpm notifications inspect --batch 50 --confirm-database jokkodev --confirm-host 127.0.0.1:5432
pnpm notifications process --batch 20 --execute --confirm-database jokkodev --confirm-host 127.0.0.1:5432
pnpm notifications resolve --id UUID --resolution abandoned --execute --confirm-database jokkodev --confirm-host 127.0.0.1:5432
```

## Désactivation et retour arrière

Arrêter les timers d’envoi et de purge avant bascule : `systemctl disable --now jokkodev-notifications.timer jokkodev-notifications-prune.timer`. Attendre la fin d’une unité en cours avec borne ; si arrêt forcé, conserver SENDING pour récupération en UNCERTAIN, jamais le remettre silencieusement en PENDING. Ne pas démarrer une nouvelle unité pendant l’enquête SMTP.

Couper la collecte API (`NOTIFICATION_EVENTS_ENABLED=0`) et redémarrer la version appropriée. On peut ensuite rétablir les chemins web/API réellement actifs avant le lot en conservant la table, ses reçus et l’historique. Ne pas faire de down migration ni restaurer la base : une restauration pourrait perdre des décisions récentes. Le lien notifications reste protégé et ses timers arrêtés ; éviter qu’il suive automatiquement un rollback frontend.

Une reprise ultérieure du worker n’envoie que les PENDING encore admissibles ; les UNCERTAIN restent bloqués. Les décisions prises pendant une désactivation de collecte n’engendrent pas de rattrapage automatique. Une fois l’envoi stabilisé, reprendre la purge indépendamment pour ne pas dépasser la conservation retenue. Aucune session révoquée n’est restaurée. Ces étapes sont documentées, pas exécutées sur le VPS.

## Recette locale reproductible et preuves

Base dédiée **127.0.0.1:5470/jokkodev_email_notifications**, créée sans réutiliser une base existante. Neuf migrations appliquées avec `prisma migrate deploy`, journaux `.cache/transactional-email/migration.log`. Suite d’intégration : schémas temporaires dans la base de test locale, jamais le schéma de production. Transport file pour les messages, et SMTP loopback refusé pour la panne réelle.

Depuis la racine du dépôt :

```powershell
node .cache/transactional-email/run-tests.cjs
node .cache/transactional-email/run-all-pg.cjs
node .cache/transactional-email/repeat-recipe.cjs
node .cache/transactional-email/run-cli.cjs status
node .cache/transactional-email/run-cli.cjs inspect
```

Les harnais locaux lisent les credentials fictifs dans `.cache/transactional-email/runtime/private.json`, ignoré par Git, et confirment la destination loopback dédiée avant traitement. La CLI locale en mode process exige aussi `--execute`. Les comptes et données sont exclusivement fictifs. `repeat-recipe.cjs` crée un nouveau trio de comptes fictifs suffixés, accepte une candidature, suspend/réactive son titulaire, puis traite les deux événements avec MailService fichier ; aucun e-mail externe. Il remplace les deux fichiers de preuve locale : `.cache/transactional-email/emails-recette/candidature-acceptee.txt` et `compte-reactive.txt`. Destinataire fictif `notification_membre...@example.test`, projet « Jardin partagé — Projet de recette », liens locaux `/espace/projets` et `/connexion`. Ce ne sont pas des réceptions de boîtes externes. La base dédiée et les modèles de messages restent disponibles ; aucune session de production n’est utilisée.

Les tests `backend/test/transactional-email.integration.ts` couvrent destinataire/contenu/liens, répétitions, réactivation concurrente, acceptation concurrente, travailleurs concurrents, absence de vérification à la décision et à l’envoi, 5 refus temporaires, timeout après DATA, réservation abandonnée, perte de persistance après remise au transport, vraie connexion SMTP refusée, annulation atomique si l’événement ne peut pas être écrit, collecte désactivée, index unique, expiration et purge. La suite existante vérifie également les protections de session/CSRF et les parcours de décision. Résultats définitifs dans le rapport de vérification associé ; ne pas confondre ces essais locaux avec une exécution en production ou GitHub Actions.
