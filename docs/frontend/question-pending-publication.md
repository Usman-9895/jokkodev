# Lot F2 — mise en attente locale d'une question

Worktree : `D:\DEV\JokkoDev\.cache\question-pending\worktree`, branche `feature/question-pending-publication`, base `8f1ff453858a58ba0c46479e5bc2d2aaf6a75094`. Recette validée par Ousmane ; commit, push et PR vers develop autorisés. Aucun accès VPS, fusion, migration de production ou déploiement dans cette publication. [Décision 010](../decisions/010-question-pending-publication.md), [rapport](question-pending-publication-verification.md).

## Parcours et conservation

Le formulaire propose deux actions locales distinctes : enregistrer le **brouillon F1**, éditable/incomplet, ou **Mettre en attente sur cet appareil**, qui conserve une copie validée et figée. Une seule attente par compte/profil/origine ; le brouillon demeure indépendant. Une coupure après ouverture vérifiée n'empêche pas l'enregistrement local. Après fermeture, revenir en ligne et vérifier sa session avant de retrouver la copie.

La copie peut être relue puis envoyée uniquement par action explicite. Un retour réseau seul ne fait rien. La publication directe est bloquée tant qu'une attente existe. Après réponse perdue, **Reprendre le même envoi** réutilise exactement clé et contenu, même après rechargement. Seul le serveur confirme la publication et son lien. L'attente confirmée est retirée par **Terminer cette attente** ; une autre saisie non enregistrée reste protégée par le dialogue de navigation. Une suppression locale ne supprime aucune question du serveur.

**7 jours depuis la mise en attente**, sans prolongation, **256 Kio maximum** par copie (JSON UTF-8 avec métadonnées). Après échéance, contenu retiré à l'accès vérifié, repère minimal conservé jusqu'à un retrait explicite après vérification de Mes questions. Une tentative incertaine n'obtient jamais automatiquement une nouvelle clé. Une perte/refus du stockage ne prouve pas l'échec serveur : vérifier ses publications avant de recommencer. En cas de lecture impossible, la publication directe du formulaire est aussi bloquée pour éviter de contourner une attente invisible.

Identité, relecture de session, changement d'onglet et limites de coupure totale suivent [F1](question-local-drafts.md). L'expiration serveur survenue pendant une coupure totale ne peut être connue immédiatement. Aucun accès après fermeture hors ligne, chiffrement local, partage entre appareils ou garantie de conservation malgré éviction du navigateur. Les cookies et jetons restent hors de la base locale. Les profils/outils développeur ne constituent pas une frontière contre une personne ayant accès à l'appareil.

## Aperçu et recette manuelle

**http://127.0.0.1:3530/questions/poser** — frontend de production, API réelle locale en développement **3531**, PostgreSQL dédié **127.0.0.1:5460 / jokkodev_f2**, conteneur `jokkodev-f2-postgres`, volume `jokkodev-f2-data` étiquetés F2. Emails fichier uniquement, sans SMTP. Cookies HTTP non Secure limités à cette recette ; exigences HTTPS de production inchangées. Aucun autre service arrêté. Les accès fictifs se consultent localement dans `.cache/question-pending/runtime/comptes-recette.txt` ; ne pas les publier.

1. Se connecter avec A et ouvrir le formulaire en ligne. Remplir les champs et une technologie. Couper le réseau dans cet onglet, puis mettre en attente ; attendre la confirmation locale. Rétablir le réseau : aucun envoi ne doit partir.
2. Fermer puis rouvrir le formulaire en ligne. La copie doit apparaître après vérification de session, sans remplir automatiquement les champs. Relire son texte et son code. Modifier les champs : la copie figée ne change pas.
3. Choisir Envoyer. Après confirmation, consulter le lien puis terminer l'attente. Seule la version correspondante du brouillon F1 est retirée après succès ; un brouillon plus récent reste intact.
4. Pour une réponse perdue, utiliser le harnais local, qui laisse le POST créer la question puis coupe sa réponse. Recharger et reprendre : même clé, même payload, même identifiant, une question en base. Aucun scénario de ce type sur une base réelle sans autorisation.
5. Se connecter avec B ou se déconnecter dans un autre onglet du même profil. Le contenu A doit disparaître. A et B conservent chacun leur copie, accessible seulement après leur propre vérification de compte. Les scripts testent aussi une vraie expiration SQL des sessions fictives.
6. Stockage refusé/plein : le harnais injecte SecurityError/QuotaExceededError sans remplir le disque ; pas de faux succès, saisie conservée. Une horloge de fixture teste exactement sept jours, sans attendre réellement une semaine et sans modifier l'horloge système.
7. La mise à jour PWA attend le membre. Annuler garde la saisie ; enregistrer le brouillon distinct avant de confirmer le rechargement permet de le reprendre. L'attente figée et sa clé restent conservées. Les trois guides demeurent publics et disponibles 24 h selon le lot E ; aucun formulaire ou envoi n'est dans CacheStorage.

Scripts privés de recette : `.cache/question-pending/{browser-review,extra-review,f1-review,final-checks,run-smoke}.cjs`. Résultats et galerie : `.cache/question-pending/verification/`. Identités et données exclusivement fictives ; captures et caches exclus de Git. Manifeste des seuls PID F2 : `runtime/processes.json`. Les proxies temporaires de recette sont fermés ; l'aperçu et la base F2 restent disponibles.

## Futur déploiement (non exécuté)

1. Vérifier SHA fusionné, diff réel, release active et destination PostgreSQL. Effectuer et valider les sauvegardes. Aucune commande visant une base existante dans cette livraison locale.
2. Préparer la release détachée, installation figée, génération Prisma et build selon le runbook existant. Appliquer **la migration additive** sur la destination explicitement vérifiée/autorisée avant le nouveau code API. Jamais `db push`, seed de comptes ou nettoyage de données en déploiement. Revoir avec Serge les droits DDL et la conservation de reçus.
3. Vérifier permissions et cache `.next`, préparer rollback, basculer atomiquement puis redémarrer **API et web**. Nginx, CSP, HSTS, timer SESSION/TOKEN et périmètre du worker inchangés. Ne pas remplacer nginx par un modèle.
4. Recette HTTPS avec compte autorisé : mise en attente, coupure/reprise, même clé après réponse perdue, isolation, trois guides, cache et headers. Une question créée par recette exige une autorisation distincte ; les preuves locales couvrent déjà le commit atomique et la concurrence.
5. Planifier la purge minimale après revue : **aucun timer ajouté**. Elle ne modifie pas la rétention des sessions. Avec l'URL fournie via l'environnement privé, sans l'afficher :

```sh
# PUBLICATION_RETENTION_DATABASE_URL déjà défini par un mécanisme privé validé.
pnpm publications:prune simulate --confirm-host '<hôte:port vérifié>' --confirm-database '<base vérifiée>' --batch 100
pnpm publications:prune execute --confirm-host '<hôte:port vérifié>' --confirm-database '<base vérifiée>' --batch 100
```

La simulation est aussi le mode par défaut. L'échéance de purge est huit jours depuis la date de clé ; la commande refuse une protection encore vivante même si `retainUntil` a été abaissé. Lots bornés et sortie sans contenu/clé/compte. Sans tâche planifiée, les reçus restent au-delà de huit jours. Les clés anciennes restent refusées après leur purge. Conserver cette validation temporelle dans toute future API compatible.

## Retour arrière serveur et navigateurs

Rétablir atomiquement **la release réellement active avant déploiement**, redémarrer API et web de cette release et contrôler readiness. Préparer cette commande exacte et ses chemins pendant le déploiement futur ; aucun chemin actif n'a été vérifié sur le VPS dans ce lot.

**Conserver la table additive et tous ses reçus** lors d'un rollback applicatif : pas de down migration, cascade, restauration destructive ou purge anticipée. Le code F1 ignore la table supplémentaire. Son endpoint historique reste compatible pour ses clients ; un client F2 recevant 404 sur `/questions/publications` garde sa demande et ne bascule jamais vers le POST historique. Reprendre cette demande nécessite une API F2 restaurée pendant les sept jours, sinon vérifier Mes questions.

La base F1 reste version 2, lisible par le module F1 déployé ; la base F2 séparée reste sur l'appareil. Ne supprimer ni l'une ni l'autre pour revenir en arrière. Le worker ne lit aucune des deux et son code n'est pas modifié ; un changement de build déclenche son cycle de mise à jour volontaire normal, sans publication. Pas de besoin de désinscription PWA pour retirer seulement F2. Une désactivation PWA éventuelle suit exclusivement le [guide lot E](pwa-offline-reading.md) et ne doit pas supprimer les bases locales.

Pour retirer une attente, privilégier l'interface du compte vérifié après vérification de ses publications. Un nettoyage global de profil détruirait la clé nécessaire à une reprise sûre : ne pas vider IndexedDB/CacheStorage/localStorage/cookies indistinctement. Les données ne sont pas récupérables depuis une sauvegarde serveur. Un client fermé ou hors ligne conserve son ancien code jusqu'à son prochain retour en ligne et chargement/mise à jour ; aucun contrôle distant de son IndexedDB n'est possible.
