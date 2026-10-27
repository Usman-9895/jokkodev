# Conservation — traitements préparés, activation séparée

Politique : [décision 007](../decisions/007-data-retention.md), validée par Ousmane le 26 octobre 2026. Les règles sont adoptées ; **ces traitements ne sont pas déployés ni activés par cette branche**. Aucun accès au VPS n’est nécessaire à cette recette. Pas d’attestation juridique générale.

## Matrice de conservation

| Catégorie | Durée / départ | Traitement préparé | Intervention et limites |
|---|---|---|---|
| Compte non vérifié | 30 jours après inscription, borne incluse | Effacement physique de User et de son profil, sessions et liens par les cascades déjà prévues, seulement sans contribution, relation, historique, réputation ni photo | Toute dépendance, photo ou sanction → revue ; tous les ADMIN restent manuels, y compris le dernier. Aucun DELETE User aveugle |
| Compte actif / profil | Pendant utilisation | Modification existante inchangée | Demandes de clôture avec contributions et droits de tiers à traiter individuellement ; aucune nouvelle route publique de suppression de compte |
| Compte inactif vérifié | 24 mois calendaires sans connexion ; préavis 30 jours avant | File de préavis, envoi explicite, contrôle final ; effacement d’un compte vide après échéance **et** au moins 30 jours depuis l’envoi confirmé | Contributions, membres, projets, historique, photo, ADMIN et sanction : revue humaine. Aucune prétention à une anonymisation complète de ces cas |
| Contributions publiées utiles | Pas d’échéance automatique | Conservées | Revue lors de suppression/clôture ; aucune durée inventée |
| Question supprimée | Retrait public immédiat existant ; traitement à 30 jours | Effacement des rubriques et code, technologies et texte des réponses du seul auteur ; ligne et relations conservées, solution retirée et réputation synchronisée | Réponse d’un tiers, signalement ou modération : revue. Pas de purge des réponses des tiers ni de restauration utilisateur |
| Projet supprimé | Retrait immédiat existant ; traitement à 30 jours | Effacement titre, objectif, disponibilités et technologies ; recrutement fermé, références conservées | Membre tiers, candidature ou historique : revue. Les adhésions et décisions ne sont pas réécrites |
| Message de candidature décidée | 6 mois calendaires après acceptation/refus/retrait | Remplacement du texte par « Message effacé après le délai de conservation. », marqueur interne messageErasedAt | Statut, unicité et adhésion préservés ; pas de copie du texte ailleurs ; aucune échéance pour PENDING |
| Signalement clôturé et décision | 12 mois calendaires après closedAt | Effacement du signalement et de ses seules décisions NO_ACTION échues, dans une transaction | Tout masquage/suspension associé à la cible : revue séparée, même si le signalement lui-même est NO_ACTION. L’absence de route de réactivation n’autorise pas à effacer une sanction active |
| Contact LWS | 6 mois calendaires après clôture de demande | Procédure ci-dessous | Aucun job backend ne touche LWS ; ne pas confondre avec le contact privé du profil |
| Journaux ordinaires | 30 jours après événement | Exemple logrotate et procédure journald | Non installés ; la durée des fichiers tournés ne prouve pas celle de chaque ligne |
| Session | 30 jours après le premier terme : expiration absolue, lastSeenAt + 24 h ou révocation | Suppression de l’enregistrement expiré sous verrou | Validité 7 jours / 24 h inchangée, pas de prolongation par la purge |
| Lien de compte | 7 jours après première consommation ou expiration | Suppression de l’enregistrement | Validité 24 h / 30 min inchangée ; remplacement d’un lien consomme l’ancien |
| Sauvegarde locale | Environ 7 jours depuis création | backup.sh existant, après sauvegarde réussie | find -mtime +7 n’est pas exactement 168 h. Pas de changement silencieux de cette sémantique |
| Copie hors serveur / Windows | 30 jours maximum depuis création initiale | Script local de simulation/exécution, basé sur le nom UTC d’origine | Pas de modification de la date en recopiant. Activer sur chaque destination ; aucune action sur un service distant |
| Journal Teranga Points | Pendant vie du compte | Append-only inchangé ; compensations existantes réutilisées | Aucune suppression d’événement. Un compte lié au journal est manuel, même avec un score nul ; revue des textes identifiants et droits des tiers avant toute clôture |

La marque « effacé » signifie ici effacement du texte dans la base courante ; les relations et identifiants restant en place sont des **données pseudonymes**, pas une anonymisation irréversible. Les sauvegardes, captures ou exports antérieurs restent à gérer selon leurs propres durées.

## Horloges, comptes antérieurs et concurrence

Les durées applicatives sont centralisées dans `backend/src/modules/retention/policy-values.json`. Les jours sont des périodes UTC de 24 h ; les mois sont calendaires UTC, rabattus au dernier jour existant (31 août + 6 mois → 28/29 février). L’horloge du service est injectable pour les tests ; aucune option CLI ne permet d’avancer artificiellement la date d’une vraie exécution.

Migration additive : `20261026090000_data_retention`. Aucun contenu supprimé pendant migration. `lastLoginAt` reste NULL pour les comptes antérieurs ; `retentionObservedAt` vaut la date fiable d’installation du suivi. Elle n’est pas présentée comme leur dernière connexion réelle. On attend une nouvelle connexion réelle ou une période complète observée avant l’inactivité ; aucune estimation à partir des sessions déjà purgées, createdAt ou updatedAt. Les comptes non vérifiés suivent leur date d’inscription fiable, mais le passage est borné et soumis à la revue de simulation.

Une connexion réussie (y compris la session d’inscription) enregistre lastLoginAt et annule les anciens préavis sous verrou User ; les simples visites n’y touchent pas. La vérification/réinitialisation verrouille le même User avant consommation du lien. La lecture/touche de session est sérialisée avec sa purge. Les candidatures sont verrouillées et relues après décision. Les contenus utilisent les verrous Question/Project existants ; la synchronisation Teranga prend son verrou partagé avant Question. Aucun événement de réputation n’est réécrit.

Un verrou advisory exclusif réserve le passage, avec limites par catégorie (100 par défaut, maximum 500), SKIP LOCKED et budget de sélection de 45 s (truncated=true invite à reprendre). Chaque entité et son événement de conservation sont traités dans une transaction courte de 10 s : pas d’accumulation de verrous User/Session/Project entre catégories, ce qui évite les inversions avec les mutations normales. Un passage concurrent renvoie busy sans effet ; une ligne occupée est reprise ultérieurement. Une panne annule les mutations de l’entité courante ; les entités déjà confirmées restent traitées et le passage est annoncé incomplet, jamais faussement atomique en bloc. La simulation utilise une transaction SQL READ ONLY : pas de file, revue, événement ni email créé. eligible compte les candidats examinés, planned les opérations prévues, changed les entités effectivement traitées, manual les décisions humaines requises. Les compteurs ne contiennent aucun identifiant ou contenu privé.

Les revues futures sont écartées jusqu’à leur date de réexamen, pour ne pas bloquer indéfiniment les lots suivants ; l’outil les représente à l’échéance. Un compteur nul ne prouve donc pas la résolution des revues ou des exceptions. Consulter aussi l’export protégé.

**Agenda humain avant les 30 jours** : ne pas attendre l’apparition d’une ligne échue dans le job pour examiner une suppression avec tiers. Dès la suppression, puis lors du suivi quotidien, le responsable d’exploitation relève dans un registre privé la catégorie, l’identifiant, deletedAt et deletedAt + 30 jours des Question/Project avec retentionErasedAt NULL. Aucune rubrique de contenu n’est nécessaire à ce relevé. Examiner d’abord les échéances proches, les participations, signalements et sanctions, et attribuer un responsable avant la date limite. Ce suivi préalable reste manuel dans ce lot ; la file du job est un filet de contrôle des cas encore dus, pas une promesse de traitement humain immédiat. Une revue administrative issue d’un ancien préavis doit être requalifiée après reconnexion : avant toute action manuelle, relire dernière connexion, état du compte, préavis et dépendances actuels sous verrou ; un export antérieur n’est jamais un ordre de clôture.

## Commandes et séparation des modes

Compiler le backend et générer Prisma avant la commande. **Aucune reprise implicite de DATABASE_URL** : fournir RETENTION_DATABASE_URL par un environnement privé, et vérifier hors commande l’hôte, le port, la base effective, le rôle et l’autorisation. Les confirmations ne prouvent pas qu’un alias DNS ne désigne pas une mauvaise base.

```sh
# Valeurs de confirmation d’exemple uniquement, après contrôle de la recette locale.
pnpm retention simulate --confirm-database retention_app --confirm-host 127.0.0.1:<port-dédié> --batch 20
pnpm retention execute --confirm-database retention_app --confirm-host 127.0.0.1:<port-dédié> --categories SESSION,TOKEN,APPLICATION --batch 20
# Opération distincte, émet effectivement les préavis préparés :
pnpm retention notify --confirm-database retention_app --confirm-host 127.0.0.1:<port-dédié> --batch 20
```

`execute` n’envoie aucun email. `notify` est explicitement demandé et utilise le transport existant (fichier uniquement pendant notre recette). Il réserve durablement un préavis avant envoi ; une reconnexion est contrôlée de nouveau sous User. Après crash/perte de réponse SMTP ou erreur de commit, SENDING/UNCERTAIN interdit le renvoi automatique et la clôture. Examiner les traces minimales et l’état chez le transporteur : ne jamais annoncer une livraison certaine ni remettre QUEUED aveuglément. Une confirmation SENT signifie acceptation du transport, pas preuve de lecture. Un préavis retardé reporte la clôture jusqu’à 30 jours complets après l’envoi confirmé. La connexion reste le moyen d’annuler le processus, sans lien secret dans cet email.

Les unités `jokkodev-retention.service`, `.timer` et `jokkodev-retention-notices.service` sont **désactivées par défaut**, sans [Install] et soumises à des fichiers d’activation distincts absents du dépôt. Pas d’envoi automatique au démarrage. Le fichier privé retention.env doit fixer la destination, ses confirmations et RETENTION_CATEGORIES après revue. Aucun enable/start n’est exécuté par cette branche. Pour MAIL_TRANSPORT=file, adapter explicitement les droits systemd du seul dossier dédié ; ProtectSystem=strict ne donne pas de droit d’écriture implicite.

## Exceptions et revue manuelle

Un fichier privé d’exception contient category (une catégorie de la matrice), entityId (UUID précis), reason (incident/contestation nécessaire), owner (responsable), reviewAt et untilAt en ISO UTC. La commande `hold --hold-file <fichier-privé>` exige les mêmes confirmations de destination ; elle se sérialise avec la maintenance. Le motif et l’identité ne sont jamais imprimés. Une exception active bloque seulement cette catégorie/cible ; si d’autres données du même dossier sont nécessaires, les identifier explicitement. reviewAt doit être futur et ne pas dépasser untilAt. Une revue échue est comptée ; à untilAt, le blocage expire. Toute prolongation est motivée et datée, jamais générale ou sans limite.

`export --output <nouveau-fichier-protégé>` exporte événements minimaux, exceptions et revues (création exclusive, mode 600 ; **vérifier aussi les ACL Windows**). Il ne contient pas les textes effacés, mots de passe ou liens de compte, mais ses identifiants et motifs d’exception restent confidentiels : chiffrer et restreindre l’accès. L’export refuse plus de 10 000 lignes par type au lieu de tronquer ; prévoir un export partitionné revu avant dépassement. Le contrôle restore-check refuse plus de 10 Mio / 10 000 événements. Ce registre doit rester assez complet pour couvrir chaque sauvegarde encore autorisée ; pas de purge automatique de ce registre administratif par ce lot. Revoir sa minimisation chaque mois avec les sauvegardes réellement conservées, sans conserver indéfiniment un historique de contenu ou une exception générale.

Pour ACCOUNT_DEPENDENCIES, ADMIN_MANUAL_REVIEW, ACTIVE_SANCTION, THIRD_PARTY_OR_MODERATION, COLLABORATORS_OR_HISTORY, CONTENT_VOLUME et SANCTION_OR_HISTORY : Ousmane et Serge désignent le responsable, analysent les données encore utiles, les droits des tiers et la sanction. Décider d’une opération ciblée et testée, pas d’un remplacement global du pseudonyme. Une question avec plus de 500 réponses est manuelle : les relations ne sont pas chargées ou réécrites sans borne. Une revue signée doit couvrir profil, email, contact, photo, textes libres et liens identifiants, droits d’auteur et références de réputation. Ce lot ne livre **pas** une anonymisation générale ni un transfert de responsabilité de projet. Les photos liées à un compte empêchent son effacement automatique ; la revue choisit leur retrait via le mécanisme existant, puis le nettoyage limité des orphelins. Aucune suppression rétroactive de points des tiers.

## Journaux, LWS et copies hors serveur

### Journaux ordinaires — procédure non activée

1. Inventorier uniquement les fichiers JokkoDev et les namespaces journald, sans déverser de corps ou secrets. Confirmer les dates des premières/dernières lignes et la configuration nginx réelle.
2. Relire `infra/logrotate/jokkodev` : exemple limité aux deux chemins dédiés. Exécuter d’abord `logrotate --debug <copie-validée>` dans l’environnement cible autorisé, puis vérifier propriétaire, réouverture nginx et archives. Une rotation quotidienne peut laisser une marge d’exécution ; mesurer l’âge du plus ancien événement, pas seulement le mtime du fichier. Extraire uniquement les preuves nécessaires à une exception motivée dans un espace restreint.
3. Pour journald, préférer un namespace JokkoDev dédié si la version systemd le permet, avec MaxRetentionSec=30day et contrôle des fichiers archivés/actifs. Les unités actuelles partagent potentiellement le journal système : **ne pas installer une règle globale qui nettoierait les journaux d’autres services**. Une décision d’exploitation et un test séparé restent requis ; ce backend ne purge pas journald.
4. Consigner date, catégorie, plus ancienne date observée, résultat et prochaine revue, sans contenu. Vérifier la durée réelle après rotation puis périodiquement.

### LWS — manuel

Tenir un registre privé des demandes : identifiant minimal, date de clôture, responsable, éventuelle exception et réexamen. Calculer clôture + 6 mois calendaires UTC, sans dater artificiellement la réception comme clôture. À l’échéance, rechercher la conversation et ses pièces jointes dans les seuls dossiers concernés, traiter copies envoyées/exports, puis corbeille selon les possibilités réelles LWS. Vérifier la disparition et documenter toute limite fournisseur/rétention inaccessible. Ne pas supprimer les demandes ouvertes par ancienneté. Ne pas confondre brouillon de contact, email de connexion et contact privé de collaboration. **Aucun accès LWS effectué et aucun nettoyage automatisé LWS livré.**

### Windows et autre destination locale de copies hors serveur

```sh
node scripts/retention-backup-copies.mjs --directory <dossier-dédié>
node scripts/retention-backup-copies.mjs --directory <dossier-dédié> --execute --confirm-directory <même-chemin-absolu>
```

Les archives `jokkodev-YYYYMMDDTHHMMSSZ.dump.enc` et `jokkodev-files-YYYYMMDDTHHMMSS[fractions]Z.tar.gz.enc`, ainsi que leurs sidecars .sha256, sont gérées. Les fractions facultatives des archives de fichiers comptent de 1 à 9 chiffres ; leur précision est conservée pour ne pas effacer une copie avant les 30 jours. Les dates invalides sont ignorées ; la date du nom reste celle du serveur à la création, jamais la date de copie Windows. Rejet des liens symboliques/répertoire racine, entrée inattendue ou lot >1 000 fichiers ; clés et autres fichiers restent intacts. Sur une destination distante, préparer une procédure fournisseur équivalente et vérifiée ; le script ne la nettoie pas. Programmer uniquement après simulation validée, avec compte limité au dossier et un journal de compteurs. Clé de chiffrement conservée tant qu’une sauvegarde autorisée en dépend, y compris exceptions précises. Aucun nettoyage contre les copies réelles dans cette recette.

## Restauration : empêcher la réintroduction

1. Arrêter les accès à **la cible de reprise dédiée**, pas au service de l’équipe sans autorisation. Vérifier destination/vacuité et droits selon restore.sh. Une reprise ne se fait pas par restauration au-dessus d’une base peuplée.
2. Exporter/sauvegarder le dernier registre de conservation, les exceptions et revues **indépendamment** du dump, avec date, empreinte, chiffrement et contrôle d’accès ; conserver les preuves jusqu’à expiration des sauvegardes correspondantes. Une sauvegarde antérieure ne contient pas les effacements postérieurs. L’absence de registre récent bloque la remise en ligne.
3. Restaurer en transaction sur une cible séparée, appliquer les migrations additives de cette version et les droits. Ne pas démarrer le site ni l’envoi des emails. Reconstituer les exceptions actives depuis leur dernière version revue ; ne pas laisser le vieux dump raccourcir une exception ou réactiver une sanction traitée.
4. `restore-check --output <dernier-registre>` est **en lecture seule** : compte les références effacées réapparues, code 2 si présentes. Relancer simulation puis exécution ciblée pour les catégories automatisables, et refaire restore-check. Pour toute référence manuelle, ne pas passer outre : décision ciblée de l’équipe et vérification des droits/points avant ouverture. Le contrôle ne réapplique pas aveuglément un DELETE depuis un fichier.
5. Les connexions survenues après le dump et les confirmations de préavis ne sont pas reconstituables par déduction. Repartir d’une période d’observation prudente pour les comptes restaurés sans preuve actuelle, annuler les anciens préavis et révoquer les sessions/liens restaurés selon une procédure de reprise autorisée. Ne pas renvoyer les préavis exportés comme si l’envoi était certain. Tester les sanctions, photos et contacts ; synchroniser les fichiers de photos sans restaurer des orphelins effacés.
6. Vérifier que les contenus/message/identifiants effacés restent retirés, que la somme du journal Teranga et les scores des tiers sont identiques, et qu’aucune ancienne sauvegarde hors délai ne reste disponible par mégarde. Seulement ensuite décider d’une réouverture séparée. Ce test local ne valide pas l’exploitation du VPS.

## Activation progressive et retour arrière

1. Revue de Serge et Ousmane, migration et rejeu sur copie jetable, simulation catégories seules, contrôle des index/coûts et de la charge avec un jeu représentatif. Sans activation de timer.
2. D’abord SESSION/TOKEN ; ensuite APPLICATION ; puis les catégories contenant revue humaine avec responsables et échéances. Lots limités, suivi eligible/changed/manual/holds/overdueHolds/busy et des lignes restant dues ; file de revue protégée. Seuil d’alerte dès qu’une échéance de 30 jours des contenus risque d’être dépassée : la planification et le traitement humain sont indispensables, le script seul ne garantit pas un délai maximal à l’heure près.
3. Préavis : simulation, revue de la file, essai de réception contrôlé, puis envoi explicitement demandé. Toute incertitude bloque clôture et renvoi automatique.
4. Activation de la seule planification revue, à une cadence tenant les délais et avec supervision des passages bornés ; pas d’activation par installation du backend. Sauvegardes et registre indépendants vérifiés avant effacement.
5. Retour arrière : arrêter la seule nouvelle tâche et retirer son fichier d’activation. Les colonnes additives peuvent rester. **Un retour au code ancien ne récupère pas un texte effacé** ; ne pas restaurer une vieille sauvegarde publiquement pour « annuler » un effacement. Toute reprise doit appliquer la réconciliation ci-dessus et respecter les droits des personnes.

## Coordination de la notice non publiée

Le worktree `feature/public-information` est préservé, non fusionné et non modifié. Cette branche reprend uniquement la décision 007 validée, pas les pages. Le responsable des pages doit distinguer : politique adoptée, traitements préparés, traitements réellement activés et procédures manuelles LWS/journaux/copies. Tant qu’il n’y a pas eu de déploiement et activation revus, conserver l’information honnête d’absence de purge générale active. Après activation, publier les catégories effectivement couvertes et les limites des revues, sans annoncer une anonymisation générale ou une conformité juridique globale. Voir le rapport de recette adjacent pour les contrôles réellement exécutés.


## Complément de revue du 27 octobre 2026

La sélection INACTIVITY écarte les préavis QUEUED de la période courante (traités séparément par notify) et les préavis SENT dont le délai de clôture n’est pas atteint. Ces lignes ne consomment plus les places du lot. Un SENT sans date d’envoi confirmée passe en revue humaine. La condition est relue sous verrou ; une ligne supplémentaire permet de signaler truncated quand d’autres candidats restent. Les passages successifs progressent sans envoyer d’email depuis run.

Les deux nouvelles unités utilisent `/usr/local/bin/node`, chemin de l’installation connue du VPS. Vérifier son existence et systemd-analyze verify sur la cible avant toute installation autorisée. Aucun service installé ou activé par cette branche. Voir la [contre-recette](data-retention-corrections-20261027.md).
