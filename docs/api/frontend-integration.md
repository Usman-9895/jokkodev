# Correspondance frontend et API

Pour remplacer les sources fictives du frontend (lots 3 à 9) par l'API. Toutes les routes sont sous `/api/v1`, types générés dans `packages/api-client/src/schema.d.ts`. Session et CSRF : voir la [décision 003](../decisions/003-sessions-csrf.md), section « Intégration frontend ».

## Pages et routes

| Page frontend | Appels API |
|---|---|
| `/` accueil | `GET /questions?pageSize=…`, `GET /projects?pageSize=…` |
| `/connexion` | `GET /auth/csrf`, `POST /auth/login` |
| `/inscription` | `POST /auth/register` |
| `/mot-de-passe-oublie` | `POST /auth/forgot-password` (réponse 202 identique dans tous les cas) |
| `/nouveau-mot-de-passe?token=…` | `POST /auth/reset-password` `{ token, password }` |
| `/verification-email?token=…` | `POST /auth/verify-email` `{ token }` ; renvoi : `POST /auth/resend-verification` |
| En-tête (identité) | `GET /auth/me` (401 si aucune session) |
| `/questions` | `GET /questions?q&technology&status&page&pageSize` |
| `/questions/[id]` | `GET /questions/:id`, `GET /questions/:id/answers` |
| `/questions/poser` | `GET /technologies`, `POST /questions` |
| `/questions/[id]/modifier` | `GET /questions/:id` (`viewerIsAuthor`), `PATCH /questions/:id` |
| Réponse, solution | `POST /questions/:id/answers`, `PATCH /answers/:id`, `PUT` et `DELETE /questions/:id/accepted-answer` |
| `/projets` | `GET /projects?q&technology&status&page&pageSize` |
| `/projets/[id]` | `GET /projects/:id` (`viewerRole`, `viewerApplication`), `GET /projects/:id/members` |
| `/projets/proposer` | `GET /technologies`, `POST /projects` |
| `/projets/[id]/modifier` | `PATCH /projects/:id` |
| Candidater | `POST /projects/:id/applications` `{ message }` |
| `/profils/[pseudonyme]` | `GET /users/:pseudonyme` (identifiant ou pseudonyme), onglets `GET /users/:id/questions`, `/answers`, `/projects` |
| `/espace` | `GET /users/me/dashboard` |
| `/espace/profil` | `GET /users/me`, `PATCH /users/me` |
| `/espace/questions` | `GET /users/me/questions?status` |
| `/espace/projets` | `GET /users/me/projects?role` |
| `/espace/projets/[id]/demandes` | `GET /projects/:id/applications?status`, `PATCH /applications/:id` |
| `/espace/candidatures` | Envoyées : `GET /users/me/applications?status` ; reçues (tous projets) : `GET /users/me/received-applications?status` ; retrait : `PATCH /applications/:id` `{ status: 'WITHDRAWN' }` |
| `/signalements` | `POST /reports` `{ targetType, targetId, reason }` |
| `/admin/signalements` | `GET /admin/reports?status` |
| `/admin/signalements/[id]` | `GET /admin/reports/:id`, `POST /admin/reports/:id/resolve` |

## Paramètres de liste

Les paramètres d'URL du frontend sont repris tels quels :

| Liste | `q` | `technology` | `status` | `page` |
|---|---|---|---|---|
| Questions | Titre, rubriques, pseudonyme de l'auteur, noms de technologies ; tous les mots requis | Nom affiché (« TypeScript ») ou slug, sans casse | `all`, `resolved`, `open` | À partir de 1 |
| Projets | Titre, objectif, pseudonyme du responsable, technologies | Idem | `all`, `open`, `closed` (recrutement) | À partir de 1 |

`pageSize` vaut 20 par défaut (50 au plus) ; le frontend peut envoyer ses tailles actuelles (3 et 4). La réponse fournit `meta.total` ; le nombre de pages se calcule côté frontend. Une technologie inconnue renvoie une liste vide, pas une erreur. Les listes de technologies codées en dur dans `jokkohelp/query.ts` et `jokkoprojects/query.ts` sont à remplacer par `GET /technologies`.

## Correspondance des modèles

| Frontend (présentation locale) | API |
|---|---|
| `QuestionView.content: ContentBlock[]` | `context` (sans intitulé), `expected` (« Résultat attendu »), `actual` (« Résultat obtenu »), `attempts` (« Ce que j’ai essayé »), puis `code` et `codeLanguage` en bloc de code |
| `AnswerView.content` | `body` en paragraphe, puis `code` et `codeLanguage` |
| `ContentBlock.code.language` | `codeLanguage` (texte libre, `null` si non précisé) |
| `QuestionView.excerpt`, `date`, `updated` | `excerpt`, `createdAt`, `updatedAt` |
| `QuestionView.acceptedAnswerId` | `acceptedAnswerId` ; la solution complète est aussi dans `acceptedAnswer` |
| `Author { name, country }` | `{ id, username, countryCode }` : afficher `username`, convertir `countryCode` avec `new Intl.DisplayNames(['fr'], { type: 'region' })` |
| `ProjectView.summary` | `summary` (début de l'objectif) |
| `ProjectView.recruitment: 'open' \| 'closed'` | `recruitmentStatus: 'OPEN' \| 'CLOSED'` |
| `ProjectView.owner`, `members` | `owner`, `members[]` avec `isOwner` et `joinedAt` |
| Candidature `pending/accepted/refused/withdrawn` | `PENDING/ACCEPTED/REJECTED/WITHDRAWN` (`refused` correspond à `REJECTED`) |
| Candidature `candidate`, `technologies` | `applicant.username`, `applicantSkills[]` |
| Signalement `question/answer/project` | `targetType: QUESTION/ANSWER/PROJECT` |
| Modération `close/hide/suspend` | `decision: NO_ACTION/HIDE_CONTENT/SUSPEND_ACCOUNT` |
| Profil `pseudonym`, `country`, `skills`, `links`, `bio` | `username`, `countryCode`, `skills[]` (objets technologie), `links`, `bio` ; modification par `skillIds` |
| Formulaire d'inscription `pseudonym` | `username` ; la confirmation du mot de passe reste un contrôle frontend |

## Limites à reporter dans les formulaires

Titre de question ou de projet 10 à 150 ; rubriques de question 20 000 caractères au total ; code 20 000 ; langage 30 ; réponse 10 à 20 000 ; 1 à 5 technologies par question, 1 à 10 par projet ; objectif 30 à 5 000 ; disponibilité 300 ; message de candidature 20 à 1 000 ; motif de signalement ou de modération 10 à 1 000 ; pseudonyme `[A-Za-z0-9_]{3,30}` ; mot de passe 12 à 128 ; bio 500 ; 3 liens HTTPS ; 15 compétences.

Les erreurs de validation arrivent dans `fieldErrors`, indexées par le nom du champ API, avec des messages génériques en français. Les codes métier (`EMAIL_TAKEN`, `NOT_AUTHOR`, `APPLICATION_EXISTS`, `RECRUITMENT_CLOSED`, `REPORT_ALREADY_OPEN`, `INVALID_TRANSITION`...) permettent un message adapté à chaque écran ; la liste par route figure dans OpenAPI.

## Comportements à respecter côté interface

- Une ressource masquée par la modération répond 404 comme une ressource inexistante ; ne pas distinguer les deux cas.
- `viewerIsAuthor`, `viewerRole` et `viewerApplication` servent uniquement à afficher les bons boutons ; le serveur vérifie toujours les droits.
- Après une erreur `CSRF_TOKEN_INVALID`, redemander un jeton et proposer de renvoyer le formulaire.
- `429 RATE_LIMITED` porte l'en-tête `Retry-After` en secondes.
- Répéter une décision de candidature déjà appliquée renvoie 200 avec l'état courant : un double clic ne produit pas d'erreur.
