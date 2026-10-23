# Sécurité : état réel et orientations

## Opérationnel dans le socle

Validation au démarrage de NODE_ENV, PORT, HOST, DATABASE_URL et CORS_ORIGINS. Configuration invalide : arrêt avec code non nul et message sans valeur sensible. Validation globale des DTO avec whitelist, refus des propriétés inconnues et absence de conversion implicite. Les contrôleurs de santé ne reçoivent pas de DTO ; les tests emploient un contrôleur uniquement chargé dans la suite de test.

Limites JSON/formulaire : 64 Kio ; 100 paramètres formulaire. Helmet sur NestJS ; nosniff, Referrer-Policy et X-Frame-Options sur Next.js. Réponses API no-store. Pas de CSP frontend complète revendiquée : prévoir une politique compatible Next.js et des tests avant déploiement. Swagger absent en production. Logs structurés limités à méthode, statut, événement et requestId ; ni URL/query string, corps, cookies, jetons, configuration, SQL ou stack. Les erreurs de démarrage restent volontairement génériques.

CORS désactivé par défaut, puisque le navigateur passe par l’entrée locale commune. Liste explicite d’origines si nécessaire, cookies autorisés sans origine joker. CORS ne constitue pas une protection CSRF. `TRUST_PROXY` vide/false en mode direct ; IP exactes de relais vérifiés en mode proxy (exemple local `127.0.0.1`). `true`, comptes de sauts et CIDR refusés. Le relais Node prend l’adresse du socket et remplace les en-têtes entrants ; nginx conserve le routage API direct et le remplacement par `$remote_addr`. Les ports internes ne doivent pas être exposés. Voir la [décision 006](../decisions/006-proxy-ip-trust.md), y compris ses topologies exclues et limites. Les identifiants de requête entrants sont ignorés pour prévenir l’injection dans les logs.

## Comptes et sessions (lot B03)

Implémentés selon la [décision 003](../decisions/003-sessions-csrf.md) : sessions opaques révocables en base (empreinte SHA-256 seule), cookie HttpOnly SameSite=Lax Path=/ sans Domain, `__Host-` et Secure en production ; expiration absolue 7 jours et inactivité 24 heures ; garde globale qui relit le statut du compte à chaque requête (suspension immédiate) ; Argon2id ; jetons de compte à usage unique consommés atomiquement ; contrôle Origin et jeton CSRF signé sur toutes les mutations, connexion comprise ; réponses neutres de récupération ; limitation par IP et compte. Les routes sont privées par défaut : seules celles marquées `@Public()` sont accessibles sans session.

Provisionnement administrateur hors API : `pnpm admin:grant <email>` sur le serveur, pour un compte actif à l'email vérifié ; `pnpm admin:revoke <email>` pour revenir à MEMBER. Chaque changement de rôle ferme les sessions du compte. La récupération d'accès d'un administrateur passe par la procédure standard de réinitialisation.

Limite connue : les compteurs de limitation sont en mémoire et propres à un processus. Un déploiement à plusieurs processus devra les partager. L’adresse du relais réellement observé et l’isolation des ports doivent être vérifiées sur l’environnement cible ; aucune configuration SystaLink n’est présumée.

## Modération (lot B08)

Signalement par un membre actif sur une question, réponse ou projet visible ; déclarant tiré de la session ; un signalement ouvert par déclarant et cible garanti par index unique partiel. Un signalement seul ne masque rien. Les routes `/admin/*` exigent le rôle ADMIN à chaque requête ; identité du déclarant et motif ne sont exposés qu'à ces routes. Traitement atomique (action, historique, clôture) sous verrou du signalement ; la suspension vise l'auteur de la cible déterminé par le serveur, révoque ses sessions et ne masque pas ses contenus. Masquer une réponse acceptée retire la solution dans la même transaction, sous le même verrou que l'acceptation. Un administrateur ne peut pas suspendre un autre administrateur par l'API. Aucune suppression définitive ni édition générale des comptes ; l'administrateur n'a pas accès aux candidatures privées.

## Données privées et contenus

`/espace` affiche des données privées après résolution de la session ; `/admin` exige le rôle réel ADMIN avant chargement des données. L’API reste responsable des autorisations. Profil propriétaire, messages de candidature, coordonnées de collaboration et données de signalement ne doivent pas entrer dans des caches publics. ADMIN ne reçoit pas un accès général aux contacts ou candidatures.

Les DTO valident les champs et rejettent les propriétés non prévues ; les textes/code sont rendus échappés, pas comme HTML utilisateur. Les liens et contacts ont des protocoles/longueurs contrôlés. Photos décodées et réencodées, originales non servies, stockage externe et clés générées. Suppression logique distincte du masquage ; points calculés par le journal serveur. Voir le [bilan d’intégration](../frontend/integration-readiness.md) et les décisions de données, photos et réputation. Ces protections n’impliquent pas une couverture exhaustive des entrées.

## Vérifications futures du point d’entrée

Les tests locaux du [lot 21](lot21/rapport.md) couvrent les cookies via le relais, CSRF, statuts/Retry-After, droits, expirations, contenus, photos et métier. Sur SystaLink restent à exécuter : HTTPS et attributs Secure réels, origine canonique, frontal/pare-feu, absence d’accès aux ports internes, clients réseau distincts, cache en situation réelle, stockage et sauvegarde/restauration. Le [plan cible](lot21/systalink.md) sépare ces contrôles de la recette HTTP locale.

## Dépendances après correction prioritaire (23 octobre 2026)

Next/plugin 16.4.2, Prisma/client/adapter 7.10.1 ; deepmerge-ts 8.0.2 et mysql2 3.24.4 via leurs parents, sans override. Images unoptimized et exclusion sharp/libvips conservées. Un avis high sur braces 3.0.3 reste ouvert dans l’outillage ESLint ; aucune version corrigée publiée au contrôle, aucune suppression/exception dans le scan. Voir [versions, avis et limites natives/WASM](lot21/dependances.md). Les contrôles locaux ne valident ni toutes les dépendances embarquées, ni les licences globales, ni la production.
