# Rapport de tests backend

État au 17 octobre 2026, branche `feature/operations` (contient les lots B02 à B08). Linux, Node.js 24.15.0, PostgreSQL 17.11.

## Commandes

| Commande | Contenu | Résultat |
|---|---|---|
| `pnpm test` | 10 tests backend sans base : configuration, en-têtes, erreurs, validation, CSRF, origine, route protégée | 10 réussis |
| `pnpm test:integration` | 69 tests HTTP et SQL sur PostgreSQL réel, chaque fichier dans son propre schéma temporaire | 69 réussis, trois exécutions consécutives |
| `pnpm lint`, `pnpm typecheck`, `pnpm build` | Ensemble du dépôt | Réussis |

## Critères de recette couverts côté backend

| Critère | Couverture automatisée |
|---|---|
| AC01 compte, profil, déconnexion, récupération | `auth.integration.ts`, `profiles.integration.ts` |
| AC02 recherche et filtres combinés | `questions.integration.ts` (mots multiples, technologie, résolu, pagination, résultat vide) |
| AC03 acceptation, remplacement, retrait | `questions.integration.ts` |
| AC04 modification ou acceptation pour autrui, par appel direct | `questions.integration.ts`, `projects.integration.ts` (403 `NOT_AUTHOR`, `NOT_OWNER`) |
| AC05 projet, candidature acceptée, nouveau membre | `applications.integration.ts` |
| AC06 doubles envois | Trois candidatures simultanées, trois acceptations répétées, signalements simultanés |
| AC07 fermeture du recrutement | Demandes bloquées, demandes en attente traitables, candidatures concurrentes d'une fermeture |
| AC08 message privé | Absent de toutes les vues publiques, refusé aux tiers et à l'administrateur |
| AC09 persistance | Données en base ; readiness rétablie après redémarrage de PostgreSQL (vérification manuelle) |
| AC10 contenu avec balises | Stocké et renvoyé tel quel en JSON ; l'affichage sans exécution relève du frontend |
| AC12 signalement traité, masquage et suspension effectifs | `moderation.integration.ts` |
| AC13 HTTPS et restauration | Répétition locale : nginx HTTPS + `post-deploy-check.sh`, sauvegarde chiffrée et restauration chronométrée. Datacloud non testé |
| AC15 confidentialité des signalements | Motif et déclarant absents des vues publiques ; membre et visiteur refusés sur chaque route admin |

AC11 (mobile, clavier) relève du frontend ; AC14 (licences, IA, pièces) reste à finaliser avec le règlement.

## Concurrence

Vérifiée avec des requêtes réellement simultanées : quatre acceptations de solutions différentes (une seule retenue), masquage d'une réponse pendant son acceptation sur cinq tours (jamais de solution masquée), accepter/refuser/retirer simultanés sur cinq tours (une issue, adhésion cohérente), deux réinitialisations avec le même jeton (une seule réussit), deux administrateurs sur le même signalement (une décision).

## Sécurité

- Sessions : empreinte en base, cookie HttpOnly SameSite=Lax sans Domain, `__Host-` et Secure en production (vérifié en HTTPS derrière nginx), expiration absolue et d'inactivité, révocation à la déconnexion, à la réinitialisation, au changement de rôle et à la suspension.
- CSRF : jeton signé lié à la session et contrôle Origin sur toutes les mutations, connexion comprise ; vérifié par test et en HTTPS.
- Limitation : 429 avec `Retry-After` ; un `X-Forwarded-For` falsifié derrière nginx ne contourne pas la limite (vérifié en répétition HTTPS).
- Permissions : routes privées par défaut, propriété contrôlée dans chaque service, rôle ADMIN relu à chaque requête.
- Entrées : DTO en liste blanche, propriétés inconnues refusées, caractère NUL refusé, jokers LIKE échappés, identifiants invalides traités comme introuvables.
- Base : rôle applicatif sans droit DDL ni accès à l'historique des migrations (vérifié en répétition).
- Erreurs : format commun, aucun SQL, stack ou détail interne exposé (vérifié par un échec simulé en base).

## Risques résiduels

| Risque | Mesure ou décision attendue |
|---|---|
| Compteurs de limitation en mémoire | Suffisant avec un processus API ; à partager si plusieurs processus |
| `csrf-csrf` sans publication depuis mai 2025 | Surveiller ; alternative documentée dans la décision 003 |
| Paramètres Argon2 non calibrés sur le serveur réel | Mesurer sur Datacloud (cible 100 à 300 ms) |
| Envoi SMTP non testé | Choisir le fournisseur et tester une vraie réception |
| Datacloud non disponible | Répéter `post-deploy-check.sh` et la restauration sur l'environnement réel |
| Point unique de panne (serveur unique) | Accepté pour le concours ; sauvegardes hors serveur obligatoires |
| Inventaire de licences versionné antérieur aux dépendances backend | Régénérer sur la plateforme de référence avant soumission |
