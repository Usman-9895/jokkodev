# Décision 003 — sessions, CSRF et contrat des comptes

État : implémenté sur `feature/auth` (lot B03) le 17 octobre 2026, à relire par Ousmane avant fusion. Versions et licences relevées sur le registre npm le 17 octobre 2026. Les écarts par rapport à la proposition initiale sont regroupés dans la section « Écarts d'implémentation ».

## Sessions

- Session opaque stockée dans PostgreSQL (table `Session`, [décision 002](002-modele-donnees.md)). Jeton de 32 octets issu de `crypto.randomBytes`, transmis uniquement par cookie ; seule son empreinte SHA-256 est en base.
- Cookie : `__Host-jokkodev_session` en production, `jokkodev_session` en local HTTP. Attributs `HttpOnly`, `Secure` (production), `SameSite=Lax`, `Path=/`, sans `Domain`. Pas de `Max-Age` au-delà de l'expiration absolue.
- Durées : absolue 7 jours, inactivité 24 heures. `lastSeenAt` est mis à jour au plus une fois toutes les 5 minutes pour éviter une écriture par requête.
- Nouvelle session à chaque connexion (pas de réutilisation d'un identifiant antérieur). Révocation de la session courante à la déconnexion ; de toutes les sessions du compte à la réinitialisation du mot de passe et à la suspension.
- Garde globale NestJS : lit le cookie, charge la session non révoquée et non expirée avec son utilisateur, refuse un compte `SUSPENDED` sur les routes protégées. Décorateurs `@Public()`, `@CurrentUser()` et `@Roles('ADMIN')`.

## Mots de passe

- Argon2id avec le paquet `argon2` 0.45.1 (MIT, binaires précompilés, implémentation de référence embarquée à inclure dans l'audit des notices). Paramètres de départ OWASP : m = 19 MiB, t = 2, p = 1, puis calibrage sur le serveur Datacloud (cible 100 à 300 ms) avant la livraison.
- Repli documenté si le module natif bloque : `crypto.scrypt` du runtime Node.js, sans nouvelle dépendance.
- Longueur 12 à 128 caractères, espaces autorisés, aucune troncature ni règle de composition. Comparaison toujours effectuée, même pour un email inconnu (empreinte factice), pour ne pas révéler l'existence d'un compte par le temps de réponse.

## Protection CSRF

Deux contrôles cumulés sur toute requête autre que `GET`, `HEAD` et `OPTIONS`, connexion et inscription comprises :

1. **Origine** : `Origin` doit être égal à `APP_ORIGIN`. À défaut d'`Origin`, `Sec-Fetch-Site` doit valoir `same-origin`. Sinon 403 `CSRF_ORIGIN_REJECTED`.
2. **Jeton** : modèle « signed double-submit » de `csrf-csrf` 4.0.3 (ISC). Le jeton est signé par HMAC avec `CSRF_SECRET` et lié à l'identifiant de session ; avant connexion, il est lié à un cookie anonyme `__Host-jokkodev_pre` de courte durée. Le frontend l'envoie dans l'en-tête `X-CSRF-Token` (déjà autorisé par la configuration CORS et prévu par le client HTTP partagé). Sinon 403 `CSRF_TOKEN_INVALID`.

Le jeton est renouvelé à la connexion et à la déconnexion. Point d'attention : `csrf-csrf` n'a pas publié de version depuis mai 2025. Alternative si l'équipe préfère éviter la dépendance : jeton synchronisé stocké dans la session serveur, avec une pré-session anonyme pour la connexion.

## Limitation des abus

Compteurs à fenêtre fixe en mémoire (`RateLimiter`), acceptables avec un seul processus API ; remise à zéro au redémarrage. Limites : connexion 5 essais par compte et IP sur 15 minutes et 30 par IP ; inscription 20 par heure et par IP ; 3 emails de compte par heure et par adresse ; réinitialisation et vérification 20 par heure et par IP. Réponse 429 `RATE_LIMITED` avec `Retry-After`. `TRUST_PROXY` limité aux relais connus du point d'entrée Datacloud.

## Emails de compte

`nodemailer` 10.1.2 (MIT-0) via SMTP en production. En local et en test (`MAIL_TRANSPORT=file`), chaque message est écrit en JSON dans `MAIL_FILE_DIR` (dossier ignoré par Git) ; aucun service supplémentaire n'est nécessaire. Jetons de vérification (24 heures) et de réinitialisation (30 minutes) : 32 octets aléatoires, empreinte en base, consommation atomique (`UPDATE ... WHERE consumedAt IS NULL AND expiresAt > now()`), jamais journalisés. Le fournisseur SMTP de production reste à choisir avec l'accès Datacloud.

## Contrat proposé

Préfixe `/api/v1`. Erreurs au format commun `{ code, message, fieldErrors, requestId }`.

| Route | Corps | Succès | Erreurs principales |
|---|---|---|---|
| `GET /auth/csrf` | — | 200 `{ csrfToken }` | — |
| `POST /auth/register` | `{ email, username, password }` | 201 `{ user: CurrentUser, csrfToken }` et cookie de session | 400 `VALIDATION_ERROR`, 409 `EMAIL_TAKEN` / `USERNAME_TAKEN`, 429 |
| `POST /auth/login` | `{ email, password }` | 200 `{ user: CurrentUser, csrfToken }` et cookie de session | 401 `INVALID_CREDENTIALS`, 403 `ACCOUNT_SUSPENDED`, 429 |
| `POST /auth/logout` | — | 204, session révoquée et cookies effacés, même sans session valide | 403 CSRF |
| `GET /auth/me` | — | 200 `CurrentUser` | 401 `UNAUTHORIZED` |
| `POST /auth/forgot-password` | `{ email }` | 202, réponse identique que le compte existe ou non | 429 |
| `POST /auth/reset-password` | `{ token, password }` | 204, toutes les sessions révoquées | 400 `TOKEN_INVALID` (inconnu, expiré ou déjà utilisé) |
| `POST /auth/verify-email` | `{ token }` | 204 | 400 `TOKEN_INVALID` |
| `POST /auth/resend-verification` | — (session) | 202 | 401, 429 |

`CurrentUser` : `{ id, username, email, role, emailVerified }`. Cette projection n'est renvoyée qu'au titulaire de la session ; le profil public ne contient jamais l'email.

L'inscription crée directement une session pour simplifier le parcours. `EMAIL_TAKEN` révèle l'existence d'un email ; c'est un compromis d'ergonomie courant, à confirmer, l'alternative étant une réponse neutre suivie d'un email.

## Variables d'environnement ajoutées

`APP_ORIGIN`, `SESSION_COOKIE_SECURE`, `CSRF_SECRET` (32 caractères minimum, distinct par environnement), `TRUST_PROXY`, `MAIL_TRANSPORT`, `MAIL_FILE_DIR`, `MAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`. Toutes validées au démarrage, sans valeur réelle dans `.env.example`. En production, `APP_ORIGIN` en HTTPS, `SESSION_COOKIE_SECURE=true`, `CSRF_SECRET`, `MAIL_FROM` et SMTP sont obligatoires ; le démarrage échoue sinon.

## Tests

Couverts par `backend/test/foundations.test.ts` (sans base) et `backend/test/auth.integration.ts` (PostgreSQL réel) : connexion valide et invalide ; attributs du cookie ; session expirée, révoquée ou suspendue refusée ; mutation sans jeton ou depuis une autre origine refusée, connexion comprise ; réponse identique de récupération pour un email absent ; jeton de réinitialisation rejoué ou expiré refusé ; deux consommations concurrentes d'un même jeton dont une seule réussit ; aucune donnée sensible dans les réponses ni dans les logs.

## Écarts d'implémentation

- Connexion et inscription renvoient `{ user, csrfToken }` : la session change, l'ancien jeton CSRF n'est plus valable et le frontend reçoit directement le nouveau. Après une déconnexion, appeler `GET /auth/csrf`.
- `CurrentUser` n'expose pas `status` : une session valide implique un compte actif.
- Limitation par un service interne plutôt que `@nestjs/throttler` : les clés composées (compte et IP) sont directes, sans dépendance supplémentaire.
- Pas de Mailpit : transport fichier en local, voir ci-dessus.
- Une nouvelle connexion depuis un navigateur déjà connecté révoque sa session précédente.
- La réinitialisation du mot de passe confirme aussi l'email : la possession de la boîte est prouvée.
- Les liens des emails pointent vers `/verification-email?token=…` et `/nouveau-mot-de-passe?token=…`, pages déjà prévues par le frontend.

## Intégration frontend

1. `GET /api/v1/auth/csrf` au chargement de l'application (ou avant le premier formulaire), conserver `csrfToken` en mémoire uniquement.
2. Envoyer `X-CSRF-Token` sur toute requête `POST`, `PUT`, `PATCH` et `DELETE`, avec `credentials: 'include'` (déjà prévu par le client HTTP partagé).
3. Remplacer le jeton par celui renvoyé par la connexion et l'inscription ; en redemander un après déconnexion ou après une erreur `CSRF_TOKEN_INVALID`.
4. Lectures serveur authentifiées : transmettre uniquement le cookie de session à l'API interne.

## Décisions attendues

1. Durées de session et de jetons.
2. Vérification d'email obligatoire ou non avant de publier (aujourd'hui non exigée).
3. Maintien de `csrf-csrf` malgré l'absence de publication récente.
4. Comportement de l'inscription face à un email déjà utilisé.
5. Fournisseur SMTP de production.
