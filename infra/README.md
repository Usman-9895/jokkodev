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

## Datacloud — accès non opérationnel

Topologie envisagée : un point d’entrée HTTPS ; /api/v1 vers NestJS, les autres chemins vers Next.js ; PostgreSQL sur réseau privé. Ports internes 3000/3001 et PostgreSQL non exposés publiquement. Swagger UI désactivée en production. Le proxy Next.js est une commodité locale ; en production privilégier le routage au point d’entrée et injecter l’origine API interne adaptée au build/configuration Next.js.

Secrets distincts par environnement, gestionnaire de secrets à choisir selon l’offre disponible. Définir sauvegardes chiffrées, rétention, RPO/RTO et exercices de restauration. Déploiement contrôlé : sauvegarde et restauration testées, revue SQL, pnpm db:migrate:deploy avec rôle dédié, contrôle readiness, stratégie de compatibilité et retour applicatif. Une migration destructive exige une procédure explicite ; pas de db push.

Aucune ressource créée, aucun service Datacloud présumé disponible, aucun déploiement effectué.
