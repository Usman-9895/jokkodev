# Sécurité : état réel et orientations

## Opérationnel dans le socle

Validation au démarrage de NODE_ENV, PORT, HOST, DATABASE_URL et CORS_ORIGINS. Configuration invalide : arrêt avec code non nul et message sans valeur sensible. Validation globale des DTO avec whitelist, refus des propriétés inconnues et absence de conversion implicite. Les contrôleurs de santé ne reçoivent pas de DTO ; les tests emploient un contrôleur uniquement chargé dans la suite de test.

Limites JSON/formulaire : 64 Kio ; 100 paramètres formulaire. Helmet sur NestJS ; nosniff, Referrer-Policy et X-Frame-Options sur Next.js. Réponses API no-store. Pas de CSP frontend complète revendiquée : prévoir une politique compatible Next.js et des tests avant déploiement. Swagger absent en production. Logs structurés limités à méthode, statut, événement et requestId ; ni URL/query string, corps, cookies, jetons, configuration, SQL ou stack. Les erreurs de démarrage restent volontairement génériques.

CORS désactivé par défaut, puisque le navigateur passe par Next.js. Liste explicite d’origines si nécessaire, cookies autorisés sans origine joker. CORS ne constitue pas une protection CSRF. `trust proxy` vient de `TRUST_PROXY` (vide par défaut, `true` refusé) ; en déploiement, autoriser exclusivement les relais connus après validation de la topologie. Les identifiants de requête entrants sont ignorés pour prévenir l’injection dans les logs.

## Comptes et sessions (lot B03)

Implémentés selon la [décision 003](../decisions/003-sessions-csrf.md) : sessions opaques révocables en base (empreinte SHA-256 seule), cookie HttpOnly SameSite=Lax Path=/ sans Domain, `__Host-` et Secure en production ; expiration absolue 7 jours et inactivité 24 heures ; garde globale qui relit le statut du compte à chaque requête (suspension immédiate) ; Argon2id ; jetons de compte à usage unique consommés atomiquement ; contrôle Origin et jeton CSRF signé sur toutes les mutations, connexion comprise ; réponses neutres de récupération ; limitation par IP et compte. Les routes sont privées par défaut : seules celles marquées `@Public()` sont accessibles sans session.

Provisionnement administrateur hors API : `pnpm admin:grant <email>` sur le serveur, pour un compte actif à l'email vérifié ; `pnpm admin:revoke <email>` pour revenir à MEMBER. Chaque changement de rôle ferme les sessions du compte. La récupération d'accès d'un administrateur passe par la procédure standard de réinitialisation.

Limite connue : les compteurs de limitation sont en mémoire et propres à un processus. Un déploiement à plusieurs processus devra les partager. `TRUST_PROXY` doit lister le seul relais du point d'entrée Datacloud pour que l'IP cliente soit fiable.

## Modération (lot B08)

Signalement par un membre actif sur une question, réponse ou projet visible ; déclarant tiré de la session ; un signalement ouvert par déclarant et cible garanti par index unique partiel. Un signalement seul ne masque rien. Les routes `/admin/*` exigent le rôle ADMIN à chaque requête ; identité du déclarant et motif ne sont exposés qu'à ces routes. Traitement atomique (action, historique, clôture) sous verrou du signalement ; la suspension vise l'auteur de la cible déterminé par le serveur, révoque ses sessions et ne masque pas ses contenus. Masquer une réponse acceptée retire la solution dans la même transaction, sous le même verrou que l'acceptation. Un administrateur ne peut pas suspendre un autre administrateur par l'API. Aucune suppression définitive ni édition générale des comptes ; l'administrateur n'a pas accès aux candidatures privées.

## À implémenter avant toute donnée privée

Validation et assainissement des contenus utilisateurs, politique des liens et du HTML (lots métier).

## Vérifications futures du point d’entrée

Tester Set-Cookie à travers /api/v1, absence de Domain, Secure en HTTPS, transmission serveur explicite, connexion CSRF incluse, mutations inter-origines rejetées, déconnexion/révocation, suspension immédiate, isolation des caches et conservation des en-têtes de sécurité. Tester corps surdimensionnés au proxy et au backend, délais d’expiration, IP réelle limitée aux proxys fiables. Les pages /espace et /admin actuelles sont publiques et sans données privées.
