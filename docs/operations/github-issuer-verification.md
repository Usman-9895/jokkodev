# Correctif de l'émetteur OAuth GitHub — recette locale

Base `origin/develop` actualisée : `9d5151fc80eadcfed6251bf77e71ddefb05adbd5`. Worktree isolé `.cache/auth-github/issuer-worktree`, branche `fix/auth-github-issuer`. Aucun commit, push, PR ou déploiement du correctif au moment de cette préparation.

## Observations réelles et limite de l'attribution

L'utilisateur a effectué une tentative GitHub pendant la fenêtre de diagnostic de la release API `9d5151f`, avec web `f963584` et Notifications `a3a166e`. La fenêtre a renvoyé un événement conforme `github_auth_failed / token_exchange / token_response_invalid`, puis fermé GitHub et son diagnostic ; Google, mot de passe et Notifications sont préservés. Aucun callback, code, jeton, adresse ou exception brute n'a été conservé. L'événement ne contient pas les paramètres du callback et ne permet pas de prouver qu'il portait `iss`.

Un contrôle négatif distinct, depuis le VPS avec un code aléatoire fictif et sans parcours utilisateur, a renvoyé HTTP200, Content-Type application/json, erreur GitHub `bad_verification_code`, aucun champ de jeton et catégorie de bibliothèque `OAUTH_INVALID_RESPONSE`. Il confirme le format JSON de cette réponse négative, sans établir la cause du parcours réel.

La configuration précédente attend `https://github.com`. GitHub publie `https://github.com/login/oauth` comme émetteur et annonce le support du paramètre `iss`. La bibliothèque verrouillée openid-client6.8.8/oauth4webapi3.8.8 valide le callback avant la requête de jeton et refuse un `iss` différent. Le correctif vise ce défaut précis ; sa correspondance avec l'échec réel reste une hypothèse à confirmer par un aller-retour réel après revue et déploiement séparés.

Sources primaires consultées : [émetteur GitHub](https://docs.github.com/en/apps/github-authentication-discovery-endpoints), [métadonnées publiques](https://github.com/.well-known/oauth-authorization-server/login/oauth), [flux OAuth et PKCE](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps). Les métadonnées sont en préversion et destinées à la découverte MCP ; aucune découverte automatique ni adoption d'OIDC n'est introduite.

## Périmètre du correctif

Correction de la valeur d'émetteur statique, endpoints HTTPS inchangés. Contrôle exact de `iss` lorsqu'il est fourni ; refus d'une autre valeur, d'un paramètre répété et d'un state incorrect avant tout échange de jeton. Compatibilité du flux sans `iss`, PKCE, scopes stricts, lecture d'identité stable/adresse vérifiée, sessions, liaison explicite, suspension et inscription conservées. Le fournisseur simulé renvoie désormais son propre émetteur dans les callbacks pour exercer ce contrôle dans la recette PostgreSQL existante. Google reste inchangé.

Aucune migration, modification du contrat/client généré, dépendance, interface ou réglage de production. Les boutons GitHub restent régis par le flag indépendant, OFF sur le VPS après la fenêtre. Aucun secret réel, compte de recette, capture ou cache n'est inclus dans ce lot.

## Contrôles locaux

L'installation figée et la génération Prisma ont réussi dans le worktree isolé. Avant correction, les sept nouveaux tests ont donné quatre réussites et trois échecs attendus : mauvaise valeur des métadonnées, rejet du callback officiel et acceptation de l'ancien émetteur incorrect. La reproduction séparée avec l'adaptateur précédent inchangé produit exactement `token_exchange / token_response_invalid` avec zéro requête de jeton. Il s'agit d'une reproduction synthétique, pas d'une lecture du callback de production.

Après correction : les sept nouveaux tests passent. Ils vérifient la configuration figée, un callback avec l'émetteur officiel atteignant l'échange et l'identité vérifiée, le callback sans `iss`, le refus de l'ancien émetteur/origine, d'un autre domaine, d'un paramètre répété et d'un state incorrect. Les refus ont lieu avant tout appel au endpoint de jeton. Le transport et l'identité sont fictifs, avec la bibliothèque OAuth réellement verrouillée.

Résultats observés : 48 tests unitaires backend réussis (dont les sept nouveaux tests) ; 200 tests PostgreSQL réussis sur la base locale isolée `127.0.0.1:5471/jokkodev_github_recipe`, dans les schémas temporaires des tests ; 149 tests du socle réussis et un test ignoré sur Windows ; lint, build complet backend/client/frontend et TypeScript réussis. Les tests PostgreSQL couvrent notamment GitHub avec le fournisseur simulé enrichi de `iss`, Google, connexion par mot de passe, sessions, liaison explicite, suspension, inscription et parcours existants. Aucun fournisseur réel, secret VPS, compte réel, SMTP ou base de production n'a été utilisé pour ces contrôles.

Le diff final comporte cinq fichiers : adaptateur GitHub, simulateur de test GitHub, sept tests d'émetteur, guide d'exploitation et présent rapport. `git diff --check` passe. Le code de l'adaptateur, du simulateur et des tests n'a pas changé après cette validation ; seules les constatations de documentation ont été complétées. Les empreintes finales et résultats détaillés sont conservés hors Git dans issuer-validation. Aucun changement du contrat ou des types générés n'est nécessaire.

GitHub Actions : ce correctif local n'est pas publié ; aucun contrôle distant ne lui est donc attribué. Le build local réussi et la recette PostgreSQL ne valent pas un contrôle GitHub Actions réussi. Les résultats de la release déployée restent distincts.

Reproduction : installation `pnpm install --frozen-lockfile`, `pnpm db:generate`, puis `pnpm --filter @jokkodev/backend build` et `node --test backend/dist/test/github-issuer.test.js`. Exécuter ensuite `pnpm test`, `pnpm test:integration` avec TEST_DATABASE_URL pointant seulement vers la base locale isolée, `pnpm lint`, `pnpm build`, `pnpm typecheck`. Ne pas transmettre le DSN privé ni utiliser ces tests sur la production. Les preuves détaillées locales restent dans `.cache/auth-github/issuer-validation`, hors Git.

## Recette réelle ultérieure

Après validation du correctif et déploiement séparé, relever les SHA réellement actifs, préserver le retour arrière, puis ouvrir une nouvelle fenêtre volontaire et bornée avec les paramètres privés existants. Repartir de Connexion sans ancien callback. Vérifier le résultat : compte lié correct, demande de liaison explicite pour un compte existant ou parcours d'inscription avec pseudo/mot de passe/vérification d'adresse. Confirmer ensuite Google, mot de passe et déconnexion. En cas d'échec, remettre GitHub et son diagnostic OFF et ne restituer que le diagnostic expurgé ; aucun rejeu d'un ancien code ou élargissement des permissions. La recette du correctif n'autorise pas à rouvrir automatiquement l'ancienne fenêtre déjà consommée.
