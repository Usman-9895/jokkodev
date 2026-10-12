# Sécurité : état réel et orientations

## Opérationnel dans le socle

Validation au démarrage de NODE_ENV, PORT, HOST, DATABASE_URL et CORS_ORIGINS. Configuration invalide : arrêt avec code non nul et message sans valeur sensible. Validation globale des DTO avec whitelist, refus des propriétés inconnues et absence de conversion implicite. Les contrôleurs de santé ne reçoivent pas de DTO ; les tests emploient un contrôleur uniquement chargé dans la suite de test.

Limites JSON/formulaire : 64 Kio ; 100 paramètres formulaire. Helmet sur NestJS ; nosniff, Referrer-Policy et X-Frame-Options sur Next.js. Réponses API no-store. Pas de CSP frontend complète revendiquée : prévoir une politique compatible Next.js et des tests avant déploiement. Swagger absent en production. Logs structurés limités à méthode, statut, événement et requestId ; ni URL/query string, corps, cookies, jetons, configuration, SQL ou stack. Les erreurs de démarrage restent volontairement génériques.

CORS désactivé par défaut, puisque le navigateur passe par Next.js. Liste explicite d’origines si nécessaire, cookies autorisés sans origine joker. CORS ne constitue pas une protection CSRF. trust proxy=false ; en déploiement, Serge devra autoriser exclusivement les proxys réseau connus après validation de la topologie. Ne jamais passer aveuglément à true. Les identifiants de requête entrants sont ignorés pour prévenir l’injection dans les logs.

## À implémenter avant toute donnée privée

Sessions opaques révocables dans PostgreSQL, avec stockage sécurisé des identifiants. Cookie de production HttpOnly, Secure, SameSite=Lax, Path=/, sans Domain (préfixe __Host- à évaluer). Protection CSRF de toutes les mutations, y compris connexion. Contrôles de permissions et du statut suspendu dans NestJS à chaque opération concernée. Révocation à la déconnexion, suspension et réinitialisation de mot de passe.

Hachage de mots de passe avec une bibliothèque éprouvée et paramètres calibrés (choix à valider). Jetons de compte expirants et à usage unique, stockés sous forme non réutilisable en cas de fuite de base. Limitation des tentatives et envois d’emails, validation et assainissement des contenus utilisateurs, politique des liens et du HTML. Aucun de ces mécanismes d’authentification n’est opérationnel aujourd’hui.

## Vérifications futures du point d’entrée

Tester Set-Cookie à travers /api/v1, absence de Domain, Secure en HTTPS, transmission serveur explicite, connexion CSRF incluse, mutations inter-origines rejetées, déconnexion/révocation, suspension immédiate, isolation des caches et conservation des en-têtes de sécurité. Tester corps surdimensionnés au proxy et au backend, délais d’expiration, IP réelle limitée aux proxys fiables. Les pages /espace et /admin actuelles sont publiques et sans données privées.
