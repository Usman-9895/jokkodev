# Captures des questions — configuration et recette

Lot validé localement ; commit, push et PR vers develop autorisés par Ousmane après recette. Fusion et déploiement restent séparés. [Décision 013](../decisions/013-question-images.md), [résultats observés](../frontend/question-images-verification.md). Le contrat NestJS est la source ; `pnpm api:generate` exporte OpenAPI et régénère `packages/api-client/src/schema.d.ts`.

## Installation locale

1. Utiliser Node 24.15+ et pnpm 10.34.6 ; `pnpm install --frozen-lockfile`, `pnpm db:generate`.
2. Choisir une **base locale jetable**, vérifier hôte, port, nom et rôle. Configurer `DATABASE_URL` et `TEST_DATABASE_URL` en privé. Appliquer les migrations par `pnpm db:migrate:deploy`, jamais `db push`. `pnpm db:seed` charge seulement le catalogue.
3. Définir `QUESTION_IMAGE_STORAGE_DIR` dans l’environnement privé du backend : chemin absolu dédié, durable, distinct de `AVATAR_STORAGE_DIR`, jamais un dossier public. Son absence laisse l’import indisponible (503), sans empêcher le texte.
4. Lancer API et web selon le README. L’API crée le dossier privé avec mode 0700 et les JPEG avec mode 0600. Sous Windows, appliquer les ACL locales équivalentes. Répertoire et fichiers doivent rester sous contrôle du compte de service ; ne pas partager leur écriture.

Le champ existe sur `/questions/poser` et `/questions/<id>/modifier`. Les fichiers sont préparés au choix de l’auteur, avec session/CSRF. La modification ne retire publiquement une capture qu’après « Enregistrer les modifications ». Préparation privée : huit jours ; douze préparations par compte, trente traitements par heure. Pas de téléchargement distant.

## Contrat

| Endpoint | Comportement |
|---|---|
| `POST /api/v1/question-images` | multipart `file` unique ; session active et CSRF ; `{id,url,expiresAt}` |
| `GET /api/v1/question-images/:id` | JPEG normalisé ; préparation privée au propriétaire, sinon question visible non supprimée ; 404 dans les autres cas |
| `DELETE /api/v1/question-images/:id` | 204 pour la préparation privée de l’auteur ; ne retire jamais une capture publiée |
| Création, publication F2, modification de question | `imageIds?` : liste complète ordonnée, UUID distincts, trois au plus ; PATCH absent conserve, `[]` retire tout |
| Détail de question | `images: [{id,url}]`, ordre d’affichage conservé |

Les originaux et noms ne sont pas conservés. Les images sont converties en JPEG qualité 90, transparence aplatie sur blanc, cadrage entier, maximum 2048 px après traitement. Le décodage est borné à 4096 px/côté, quatre millions de pixels et huit secondes. Signature/structure et décodage font autorité, pas le nom ni le type MIME déclaré. Animations, SVG, GIF, documents et images malformées sont refusés. La route multipart seule accepte cinq Mio ; JSON reste limité à 64 Kio. Le template nginx ajoute une limite de 5184 Kio **sur cette seule route**.

Les GET/HEAD directs restent derrière l’API avec `private, no-store` et sans optimiseur d’images. Ne jamais créer d’alias nginx vers le dossier ni activer un cache CDN pour cette route. Le masquage, la suppression et le retrait bloquent les nouvelles lectures après confirmation ; cela ne retire pas les copies déjà consultées ou téléchargées.

## Nettoyage

Après vérification privée de la destination PostgreSQL et du dossier :

```sh
pnpm question-images:cleanup --confirm-dir /var/lib/jokkodev/question-images --confirm-database jokkodev
pnpm question-images:cleanup --confirm-dir /var/lib/jokkodev/question-images --confirm-database jokkodev --execute
```

La première commande simule. Les unités `jokkodev-question-images-cleanup.service|timer` sont des **modèles non installés ni activés**. Adapter chemins, binaire Node, base et environnement réels avant toute installation. Contrôler un passage manuel puis programmer le timer quotidien. Plusieurs passages peuvent être nécessaires après accumulation (cent lignes et cent orphelins retirés au plus par passage). Aucun compte, question, session, reçu F2 ou mail n’est supprimé par cette CLI. Les répertoires enfants et symlinks ne sont pas parcourus.

Les captures retirées d’une question deviennent inaccessibles dès le commit ; leurs fichiers deviennent des orphelins, retirables après 24 h. Les préparations expirées et les captures dont le traitement de conservation de la question a été confirmé sont éligibles au retrait. Une question masquée ou supprimée, mais encore en revue, ne déclenche pas une purge de ses images. Les dépendances images empêchent une suppression physique automatique du compte qui les oublierait.

## Sauvegarde et restauration

`infra/scripts/backup-files.sh` couvre **avatars et captures**, avec une clé privée, chiffrement AES-256-CBC/PBKDF2 200000 itérations, archive non vide et empreinte SHA-256 vérifiée. Seuls les fichiers plats gérés `jd-<32 hex>.jpg` et `qi-<32 hex>.jpg` sont copiés ; pas de `.env`, fichiers originaux ni caches. Les symlinks gérés sont refusés. Aucune rotation automatique ajoutée : conserver la procédure de rétention et de copie hors serveur existante, et contrôler la réussite des deux sauvegardes avant toute rotation.

Variables privées du service de sauvegarde : `AVATAR_STORAGE_DIR`, `QUESTION_IMAGE_STORAGE_DIR`, `BACKUP_DIR`, `BACKUP_KEY_FILE`. Le modèle `jokkodev-files-backup.service` doit être comparé à l’unité réelle du VPS avant adaptation, sans remplacer aveuglément sa copie hors serveur ou ses contrôles. Le compte de sauvegarde doit pouvoir lire **chaque nouveau JPEG mode 0600**, les deux dossiers et la clé. Une ACL par défaut peut être neutralisée par le masque de création 0600 : vérifier une image nouvellement créée, pas seulement les anciens fichiers ; prévoir un helper de sauvegarde privilégié limité ou une attribution explicite des droits en fenêtre de maintenance. Aucun assouplissement de ces droits n’est appliqué par le lot local.

Avant un couple de sauvegardes cohérent, suspendre les écritures de contenus et de photos ainsi que les nettoyages/conservations à une frontière opératoire vérifiée. Prendre le dump PostgreSQL et l’archive des deux dossiers avant de rouvrir les écritures. Une copie prise pendant des écritures n’est pas présentée comme un instantané atomique. Conserver et copier ensemble les deux archives, leurs empreintes et l’information de version, clé hors serveur. Réutiliser les durées déjà adoptées (local environ sept jours, externe trente jours maximum), aucune nouvelle prolongation implicite.

Tester le déchiffrement et la restauration dans une destination **vide et isolée**, jamais directement au-dessus du stockage en service. L’archive contient `avatars/` et `question-images/` ; vérifier la liste avant extraction, rétablir propriétaire/permissions, comparer les références PostgreSQL et ne pas republier les orphelins. Réconcilier les suppressions et décisions de modération intervenues après la sauvegarde avant toute réouverture. [Runbook général](runbook.md), [conservation](data-retention.md).

Test reproductible avec fichiers et clé **synthétiques uniquement** :

```sh
FILES_BACKUP_TEST_CONFIRM=disposable FILES_BACKUP_SCRIPT=/chemin/revu/infra/scripts/backup-files.sh sh infra/tests/backup-files.integration.sh
```

## Préparation future de production et retour arrière

Cette livraison n’exécute aucune opération de production. Pour un déploiement ultérieur autorisé : sauvegardes DB/fichiers vérifiées, migration `20261114090000_question_images` par le rôle migrateur, puis droits applicatifs habituels (`infra/postgres/grants.sql`, aucun DDL pour l’application). Préparer le dossier durable et les permissions systemd du modèle API, adapter nginx puis vérifier sa syntaxe avant bascule. Établir et tester les sauvegardes et le nettoyage avant ouverture de l’import.

La migration est additive. Un retour à l’API et au web précédents laisse les questions texte utilisables, les lignes/images conservées et les routes d’images absentes (404). Ne pas supprimer table, fichiers ou reçus lors du repli. Ne pas exécuter un ancien traitement physique de comptes sans revoir ses dépendances : les FK empêchent l’effacement de comptes encore propriétaires de captures. Conserver une version de maintenance compatible avec le nouveau schéma. Le retour au code précédent ne restaure pas les captures retirées ; leur récupération demande une procédure de restauration distincte.

## Recette manuelle

1. Ouvrir un éditeur avec un compte local actif. Renseigner les rubriques et une technologie, joindre PNG/JPEG/WebP. Vérifier aperçu, aide publique, retrait au clavier et focus. Ajouter trois captures ; refuser la quatrième et une image > cinq Mio. Tester une fausse extension, un document, un fichier corrompu, une animation et des dimensions excessives ; aucune publication partielle.
2. Avant publication, ouvrir l’URL dans un navigateur sans session et avec un autre compte : 404. Publier en ligne ; voir la galerie et agrandir au clavier. Une réponse perdue doit proposer une reprise volontaire avec la même clé, sans nouvelle question. Fermer un onglet incertain ne conserve pas une attente avec images : vérifier Mes questions avant une nouvelle demande.
3. Modifier la question : conserver, ajouter, retirer et réordonner des captures. Un autre membre et un compte suspendu sont refusés. Vérifier qu’un rejet ne modifie ni texte ni liens. Après retrait enregistré, masquage ou suppression, vérifier aussi l’URL directe : 404, y compris pour l’auteur.
4. Depuis un éditeur déjà ouvert, couper le réseau. Le texte reste modifiable et enregistrable en brouillon. Avec capture, la mise en attente est bloquée et expliquée ; retirer explicitement la capture, puis mettre le texte en attente. Inspecter IndexedDB : aucun File, Blob, imageId ou URL de capture. Revenir en ligne ne doit rien envoyer ; seule l’action volontaire F2 publie/reprend sa copie.
5. Contrôler clair/sombre, 390 px, 768 px et ordinateur, focus visible, sélection/retrait et agrandissement clavier. Contrôler aussi une capture longue et un nom long, erreurs, zoom et absence de débordement horizontal.
6. Simuler le nettoyage, vérifier qu’il ne change rien, exécuter seulement sur fixtures isolées : expirées/orphelins retirés, fichiers récents et captures conservées préservés. Tester sauvegarde chiffrée, empreinte, déchiffrement et restauration de fichiers synthétiques.
