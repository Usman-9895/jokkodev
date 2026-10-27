# Conservation — recette locale du 26 octobre 2026

Branche locale `feature/data-retention`, worktree `D:\DEV\JokkoDev\.cache\data-retention\worktree`, base `origin/develop` après fetch : **33a0d9f548f3345c42066530fa15649cf646dab2**. Aucun commit, push, PR, fusion, déploiement, connexion au VPS ou activation de tâche. La décision 007 validée a été copiée à l’identique depuis le worktree des pages d’information ; ses autres fichiers restent séparés et non modifiés.

## Changements et justification

- Migration additive `20261026090000_data_retention` : dates fiables lastLoginAt/retentionObservedAt, marqueurs d’effacement, préavis, exceptions/revues et registre minimal. Aucune ancienne migration partagée réécrite, aucune donnée effacée par migration. La relation du préavis indique explicitement onUpdate: NoAction, conforme à sa FK SQL ; aucun changement d’identifiant utilisateur n’est livré.
- Règles centralisées et mois calendaires UTC. Simulation SQL READ ONLY ; commandes séparées execute, notify, hold, export et restore-check. Destination dédiée explicite, sans reprise de la base applicative implicite.
- Verrou de maintenance et transactions courtes **par entité** : éligibilité et autorisations relues sous verrou, événement enregistré avec l’effacement, aucune accumulation de verrous de catégories différentes. Les entités déjà confirmées restent traitées si un passage ultérieur échoue ; l’erreur signale un passage incomplet. Idempotence et bornes de temps/volume.
- Nettoyages techniques et texte échu ; dossiers avec tiers, sanctions, photos ou volume de réponses excessif transmis en revue. Tous les administrateurs restent manuels : pas de risque de supprimer automatiquement le dernier. Pas de pseudonymisation présentée comme anonymisation irréversible.
- Préavis réservé durablement avant émission, sans copie d’email dans la file. SENDING/UNCERTAIN ne sont pas rejoués. Une reconnexion annule le préavis. La clôture automatique ne concerne qu’un compte sans dépendance et exige un envoi confirmé depuis au moins 30 jours, en plus des 24 mois d’inactivité.
- Contrat NestJS et types générés : description du texte de candidature effacé, chaîne de même type. Aucun nouveau champ privé dans les réponses publiques. Le rendu existant affiche la chaîne ; aucune refonte ou modification de composition frontend, aucune anonymisation générale ajoutée.
- Unités de planification désactivées par défaut, exemple logrotate, script local de copies Windows/hors serveur, protections des tables de maintenance et procédures LWS/restauration. Aucun traitement externe exécuté.

La [matrice par catégorie, les limites et le plan d’activation/retour arrière](data-retention.md) font partie de la livraison. Les comptes avec contributions ou droits de tiers ne sont pas annoncés comme clôturés/effacés automatiquement.

## Environnement réellement utilisé

Windows, Node 24.15.0, pnpm 10.34.6 ; PostgreSQL/pg_dump 17.11 dans un **nouveau** conteneur Alpine `jokkodev-retention-fca785d8`, port publié **127.0.0.1:65027 uniquement**. Bases créées pour ce travail : retention_app, retention_it, retention_restore et retention_restore_final. Le nom effectif et zéro table applicative ont été vérifiés avant première migration/restauration. Aucun cluster, fichier ou sauvegarde de l’équipe utilisé. Pas de db push ni de reset.

OpenSSL a été installé depuis les dépôts Alpine signés dans le seul conteneur dédié, pour exécuter backup.sh/restore.sh. Aucune dépendance du workspace ajoutée ou mise à jour ; pas de nouveau codec, binaire applicatif ou bibliothèque de licence à intégrer. Ceci ne remplace pas les arbitrages de licences existants.

Les tests Nest utilisent des ports éphémères ; les smoke utilisent 33422/33423 et ferment uniquement leurs propres processus. Aucun frontend/API de recette permanent lancé par ce lot. Le conteneur dédié et les données fictives sont laissés disponibles pour revue. Il peut être arrêté séparément par le propriétaire après validation ; aucun arrêt de service d’équipe exécuté.

## Contrôles et résultats

Les preuves expurgées sont dans [data-retention-evidence.json](data-retention-evidence.json). Les journaux détaillés et configurations privées restent ignorés dans `.cache/data-retention/`, jamais copiés dans le rapport.

| Contrôle | Résultat local |
|---|---|
| Installation frozen-lockfile | Réussie, verrou inchangé |
| Prisma validate/generate | Réussis |
| Migration neuve, rejeu, catalogue et rejeu | Réussis uniquement sur la base dédiée |
| OpenAPI/types | Générés depuis Nest ; seule description attendue de message modifiée ; second passage stable |
| Lint / TypeScript / builds backend et frontend | Réussis |
| Tests backend unitaires | 16 réussis |
| Frontend/client/outillage | 100 réussis |
| Intégration PostgreSQL | 144 réussis, dont 21 nouveaux scénarios de conservation |
| Sous-ensemble ciblé | 23 réussis = 21 PostgreSQL + 2 calendaires, déjà inclus dans les totaux ci-dessus |
| Deux smoke | Réussis : base indisponible puis base dédiée ; contrôles de production, session/CSRF, relais et neuf aperçus 404 conservés |
| Préavis via transport fichier réel | Simulation : aucun email/aucune file créée ; exécution/envoi : un JSON, second notify : zéro nouvel envoi ; connexion : CANCELLED |
| Sauvegarde chiffrée / restauration | Scripts réels exécutés sous Linux Alpine, cible séparée vérifiée vide ; cible non vide ensuite refusée |
| Réconciliation après restauration | Six références effacées réapparues détectées ; six retraitées ; deuxième passage sans effet ; contrôle final zéro référence réintroduite |
| Intégrité du tiers | Adhésion inchangée, score 10 avant/après restauration et nettoyage ; invariant indépendant journal/solutions vérifié après chaque scénario de conservation |
| Droits SQL | Rôle NOLOGIN fictif dans le seul cluster dédié : lecture/annulation des préavis permises, accès aux trois tables privées de maintenance refusé |

Les scénarios couvrent : avant/après échéance et borne exacte, fin de mois/bissextile UTC, sessions actives/révoquées/inactives, liens consommés/expirés/utilisables, compte ancien et non vérifié avec dépendances, dernier ADMIN, file de préavis et échec après envoi, reconnexion concurrente, vérification email concurrente, décision fraîche de candidature, modération/suspension concurrente, rollback par entité, exceptions datées, confidentialité de candidature par l’API et somme de réputation des tiers. Les 123 tests PostgreSQL antérieurs restent inclus : comptes, contributions, projets/candidatures, modération, suppression logique, photos, contacts et Teranga Points.

## Incidents intermédiaires conservés

1. Le premier lancement des scripts via le fichier JS de pnpm ne trouvait pas le shim pnpm pour ses sous-commandes. Chemin du shim épinglé ajouté seulement à l’environnement du processus de test ; aucune installation globale ou politique système changée.
2. Premier lint : type Tx inutilisé, retiré ; lint relancé, sans désactivation de règle.
3. Première suite unitaire : processus foundations.test en échec sans diagnostic détaillé. Son exécution isolée réussit (11 tests), puis les suites complètes réussissent. **Cause du premier arrêt non démontrée**, pas présentée comme un défaut corrigé.
4. Premier test de copies : comparaison littérale realpath/chemin court Windows trop stricte ; inspection des composants et confirmation par chemin canonique. Le test Windows réussit, clés et fichiers étrangers conservés.
5. Première intégration complète : 140/141, ancien test de migration Teranga arrêté avant les nouvelles colonnes. Test adapté pour appliquer toutes les migrations additives après sa fixture antérieure au journal ; assertions originales conservées et observation prudente des comptes anciens ajoutée. Passages suivants complets réussis.
6. Première sonde de suspension ne voyait pas l’attente depuis la transaction qui gardait le verrou. Observateur autocommit indépendant ajouté, assertion d’attente réelle conservée puis réussie. Le [comportement de snapshot des statistiques PostgreSQL](https://www.postgresql.org/docs/17/monitoring-stats.html#MONITORING-STATS-VIEWS) explique pourquoi une observation répétée dans la même transaction ne constitue pas une sonde fraîche.
7. Comparaison schéma/base : action ON UPDATE de la nouvelle FK non explicitée dans Prisma ; alignement déclaratif NoAction sur la FK déjà créée. Aucun SQL de suppression/recréation de FK proposé par diff n’a été exécuté. Client régénéré et contrôles relancés.
8. Avertissement ponctuel de dépréciation pg sur le chevauchement client.query observé dans les tests, sans échec final associé ; origine exacte non établie et pas annoncée corrigée. À suivre avant une future mise à jour majeure de pg.

## Reproduire indépendamment

Préparer un PostgreSQL jetable distinct, contrôler hôte/port, base effective et vacuité, puis créer retention_app et une base d’intégration séparée. Renseigner les URLs dans un environnement privé, **pas dans une commande copiée dans un rapport**. Utiliser les versions du README et les scripts normaux : installation figée, Prisma, migrations, catalogue, génération, lint, typecheck, test, test:integration, build et smoke. TEST_DATABASE_URL ne doit jamais pointer sur une base de l’équipe.

Après compilation, sur **retention_app neuve uniquement** :

```powershell
$env:NODE_ENV='test'
# RETENTION_DATABASE_URL contient uniquement l’URL de cette base locale vérifiée.
$env:RETENTION_FIXTURE_CONFIRM='new-empty-local-database'
node scripts/retention-fixture.mjs
```

Le script refuse une base contenant des utilisateurs ou un fichier de comptes existant. Il crée comptes/contributions fictifs, adhésion, message échu, contenus supprimés, session et lien échus, avec une contribution active valant 10 points. Les mots de passe aléatoires sont écrits uniquement dans `.cache/retention-fixture-accounts.json` (ouvrir dans un éditeur local, ne pas publier). Les comptes owner et member restent utilisables ; le compte non vérifié échu est volontairement supprimé pendant la recette. Ne pas relancer la fixture sur notre base déjà peuplée.

Exécuter ensuite les commandes simulate/execute/export/restore-check du [guide](data-retention.md), avec les confirmations de nom et hôte:port. Prendre une sauvegarde **avant** nettoyage dans un dossier et avec une clé propres à la recette ; restaurer sur une autre base neuve via restore.sh, comparer au registre récent, retraiter et vérifier score/adhésion. La restauration ne doit pas exposer publiquement les données entre ces étapes.

### Ressources de cette recette sur ce poste

La configuration privée locale est `D:\DEV\JokkoDev\.cache\data-retention\private.json`. Elle contient les URLs du seul conteneur dédié, pas des accès VPS. Les comptes sont dans `D:\DEV\JokkoDev\.cache\data-retention\worktree\.cache\retention-fixture-accounts.json`. Les emails de test et le registre de restauration sont aussi dans le cache privé. Les ouvrir localement sans imprimer leur contenu.

Exemple de chargement sans affichage de secret, depuis la racine du worktree :

```powershell
$recette = Get-Content -Raw 'D:\DEV\JokkoDev\.cache\data-retention\private.json' | ConvertFrom-Json
$env:RETENTION_DATABASE_URL = $recette.app
pnpm.cmd retention simulate --confirm-database retention_app --confirm-host ('127.0.0.1:' + $recette.port) --batch 20
```

Après nos effacements le plan courant peut être vide : c’est attendu, pas une fixture cachée. La sauvegarde fictive pré-nettoyage, sa clé et ses empreintes sont conservées dans le seul conteneur `/tmp/jd-retention/`. Pour revoir l’avant/après, créer **une nouvelle cible vide**, jamais écraser retention_restore ou retention_restore_final déjà peuplées. Leur nom et leur vacuité doivent être vérifiés avant restore.sh. La recette automatisée a laissé la cible finale dans son état réconcilié.

## Limites et préalables

- Aucun traitement actif de production : unités, marqueurs d’activation, droits, supervision et cadence sont à faire relire séparément par Ousmane/Serge. Les revues, délais de traitement effectifs et volumes doivent être suivis ; un lot borné n’est pas la preuve d’une couverture exhaustive d’une grande base.
- Clôture/anonymisation des comptes avec dépendances, photos, sanctions ou droits de tiers : processus manuel documenté, non automatisation totale. Registre minimal à minimiser après expiration vérifiée de toutes les sauvegardes correspondantes ; pas de suppression aveugle de ce registre administratif.
- LWS, journald et rotation nginx réelle non exécutés ; configurations et procédures préparées seulement. Aucun nettoyage des copies réelles Windows/hors serveur ; seul le test de fichiers jetables a été exécuté.
- Backend/frontend testés sous Windows ; PostgreSQL et scripts de sauvegarde/restauration sous Linux Alpine isolé. Pas de recette Linux complète de l’application, systemd/logrotate cible ou CI distante validée par ces résultats.
- Pas de modification de composant visible ou de nouvelle composition frontend : le texte de remplacement réutilise le rendu existant. Pas de nouvelle revue navigateur, lecteur d’écran, appareil physique ou zoom 200 % annoncée.
- Le travail non publié des pages d’information n’est pas intégré. La notice doit annoncer séparément les règles validées et les catégories réellement activées après déploiement autorisé. Ni anonymisation générale, ni conformité juridique, ni aptitude de production conclues.

Activation progressive : simulation → revue des exceptions et des droits → catégories techniques → messages → catégories nécessitant responsables et préavis. Retour arrière : arrêter la seule nouvelle tâche ; les données effacées ne reviennent pas par retour au code ancien. Toute restauration reste isolée jusqu’à réconciliation. Voir le guide pour les détails et les échéances.


## Contre-recette du 27 octobre 2026

Les réserves sur les copies, les lots et le chemin Node sont corrigées. Voir le [complément de recette](data-retention-corrections-20261027.md). Les résultats historiques ci-dessus restent datés du 26 octobre ; aucune activation annoncée.
