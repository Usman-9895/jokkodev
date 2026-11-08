# Notifications e-mail — résultats de recette locale

Lot préparé sur `feature/transactional-email-notifications`, depuis origin/develop `7fb6632518a1e0a82758510ae366f46aa62b075e`. Recette validée par l’utilisateur ; commit, push et PR autorisés. Revue backend indépendante, fusion, migration et activation de production restent distinctes. Aucune action de ce lot sur le VPS ou le domaine public.

Avant publication : vingt fichiers comparés à l’instantané du code testé, aucune différence. Documentation ensuite actualisée pour mentionner cette autorisation et ligne vide finale normalisée dans un modèle systemd, sans changement de configuration ou comportement ; preuves de recette réutilisées. E-mails, comptes, configurations privées, logs, builds et caches locaux restent exclus du commit.

## Résultats observés

- Installation pnpm 10.34.6 figée, verrou inchangé. Premier essai offline impossible (paquets absents), installation normale réussie. Aucune dépendance ajoutée. Client Prisma généré pour le nouveau modèle ; aucun changement OpenAPI, donc client HTTP généré inchangé.
- **Lint, TypeScript et build de production réussis**, contrôles finaux après le dernier changement de comportement. Logs hors Git `lint-final.log`, `types-final.log`, `build-final.log` dans `.cache/transactional-email/`.
- **19 tests backend réussis ; 149 tests Node réussis sur 150**, un saut Windows connu, aucun échec. Logs `test.log`. Frontend et PWA inchangés, leurs tests du dépôt restent inclus ; aucune nouvelle recette navigateur prétendue pour ce lot backend.
- **171 tests PostgreSQL réussis, zéro échec ni saut**, dont **9 scénarios de notifications**. Schémas temporaires isolés sur l’instance locale 127.0.0.1:5470, nettoyés après essais ; aucun schéma existant modifié. Log `integration.log`, tests versionnés `backend/test/transactional-email.integration.ts`.
- Nouvelle base dédiée `jokkodev_email_notifications` créée sans réutiliser une base existante ; les **neuf migrations**, dont `20261109090000_transactional_email_notifications`, appliquées avec `prisma migrate deploy`. Log `migration.log`. La base de recette persistante conserve les événements fictifs pour inspection opérateur.
- Deux e-mails réellement écrits via le MailService fichier après décisions HTTP réelles et commits PostgreSQL : événements APPLICATION_ACCEPTED et ACCOUNT_REACTIVATED en **SENT, une tentative chacun**. Texte et destinataire vérifiés ; titre du projet et lien espace dans l’acceptation, lien connexion dans la réactivation, aucun motif/message privé/contact dans les e-mails. Preuves `.cache/transactional-email/emails-recette/` et `recipe-results.json`.
- **7 contrôles de compatibilité de l’ancien backend** sur la base migrée et déjà notifiée : readiness, trois connexions fictives, répétition d’acceptation, lecture d’historique et états de file inchangés. Log `legacy.log`, résultat `legacy-results.json`. Il s’agit du backend compilé a55741e, pas d’un rollback systemd exécuté sur VPS.
- CLI réelle `status` : deux événements SENT, `inspect` vide après envoi réussi ; `process` sans `--execute`/activation refusé avec erreur expurgée. Aucun envoi n’est déclenché par la simple création du module API.

## Scénarios vérifiés en base et API réelles

1. Acceptation répétée : une décision, une adhésion et une ligne de file ; un seul e-mail au compte vérifié, pas de second envoi au passage suivant du worker.
2. Réactivation : quatre demandes concurrentes, **un 200 et trois 409**, un historique et un événement. Ancienne session refusée, nouvelle connexion réussie. Motif absent du message.
3. Acceptation concurrente : quatre réponses 200 suivant le comportement idempotent existant ; un événement. Quatre workers concurrents : une seule invocation du transport pour cet événement.
4. Absence de vérification d’adresse : les deux types d’événement SKIPPED/UNVERIFIED_ADDRESS. Vérification retirée après mise en file : aucun envoi au traitement.
5. Refus temporaire 451 : cinq tentatives espacées par horloge de test, puis FAILED ; pas d’annulation de décision. Timeout après DATA et réservation périmée : UNCERTAIN, aucun rejeu. Les erreurs et contenus injectés ne figurent pas dans l’inspection opérateur.
6. SMTP réellement indisponible sur un port loopback fermé : file non envoyée, acceptation conservée et compte réactivé encore connectable. Cette panne de connexion ne constitue pas un essai de remise à un fournisseur SMTP externe.
7. Transport fichier réussi puis erreur SQL lors de l’écriture SENT : événement laissé SENDING, récupéré en UNCERTAIN après délai ; pas de second envoi.
8. Trigger local refusant l’insertion dans la file : annulation de l’acceptation/adhésion ou de la réactivation. Après suppression du trigger de test, parcours normaux utilisables.
9. Collecte désactivée, index unique natif PostgreSQL, expiration après sept jours et purge des événements anciens.

Le premier passage ciblé a rencontré la limite de cinq créations de projet pour le compte responsable fictif partagé ; compteur isolé entre scénarios via le service de test, protection produit inchangée. Deuxième passage 8/8, puis ajout du neuvième scénario de perte de persistance et passage 9/9, enfin suite complète 171/171. Les échecs initiaux ne sont pas présentés comme des réussites.

## Reproduction et limites

Voir le [guide d’exploitation et de recette](transactional-email-notifications.md) pour les commandes locales, la migration, les droits, les activations séparées, les reprises, la conservation et le retour arrière. Les chemins `.cache/transactional-email/` sont locaux, ne font pas partie du commit à préparer et ne seront pas des liens d’artefacts disponibles sur GitHub.

Pas de fournisseur SMTP externe, boîte réelle ou garantie de réception unique testés. Les erreurs 451 et les résultats après DATA sont injectés au niveau du transport ; la panne de connexion est réelle et locale. Le test de réservation périmée simule l’état après crash et avance l’horloge ; il ne tue pas un worker pendant une transaction SMTP réseau réelle. Les unités/timers systemd sont préparés, non installés ni activés ; leurs permissions/credentials de production devront être vérifiés au futur déploiement. Les rôles SQL de production ne sont pas ceux du superutilisateur fictif local utilisé pour préparer les schémas et triggers d’essai. Aucun nouveau résultat GitHub Actions pour ce worktree non publié.

La conservation de 30 jours dépend de l’exécution surveillée des lots de purge. Un résultat SMTP incertain n’est jamais silencieusement rejoué : examen opérateur nécessaire. SMTP peut encore livrer en double malgré un Message-ID stable et une file dédupliquée ; aucune promesse d’exactement une réception.
