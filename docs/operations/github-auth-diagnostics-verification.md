# Diagnostic GitHub — préparation locale pour revue

Base : `origin/develop` actualisé, SHA `f963584ec190911305174e86310b23747d9ab35a`. Branche isolée `fix/auth-github-diagnostics`. Aucun commit, push, PR ou déploiement de cet ajout au moment de la recette. [Guide d'exploitation](github-auth.md#diagnostic-dun-échec-réel).

## Problème et limite du résultat

Un essai réel en production a renvoyé l'erreur générique de connexion GitHub ; GitHub et son nettoyage ont ensuite été désactivés, Google et l'accès par mot de passe conservés. Les contrôles d'exploitation ont confirmé le callback attendu, les paramètres chargés, la connectivité publique GitHub et l'acceptation du couple applicatif dans une vérification séparée de validité d'un jeton fictif. L'application est bien une OAuth App. Ces observations ne révèlent pas l'erreur de l'échange OAuth ou des lectures d'identité/adresse ; elles ne prouvent pas une connexion GitHub réelle réussie.

Cet ajout fournit un diagnostic exploitable par étape, désactivé par défaut. Il ne constitue pas encore une correction démontrée de la cause de production. Une future tentative réelle devra être volontaire, autorisée, bornée dans le temps et consignée séparément. GitHub reste désactivé sur la release de production connue ; aucun accès au VPS ou fournisseur réel n'a été effectué par ces tests.

## Périmètre

- `GITHUB_AUTH_DIAGNOSTICS_ENABLED=0` par défaut, validation stricte0/1 et indépendante de l'activation GitHub.
- Étape, catégorie fermée et éventuel statut HTTP uniquement ; erreurs OAuth en4xx et erreurs encapsulées après une réponse200 reconnues sans journaliser le contenu.
- Retours utilisateur identiques, demande `user:email` inchangée, refus des scopes absents/supplémentaires conservé. Pas de modification Google, sessions, liaisons, migration, contrat/client API, frontend ou dépendance.
- Pas de corps, description fournisseur, exception brute, stack, code OAuth, state/PKCE, cookie, secret, jeton, scope brut, adresse ou identifiant de compte dans le journal. Un échec du logger ne change pas le résultat d'authentification.
- Un seul événement pour un échec de protocole : le contrôleur n'en ajoute pas un deuxième. Les autres erreurs du callback ont leur catégorie, notamment les erreurs de base reconnues.

## Tests exécutés

Les21 nouveaux tests ciblés ont réussi sur le code final : configuration/default, succès sans trace, échange refusé/HTTP fournisseur en erreur/réponse JSON invalide/panne réseau, scopes absents ou trop larges, échec/forme de l'identité, échec/forme des adresses et absence d'adresse vérifiée, diagnostic OFF, erreurs contenant des valeurs sensibles fictives et getters piégés, statut non numérique rejeté, logger défaillant, JSON invalide du transport et erreurs du callback avec redirection inchangée. La suite backend complète a41 tests réussis, dont ces21 nouveaux.

Une première classification de l'erreur200 a été corrigée pendant la préparation : openid-client encapsule l'erreur de validation et son corps dans plusieurs niveaux de cause. La lecture est bornée et ne reprend que le code reconnu pour sélectionner une catégorie ; aucun contenu de cette cause n'est sérialisé.

La recette complète PostgreSQL local isolé a200 tests réussis, dont le nouveau test de diagnostic du callback réel NestJS. Le socle a149 tests réussis et1 test ignoré sous Windows. Lint, build de production local et TypeScript ont réussi sur cette première passe complète. La revue a ensuite ajouté la classification du statut HTTP d'un endpoint de jeton en erreur et son test unitaire ; les contrôles touchés ont tous été relancés sur le code final :41 tests backend réussis, test PostgreSQL du diagnostic réussi, lint/build/TypeScript réussis. Les autres résultats sont réutilisés : l'ajustement ne touche ni les contrôles OAuth, ni les parcours Google/mot de passe, ni les opérations métier, ni le socle/frontend/contrat.

| Contrôle local | Résultat observé |
|---|---|
| Installation pnpm figée, génération Prisma | Réussies ; aucun changement de dépendance ou lockfile |
| Backend final | 41 réussis, dont21 nouveaux tests de diagnostic |
| PostgreSQL complet | 200 réussis ; schémas temporaires et transport mail fichier |
| PostgreSQL touché, après dernier ajustement | 1 test de diagnostic relancé, réussi |
| Socle/client/contrats | 149 réussis,1 ignoré sous Windows |
| Lint, build de production local, TypeScript finaux | Réussis |
| Diff et périmètre | Aucun changement de migration, contrat/client API, frontend, dépendance ou configuration nginx/PWA |
| Fournisseurs réels | Aucun appel depuis ces tests ; GitHub réel en production reste en échec/non validé |
| GitHub Actions | Aucun run pour ce lot non publié ; distinct des résultats locaux |

La confirmation visuelle fournie par l'utilisateur classe l'application de production sous OAuth Apps. Aucune valeur OAuth réelle n'est incluse dans ce lot. En production, le dernier code connu restef963584 et GitHub reste désactivé ; aucune réactivation ou tentative réelle n'est effectuée par la préparation de ce diagnostic. Publication, revue indépendante, déploiement et tentative réelle sont des étapes ultérieures à autoriser.

## Reproduction

Installation avec `pnpm install --frozen-lockfile`, puis génération Prisma selon le README. `pnpm --filter @jokkodev/backend test` inclut les tests de diagnostic. `pnpm test:integration` utilise exclusivement `TEST_DATABASE_URL` après vérification de la destination locale isolée et applique les onze migrations dans des schémas temporaires. Le test `github-diagnostics.integration.ts` utilise une réponse GitHub simulée, le vrai traitement HTTP/NestJS et PostgreSQL ; il vérifie un seul événement expurgé, le retour générique, la consommation du flow et l'absence de compte/session/notification créés. Aucun e-mail SMTP ni identifiant Google/GitHub réel n'est nécessaire.

Exécuter aussi `pnpm test`, `pnpm lint`, `pnpm build` et `pnpm typecheck`. Aucun changement du contrat ou du schéma n'impose une nouvelle génération API ou migration ; comparer le diff et les preuves avant publication. Les journaux détaillés et les paramètres du PostgreSQL de recette restent dans le cache local ignoré, hors commit.
