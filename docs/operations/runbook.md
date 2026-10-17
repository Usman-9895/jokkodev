# Runbook d'exploitation

Topologie cible : un serveur Datacloud, nginx en point d'entrée HTTPS, Next.js sur 127.0.0.1:3000, NestJS sur 127.0.0.1:3001, PostgreSQL 17 sur le réseau privé (ou sur le même serveur, port non publié). Seuls 80 (redirection) et 443 sont ouverts ; SSH restreint aux adresses de l'équipe. L'offre Datacloud exacte reste à confirmer : rien dans ce document ne suppose une base gérée.

Fichiers de référence : `infra/nginx/jokkodev.conf`, `infra/systemd/*.service|timer`, `infra/postgres/*.sql`, `infra/scripts/*.sh`.

## 1. Installation initiale

1. Paquets système : Node.js 24 (branche 24.15 ou correctif ultérieur), pnpm 10.34.6, nginx, client PostgreSQL 17 (`pg_dump` de même version majeure que le serveur), openssl, certbot ou client ACME équivalent. Noter les versions installées pour l'audit de licences.
2. Comptes système : `jokkodev` (exécution des services, sans shell) et `jokkodev-backup` (sauvegardes, lecture de la clé de sauvegarde).
3. Base : `psql -v migrator_password=… -v app_password=… -f infra/postgres/roles.sql` en superutilisateur. Mots de passe générés (`openssl rand -hex 24`) et rangés dans le gestionnaire de secrets de l'équipe, jamais dans le dépôt.
4. Code : `/opt/jokkodev/releases/<version>` puis lien `/opt/jokkodev/current`. `pnpm install --frozen-lockfile`, `pnpm db:generate`, `pnpm build`. Aucune version flottante.
5. Configuration (mode 600, propriétaire root) :
   - `/etc/jokkodev/api.env` : variables de `backend/.env.example` avec `NODE_ENV=production`, `HOST=127.0.0.1`, `DATABASE_URL` du rôle `jokkodev_app`, `APP_ORIGIN=https://<domaine>`, `SESSION_COOKIE_SECURE=true`, `CSRF_SECRET` (`openssl rand -hex 32`), `TRUST_PROXY=127.0.0.1`, `MAIL_TRANSPORT=smtp`, `MAIL_FROM`, `SMTP_*`, `APP_VERSION=<version>`. Aucun `TEST_DATABASE_URL`.
   - `/etc/jokkodev/web.env` : `NODE_ENV=production`, `API_INTERNAL_ORIGIN=http://127.0.0.1:3001`.
   - `/etc/jokkodev/backup.env` : `BACKUP_DATABASE_URL` (rôle `jokkodev_migrator`), `BACKUP_DIR=/var/backups/jokkodev`, `BACKUP_KEY_FILE=/etc/jokkodev/backup.key`, `BACKUP_COPY_COMMAND` (copie hors serveur).
   - Ne jamais déposer de fichier `backend/.env` sur le serveur : il serait chargé en complément de la configuration systemd.
6. Migrations : section 3.
7. Données : `pnpm db:seed` (catalogue). Démonstration éventuelle : `pnpm db:seed:demo -- --confirm-production`, mots de passe affichés une seule fois, à ranger immédiatement.
8. Administrateur : inscription normale par le site, vérification de l'email, puis `pnpm admin:grant <email>` sur le serveur.
9. Services : copier les unités dans `/etc/systemd/system`, `systemctl enable --now jokkodev-api jokkodev-web jokkodev-backup.timer`.
10. nginx : `infra/nginx/jokkodev.conf` adapté au domaine, certificat, `nginx -t`, rechargement.
11. Vérification : `infra/scripts/post-deploy-check.sh https://<domaine>`.

## 2. Mise à jour

1. Validation explicite de l'équipe ; version identifiée (commit de `main`).
2. Sauvegarde immédiate : `systemctl start jokkodev-backup.service`, vérifier le fichier et sa copie hors serveur.
3. Construire la nouvelle version dans `/opt/jokkodev/releases/<version>` (installation figée, génération Prisma, build).
4. Relire le SQL des nouvelles migrations. Les changements privilégient la compatibilité avec la version en service (ajouts avant suppressions).
5. Migrations : section 3.
6. Basculer le lien `current`, mettre à jour `APP_VERSION`, `systemctl restart jokkodev-api jokkodev-web`.
7. `post-deploy-check.sh`, puis parcours de recette rapide (connexion, question, projet).

Retour arrière : revenir au lien `current` précédent et redémarrer. Si une migration a supprimé ou transformé des données, revenir au code ne suffit pas : restaurer la sauvegarde prise à l'étape 2 (section 4) après décision de l'équipe.

## 3. Migrations

Toujours avec le rôle propriétaire, jamais `db push` :

```sh
cd /opt/jokkodev/releases/<version>
DATABASE_URL="$MIGRATION_DATABASE_URL" pnpm db:migrate:deploy
psql "$MIGRATION_DATABASE_URL" -v ON_ERROR_STOP=1 -f infra/postgres/grants.sql
```

`grants.sql` redonne au rôle applicatif les droits sur les nouvelles tables et lui retire l'accès à `_prisma_migrations`. Vérifié en répétition : le rôle applicatif ne peut ni créer ni supprimer de table.

## 4. Sauvegarde et restauration

- Quotidienne à 02:30 UTC (`jokkodev-backup.timer`) et avant chaque migration. Format `pg_dump` personnalisé, chiffré AES-256 avec la clé `BACKUP_KEY_FILE`, empreinte SHA-256, rétention locale de 7 jours. La clé est conservée aussi hors du serveur : sans elle, aucune restauration.
- Copie hors serveur obligatoire via `BACKUP_COPY_COMMAND` (stockage objet Datacloud ou autre, à confirmer).
- Restauration (base vide dédiée, jamais la production en service) :

```sh
createdb -O jokkodev_migrator jokkodev_restore
RESTORE_DATABASE_URL=… PRODUCTION_DATABASE_URL=… BACKUP_KEY_FILE=… infra/scripts/restore.sh /var/backups/jokkodev/<fichier>.dump.enc
psql "$RESTORE_DATABASE_URL" -f infra/postgres/grants.sql
```

Le script vérifie l'empreinte, refuse une cible identique à la production, restaure en une transaction et affiche le nombre de tables, de migrations et de comptes. Pour une reprise, pointer ensuite `DATABASE_URL` vers la base restaurée et redémarrer.

Objectifs proposés : perte maximale 24 heures, reprise en 4 heures. Mesuré en répétition locale le 17 octobre 2026 : restauration d'une base de démonstration en 1 seconde. **À remesurer sur Datacloud avec la base réelle avant d'annoncer ces objectifs.**

## 5. Secrets

| Secret | Rotation |
|---|---|
| Mots de passe PostgreSQL | `ALTER ROLE … PASSWORD …`, mise à jour de `api.env` ou `backup.env`, redémarrage |
| `CSRF_SECRET` | Nouvelle valeur puis redémarrage : les jetons CSRF en cours deviennent invalides, les pages les redemandent ; les sessions restent valides |
| Sessions | Révoquer toutes les sessions : `UPDATE "Session" SET "revokedAt" = now() WHERE "revokedAt" IS NULL` |
| SMTP | Chez le fournisseur, puis `api.env` |
| Clé de sauvegarde | Nouvelle clé pour les sauvegardes suivantes ; garder l'ancienne tant que des sauvegardes chiffrées avec elle sont conservées |

## 6. Journaux et diagnostic

Les services écrivent des lignes JSON sur la sortie standard, collectées et tournées par journald (`journalctl -u jokkodev-api`). Chaque réponse porte `X-Request-Id`, repris dans les journaux et dans le corps des erreurs : un utilisateur peut le transmettre pour retrouver la requête. Les journaux ne contiennent ni corps, ni cookie, ni URL avec paramètres, ni SQL. Au démarrage, la ligne `listening` indique la version ; une configuration invalide nomme les variables fautives sans leur valeur.

- `GET /api/v1/health/live` : processus.
- `GET /api/v1/health/ready` : base de données (503 si indisponible, rétabli sans redémarrage).

## 7. Emails

Choisir le fournisseur SMTP, configurer SPF, DKIM et DMARC pour le domaine expéditeur, puis tester une vraie réception : inscription (lien de vérification) et mot de passe oublié. Les échecs d'envoi sont journalisés (`mail_failed`) sans adresse ni contenu.

## 8. Éléments de preuve Datacloud

À rassembler pour la soumission : service utilisé et capture de la console, URL publique HTTPS, sortie de `post-deploy-check.sh`, journal d'une sauvegarde et de sa copie hors serveur, sortie d'une restauration chronométrée, versions installées.
