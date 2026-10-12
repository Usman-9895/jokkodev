# Contrat REST

Source de vérité : contrôleurs et DTO NestJS réellement implémentés. pnpm api:export produit openapi.json sans charger de .env, sans secret de production, sans connexion PostgreSQL et sans ouvrir de port. pnpm api:generate exporte puis exécute openapi-typescript ; src/schema.d.ts est généré, jamais édité à la main. Le frontend utilise ses types dans lib/api/browser.ts et server.ts. Les fichiers générés sont destinés au futur dépôt.

Routes actuelles : GET /api/v1/health/live (200, indépendant de la base), GET /api/v1/health/ready (200 si SELECT 1 réussit, 503 sinon). Swagger UI : /api/docs en développement/test seulement, absent en production. Export statique possible dans tous les environnements.

Conventions des futures routes : JSON application/json, dates ISO 8601 UTC (suffixe Z), identifiants opaques traités comme chaînes sans inférence métier. Pagination : { data: [...], meta: { ... } } ; choix curseur ou page à décider par collection avant implémentation. GET 200, création 201, absence de contenu 204 ; 400 validation, 401 session absente, 403 permission refusée, 404 ressource absente, 409 conflit, 413 corps trop volumineux, 429 limitation, 500 erreur interne, 503 indisponibilité. Ces routes et codes futurs ne sont pas présentés comme implémentés.

Erreur uniforme :

```json
{"code":"VALIDATION_ERROR","message":"Certaines données sont invalides.","fieldErrors":{},"requestId":"identifiant de requête"}
```

requestId est généré côté serveur et renvoyé dans X-Request-Id. Aucune stack, requête SQL ou valeur d’entrée sensible dans les réponses. Les DTO de validation ne doivent pas refléter les valeurs dans leurs messages.

Séparer explicitement DTO publics (profil public, contenus visibles), privés (email, candidatures propres, sessions) et administrateur (signalements et décisions). Contrôle NestJS obligatoire ; pas de sérialisation directe de modèles Prisma.

Client HTTP : JSON et 204/205, erreurs API/réseau/protocole/annulation, credentials include, option csrfToken pour mutations, no-store. Cela prépare les cookies et CSRF sans implémenter la protection. Les requêtes JSON avec corps doivent fournir Content-Type: application/json. Paramètres de recherche futurs à ajouter via une API URLSearchParams contrôlée.
