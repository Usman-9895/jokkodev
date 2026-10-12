# Environnement et déploiement futur

## PostgreSQL local sans Docker

Installer une version PostgreSQL maintenue compatible Prisma (cible 17.x, appliquer les mises à jour correctives). Créer un utilisateur et une base dédiés via psql ou l’outil d’administration local. Exemple à adapter sur une installation personnelle :

```sql
CREATE ROLE jokkodev LOGIN PASSWORD 'remplacer-localement';
CREATE DATABASE jokkodev OWNER jokkodev;
```

Placer la connexion dans backend/.env. Ne jamais utiliser un compte de production pour les tests. Prisma migrate dev nécessite une base de shadow dédiée ou un rôle autorisé à la créer ; prévoir ce droit uniquement en développement. Aucune migration n’est nécessaire tant que le schéma ne contient aucun modèle. Ne pas lancer migrate dev/deploy sans vérifier hôte, port, base et autorisation, sans publier le mot de passe.

Contrôles : pnpm db:validate ; pnpm db:generate ; pnpm dev ; GET http://localhost:3001/api/v1/health/ready puis http://localhost:3000/api/v1/health/ready. Arrêter la base de test uniquement si elle vous appartient pour vérifier le 503, puis la relancer et vérifier la récupération sans redémarrer NestJS. Ne pas arrêter une base partagée.

Docker reste facultatif. Aucun conteneur ni installation Docker n’est requis ou lancé par ce socle. Les licences des images système doivent être examinées avant choix d’image.

## Datacloud — accès non opérationnel

Topologie envisagée : un point d’entrée HTTPS ; /api/v1 vers NestJS, les autres chemins vers Next.js ; PostgreSQL sur réseau privé. Ports internes 3000/3001 et PostgreSQL non exposés publiquement. Swagger UI désactivée en production. Le proxy Next.js est une commodité locale ; en production privilégier le routage au point d’entrée et injecter l’origine API interne adaptée au build/configuration Next.js.

Secrets distincts par environnement, gestionnaire de secrets à choisir selon l’offre disponible. Définir sauvegardes chiffrées, rétention, RPO/RTO et exercices de restauration. Déploiement contrôlé : sauvegarde et restauration testées, revue SQL, pnpm db:migrate:deploy avec rôle dédié, contrôle readiness, stratégie de compatibilité et retour applicatif. Une migration destructive exige une procédure explicite ; pas de db push.

Aucune ressource créée, aucun service Datacloud présumé disponible, aucun déploiement effectué.
