# Environnement et déploiement futur

## PostgreSQL local

Version cible : PostgreSQL 17.x maintenue (17.11 vérifiée). Le backend utilise un rôle applicatif dédié et deux bases : `jokkodev` pour le développement et `jokkodev_test` pour les tests d'intégration. Ne jamais utiliser un compte ni une base de production pour les tests.

### Option A : installation native

Créer le rôle et les bases via psql ou l'outil d'administration local :

```sql
CREATE ROLE jokkodev LOGIN CREATEDB PASSWORD 'remplacer-localement';
CREATE DATABASE jokkodev OWNER jokkodev;
CREATE DATABASE jokkodev_test OWNER jokkodev;
```

`CREATEDB` sert uniquement à la base de shadow de `prisma migrate dev` ; ne pas l'accorder au rôle de production.

### Option B : conteneur Docker facultatif

Docker n'est pas requis. Si l'environnement l'utilise, un conteneur dédié évite tout conflit avec d'autres projets (adapter le port s'il est déjà pris) :

```sh
docker volume create jokkodev-pgdata
docker run -d --name jokkodev-postgres --restart unless-stopped \
  -p 127.0.0.1:5435:5432 -e POSTGRES_PASSWORD='mot-de-passe-local' \
  -v jokkodev-pgdata:/var/lib/postgresql/data postgres:17-alpine
```

Attendre que `docker exec jokkodev-postgres pg_isready -h 127.0.0.1` réponde, puis exécuter les commandes SQL de l'option A avec `docker exec -i jokkodev-postgres psql -h 127.0.0.1 -U postgres`. Le port n'est publié que sur 127.0.0.1. La licence de l'image système reste à examiner avant tout usage en déploiement.

### Configuration et données

Renseigner `DATABASE_URL` et `TEST_DATABASE_URL` dans `backend/.env` (voir `backend/.env.example`), sans publier le mot de passe. Puis, depuis la racine :

```sh
pnpm db:validate
pnpm db:generate
pnpm db:migrate:dev      # applique les migrations versionnées sur la base de développement
pnpm db:seed             # catalogue des technologies, idempotent
pnpm test:integration    # contraintes vérifiées sur jokkodev_test, dans un schéma temporaire supprimé ensuite
```

Ne pas lancer `migrate dev` ou `migrate deploy` sans vérifier hôte, port, base et autorisation. `pnpm test:integration` refuse de démarrer sans `TEST_DATABASE_URL` ; il crée un schéma `it_<aléatoire>`, y applique les migrations, puis le supprime.

Contrôles de santé : `GET http://localhost:3001/api/v1/health/ready` (200), puis le même chemin via le port 3000. Sur une base qui vous appartient, l'arrêter doit donner 503 et la relancer doit rétablir 200 sans redémarrer NestJS. Ne pas arrêter une base partagée.

## Datacloud et exploitation

Accès Datacloud non encore opérationnel. La procédure complète (installation, mise à jour, migrations avec rôles séparés, sauvegarde chiffrée, restauration, secrets, journaux, emails) est dans le [runbook](../docs/operations/runbook.md).

| Fichier | Rôle |
|---|---|
| `nginx/jokkodev.conf` | Point d'entrée HTTPS, redirection, HSTS, limites de corps et de débit, routage `/api/v1` et frontend |
| `systemd/jokkodev-api.service`, `jokkodev-web.service` | Services durcis, redémarrage automatique, configuration hors dépôt |
| `systemd/jokkodev-backup.service`, `.timer` | Sauvegarde quotidienne et copie hors serveur |
| `postgres/roles.sql`, `grants.sql` | Rôle propriétaire pour les migrations, rôle applicatif limité aux données |
| `scripts/backup.sh`, `restore.sh` | Sauvegarde chiffrée avec empreinte ; restauration vérifiée dans une base vide |
| `scripts/post-deploy-check.sh` | Contrôles HTTPS, santé, cookies, CSRF et Swagger après chaque déploiement |

Répétition locale du 17 octobre 2026 : rôles et droits, migrations par le rôle propriétaire, API en mode production avec le rôle applicatif, nginx en HTTPS devant NestJS et Next.js avec `post-deploy-check.sh` réussi, sauvegarde et restauration chronométrée, refus d'une sauvegarde altérée et d'une restauration vers la production. Les licences des images et paquets système (nginx BSD-2-Clause, systemd LGPL, image PostgreSQL) restent à examiner selon la portée du règlement.
