# Correspondance frontend et API

Pour remplacer les sources fictives du frontend (lots 3 à 9) par l'API. Toutes les routes sont sous `/api/v1`, types générés dans `packages/api-client/src/schema.d.ts`. Session et CSRF : voir la [décision 003](../decisions/003-sessions-csrf.md), section « Intégration frontend ».

Le transport partagé prépare les paramètres typés depuis OpenAPI dans l’option `query` et expose uniquement le délai serveur sûr `HttpError.retryAfterSeconds`. Les lots 10 à 14 raccordent comptes, session, profils, JokkoHelp, JokkoProjects, tableau de bord, candidatures et modération minimale. Voir le [guide du lot 14](../frontend/moderation-integration.md). Voir le [guide du lot 13](../frontend/dashboard-applications-integration.md). Exemple : `api('/questions', { query: { q: 'sécurité NestJS', technology: 'nestjs', status: 'open', page: 1, pageSize: 3 } })`. Le chemin reste séparé et refuse `?`, fragments, destinations externes et remontées encodées.

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
| `/espace/candidatures/[id]` | `GET /applications/:id` : détail privé candidat/responsable autorisé |
| `/espace/candidatures` | Envoyées : `GET /users/me/applications?status` ; reçues (tous projets) : `GET /users/me/received-applications?status` ; retrait : `PATCH /applications/:id` `{ status: 'WITHDRAWN' }` |
| `/signalements` | `POST /reports` `{ targetType, targetId, reason }` |
| `/admin/signalements` | `GET /admin/reports?status` |
| `/admin/signalements/[id]` | `GET /admin/reports/:id`, `POST /admin/reports/:id/resolve` |

## Paramètres de liste

Les paramètres d'URL du frontend sont repris tels quels :

| Liste | `q` | `technology` | `status` | `page` |
|---|---|---|---|---|
| Questions | Titre, rubriques, pseudonyme de l'auteur, noms de technologies ; tous les mots requis, casse et accents NFD ignorés | Nom affiché (« TypeScript ») ou slug, sans casse | `all`, `resolved`, `open` | À partir de 1 |
| Projets | Titre, objectif, pseudonyme du responsable, technologies ; tous les mots requis, casse et accents NFD ignorés | Idem | `all`, `open`, `closed` (recrutement) | À partir de 1 |

`pageSize` vaut 20 par défaut (50 au plus) ; le frontend peut envoyer ses tailles actuelles (3 et 4). La réponse fournit `meta.total` ; le nombre de pages se calcule côté frontend. Une technologie inconnue renvoie une liste vide, pas une erreur. Les parcours produit JokkoHelp/JokkoProjects utilisent `GET /technologies` ; les catalogues codés en dur restent uniquement pour les aperçus historiques de développement.

La recherche découpe tous les mots sur les espaces, sans limite arbitraire de huit mots, et exige chacun dans au moins un champ documenté (les mots peuvent être répartis entre texte, auteur et technologies). Normalisation NFD et retrait des marques U+0300–U+036F, puis minuscules, comme les sources frontend ; cela ne constitue pas une translittération universelle. `%`, `_` et `\` sont littéraux, jamais des jokers ; NUL est refusé en 400 et la limite de `q` reste 200 caractères. Un `q` vide ou composé d’espaces ne filtre pas. Le filtre technologie est une égalité sur nom/slug, sans casse ni espaces de bord, indépendante de `q`. Statuts exacts ci-dessus, inconnus refusés en 400. Tous les filtres et la visibilité s’appliquent côté PostgreSQL avant le total et la pagination, tri date décroissante puis identifiant décroissant, dans un même instantané. Une page excessive est vide et conserve le total global. Aucun filtrage d’une seule page côté navigateur.

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

## PATCH et transport partagé

Un champ absent conserve sa valeur. Les valeurs valides sont mises à jour. Seuls `bio`, `countryCode`, `code`, `codeLanguage` et `availability` autorisent `null` pour leur route respective ; sans code, son langage est effacé. `username`, titres, rubriques, corps de réponse, collections et statut de recrutement refusent `null` en 400 `VALIDATION_ERROR` avec `fieldErrors`. `[]` vide liens/compétences ; les technologies de question/projet restent soumises à leur minimum existant. Les DTO Nest et les types générés font référence.

Les clés/valeurs de `HttpOptions.query` proviennent des opérations générées (q, technology, status, page, pageSize, role, limit selon la route), pas d’un dictionnaire non typé. Les valeurs absentes sont omises, une chaîne vide est encodée comme vide et zéro est conservé pour que le serveur applique sa validation ; les paramètres booléens ne sont pas déclarés par les listes actuelles. Ne pas envoyer `resolved=false` : utiliser `status=open`. Les paramètres ne sont jamais concaténés au chemin.

Sur 429, le formulaire peut lire `error.retryAfterSeconds` (secondes entières ou HTTP-date valide convertie au moment de la réponse). Si absent/invalide, la propriété vaut undefined : ne pas inventer de compteur. Le statut et le corps structuré (code, fieldErrors, requestId) restent dans status/details, y compris sans délai. Aucun rejeu automatique de mutation. Aucun accès global aux en-têtes ni cookies. CORS expose Retry-After et X-Request-Id seulement ; le proxy Next laisse passer le délai serveur, testé par le smoke dédié. nginx peut aussi produire un 429 sans Retry-After ni JSON : le client le signale comme erreur de protocole avec le statut, sans délai fabriqué. La chaîne HTTPS nginx complète reste à valider.

## Signalements et résolution intégrés (lot 14)

POST /reports utilise exclusivement targetType QUESTION/ANSWER/PROJECT, targetId et reason. L’API ne livre pas d’état public déjà-signalé ou de route de lecture propre au déclarant : REPORT_ALREADY_OPEN répond au doublon ; une réponse perdue ne permet pas au frontend de confirmer la réception ou de proposer un renvoi sûr.

L’administration utilise GET /admin/reports (status OPEN/CLOSED, page/pageSize), GET /admin/reports/:id (historique inclus) et POST /admin/reports/:id/resolve. Ce dernier applique NO_ACTION/HIDE_CONTENT/SUSPEND_ACCOUNT, écrit l’historique et clôture atomiquement. Aucune seconde clôture ; aucune route d’action directe ou d’historique global ajoutée à l’interface. Le serveur détermine l’auteur/responsable à suspendre. REPORT_ALREADY_CLOSED impose de relire, CANNOT_SUSPEND_ADMIN laisse le rapport ouvert. Une suspension révoque les sessions sans masquer les contenus.

## Propriété et signalements — lot16

POST /reports refuse désormais403 **SELF_REPORT_FORBIDDEN** pour sa propre question, réponse ou son propre projet, ADMIN compris. Propriété lue en base uniquement, après visibilité publique (404 TARGET_NOT_FOUND si absent/masqué). Pour une réponse, comparer son auteur, jamais celui de la question. Aucun signalement créé en cas de refus ; aucun ancien signalement supprimé. Les doublons d’un tiers restent409 REPORT_ALREADY_OPEN. Contrôleur NestJS et génération OpenAPI/types mis à jour. L’interface masque l’action tant que session/propriété sont inconnues ; les autorisations serveur restent la référence. Voir le [guide lot16](../frontend/navigation-self-report-animation.md).
