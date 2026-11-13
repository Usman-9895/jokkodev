# GitHub — configuration et recette locale

Lot local prêt pour revue, non publié. [Décision et protections](../decisions/012-github-auth.md), [résultats de recette](../frontend/github-auth-verification.md). Aucun secret ou compte personnel ne doit être transmis dans le chat, une capture ou Git.

## Créer le client GitHub

Dans le compte ou l'organisation propriétaire autorisé : **Settings → Developer settings → OAuth Apps → New OAuth App**. Créer une **OAuth App** pour ce parcours. Utiliser un client local distinct du client de production futur, même si la console permet plusieurs callbacks pour un client. Renseigner le nom JokkoDev et l'accueil de l'environnement, puis exactement son callback :

| Environnement | Accueil | Authorization callback URL |
|---|---|---|
| Aperçu de ce lot | `http://localhost:3070` | `http://localhost:3070/api/v1/auth/github/callback` |
| Développement standard, si APP_ORIGIN utilise ce port | `http://localhost:3000` | `http://localhost:3000/api/v1/auth/github/callback` |
| Production future, client distinct | `https://jokkodev.com` | `https://jokkodev.com/api/v1/auth/github/callback` |

Ne pas mettre le port API interne 3071, `/connexion/github`, un wildcard ou une query. L'aperçu s'ouvre sur `localhost`, pas `127.0.0.1`. Le produit demande explicitement `user:email` seulement ; aucun accès aux dépôts ni Device Flow n'est nécessaire. Conserver Client ID et Client Secret côté serveur. Une ancienne autorisation plus large du même client est refusée par le produit : retirer cette autorisation dans GitHub et repartir avec le client dédié plutôt que d'ajouter des scopes.

Le lot utilise le jeton reçu immédiatement pour l'identité, puis le laisse en mémoire seulement pendant cet échange ; il ne persiste ni jeton d'accès ni refresh token et ne demande pas `offline_access`. Il n'a donc pas besoin de renouveler un jeton pour une connexion ultérieure : chaque connexion recommence le flux volontaire. Ne pas désactiver l'expiration des jetons pour cette intégration.

Source : [création d'une OAuth App](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app), [échange serveur et callback](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps). Les libellés peuvent varier selon la console et les politiques de l'organisation. Aucun vrai client GitHub ni compte réel n'a été utilisé pour la recette de ce lot.

## Diagnostic d'un échec réel

Le retour utilisateur reste générique pour éviter d'exposer des détails du fournisseur. Si un essai réel échoue, désactiver d'abord GitHub avec la procédure de la release déployée, conserver Google et le mot de passe, puis vérifier la configuration et la connectivité. Un contrôle de client/secret accepté ne valide pas l'échange du code OAuth, les scopes ni la lecture des adresses.

Le diagnostic serveur optionnel `GITHUB_AUTH_DIAGNOSTICS_ENABLED=1` ajoute uniquement des événements d'échec `github_auth_failed` avec les champs fixes `event`, `stage`, `reason` et, lorsqu'il est connu, un `status` HTTP entier. Il vaut **0 par défaut**, n'active pas GitHub, n'accorde aucune permission et ne modifie ni les réponses utilisateur, ni la validation OAuth, ni les sessions, ni la liaison. Aucun événement de succès n'est émis. Google n'utilise pas ce diagnostic.

| `stage` | Contrôle concerné |
|---|---|
| `token_exchange` | Échange et validation de la réponse de jeton |
| `granted_scope` | Scope exact `user:email`, absence ou permissions supplémentaires refusées |
| `identity_request` / `identity_response` | Requête `/user` et identifiant stable |
| `emails_request` / `emails_response` | Requête `/user/emails` et structure de réponse |
| `verified_email` | Présence d'une adresse vérifiée |
| `callback` | Contrôles du retour et suite du traitement interne, dont base de données |

Exemple sans donnée privée : `{"event":"github_auth_failed","stage":"emails_request","reason":"http_error","status":403}`. Les catégories sont une liste fermée ; aucun message ou objet d'exception n'est sérialisé. Ne sont jamais inscrits : corps ou description de réponse, URL, code OAuth, state/nonce/PKCE, cookie, jeton, secret, scope brut, adresse, identifiant de compte ou stack. Les échecs d'écriture du diagnostic ne doivent pas remplacer le résultat d'authentification. Un échec de protocole n'est pas réinscrit une seconde fois par le contrôleur.

Après revue et déploiement de ce code, l'opérateur peut activer le diagnostic sur une fenêtre courte, avec une seule nouvelle tentative volontaire autorisée et une surveillance simultanée du journal. Lire uniquement les événements JSON conformes à ces champs et catégories ; ne pas copier un journal brut dans le chat. Les journaux suivent la conservation d'exploitation existante, sans fichier de trace séparé ni stockage de données OAuth. Après lecture, remettre le flag à0 et redémarrer l'API selon la procédure validée de la release. En cas d'échec réel, désactiver GitHub et son nettoyage avant de poursuivre l'analyse. Ne pas rejouer l'ancien callback, élargir les scopes, contourner une validation ou réactiver automatiquement GitHub à partir d'un statut de diagnostic.

Ce mécanisme est un ajout de diagnostic : il ne constitue pas une correction démontrée d'un échec réel. La cause du parcours de production et la réussite d'une connexion GitHub réelle doivent être consignées séparément des simulations et tests locaux.

## Environnement local

Dans le worktree `.cache/auth-github/worktree/backend/.env`, ignoré par Git :

```dotenv
GITHUB_AUTH_ENABLED=0
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI=http://localhost:3070/api/v1/auth/github/callback
APP_ORIGIN=http://localhost:3070
PORT=3071
SESSION_COOKIE_SECURE=false
```

Conserver les autres paramètres préparés, notamment le DSN de la base locale isolée `127.0.0.1:5471/jokkodev_github_recipe`, le secret CSRF et le transport mail **file**. Rien à saisir dans `NEXT_PUBLIC_*`. `frontend/.env.local` contient seulement l'upstream privé `API_INTERNAL_ORIGIN=http://127.0.0.1:3071`. Le flag est indépendant de `GOOGLE_AUTH_ENABLED` ; activé, il exige un client/secret et un callback égal exactement à APP_ORIGIN + chemin ci-dessus.

L'aperçu livré est lancé avec **GitHub et Google simulés** ; la surcharge existe uniquement dans le lanceur de recette hors du produit. Le fichier .env garde les fournisseurs désactivés par défaut. Les écrans de fournisseur portent explicitement la mention de simulation ; aucun mot de passe GitHub/Google réel ne doit y être saisi.

Depuis la racine, si l'aperçu n'est plus démarré et les ports sont libres :

```powershell
node .cache/auth-github/start-preview.cjs --simulated
```

API3071, frontend3070, GitHub simulé3072 et Google simulé3073. Les PID propres à cet aperçu figurent dans `.cache/auth-github/runtime/processes.json` ; ne pas lancer de doublon ou arrêter les autres projets. Pour un futur essai **GitHub réel**, arrêter uniquement cet aperçu identifié, saisir le client local réel et le flag1 dans backend/.env, puis relancer sans `--simulated`. Google réel exige sa propre configuration valide ; le laisser à0 si elle n'est pas prévue. Rien n'est à modifier sur le VPS dans cette recette.

## Parcours de recette manuel

1. Ouvrir `/connexion` puis `/inscription`. Vérifier les deux boutons en Clair/Sombre, leur accès par Tab et le formulaire e-mail habituel. Le bouton GitHub disparaît quand son statut est désactivé ; Google reste indépendant.
2. Choisir GitHub simulé. Garder un identifiant **numérique** fictif stable, une adresse fictive `example.test` neuve et l'option adresse vérifiée. Terminer avec pseudo et mot de passe JokkoDev ; vérifier l'adresse avec le message local dans `.cache/auth-github/runtime/mail/`. Ces fichiers restent hors Git.
3. Se déconnecter puis reprendre GitHub avec le même identifiant et une autre adresse fictive : le compte JokkoDev initial doit revenir. La liaison ne change pas son adresse. Vérifier ensuite le mot de passe JokkoDev.
4. Créer un compte ordinaire par Inscription, vérifier son adresse et se déconnecter. Choisir une nouvelle identité GitHub et l'adresse de ce compte : aucune session automatique. Saisir le mot de passe JokkoDev pour ouvrir sa session, puis le saisir de nouveau et choisir « Confirmer la liaison avec GitHub ». Le compte reste le même. Une mauvaise confirmation, un autre compte ou une adresse JokkoDev non vérifiée doit refuser la liaison.
5. Décocher « Adresse vérifiée » dans le fournisseur simulé : message clair, aucun compte créé. Tester Annuler et un callback invalide/rechargé : erreur propre, reprise volontaire depuis Connexion. Aucun code/state dans l'URL finale.
6. Les tests PostgreSQL suspendent des membres fictifs de leur schéma temporaire et vérifient le refus GitHub et mot de passe, ainsi que les régressions Google. Aucun compte réel n'est suspendu. Une suspension de recette manuelle éventuelle doit rester dans cette base locale et passer par l'administration habituelle.

Reproduction automatisée après installation figée, génération et build, avec le DSN local vérifié dans TEST_DATABASE_URL : `pnpm test`, `pnpm test:integration`, `pnpm lint`, `pnpm typecheck`, `pnpm build`. Les tests d'intégration appliquent toutes les migrations dans des schémas temporaires de la base de test. Le lanceur de captures local `.cache/auth-github/browser-recipe.cjs` utilise un Chromium headless installé sur ce poste ; ce chemin d'outillage n'est pas une dépendance du dépôt.

## Migration, nettoyage et retour arrière futurs

Migration **20261112090000_github_auth** : GitHubIdentity et GitHubFlow, FK User, uniques sub/userId et browserHash/stateHash, contraintes de phase et de longueur des hashes. Aucun changement des tables existantes. Sur une base existante : vérifier destination et autorisation, sauvegardes/empreintes, rôle migrateur propriétaire et compatibilité du retour arrière ; appliquer uniquement `pnpm db:migrate:deploy`, jamais db push. Runtime : SELECT/INSERT GitHubIdentity ; SELECT/INSERT/DELETE GitHubFlow, aucun UPDATE ou DDL requis. Les rôles Google/Notifications n'ont besoin d'aucun droit supplémentaire.

`pnpm github:prune --confirm-database <base-vérifiée> --confirm-host <hôte:port>` simule le nettoyage. `--execute` supprime seulement les demandes expirées, avec `--batch` de 1 à 1000 (1000 par défaut). `GITHUB_FLOW_DATABASE_URL` doit être le DSN dédié de maintenance, SELECT/DELETE GitHubFlow seulement, sans accès User/identités/mail. Ne pas utiliser les secrets locaux en production. Modèles `infra/systemd/jokkodev-github-flow-prune.{service,timer}`, lien `/opt/jokkodev/github`, environnement root protégé `/etc/jokkodev/github-flow-prune.env`, fréquence cinq minutes : **non installés/non activés par ce lot**. L'expiration de capacité n'implique pas son effacement à dix minutes ; surveiller erreurs et lots pleins.

Un futur retour arrière commencera par `GITHUB_AUTH_ENABLED=0`, redémarrage et contrôle de l'API réelle, arrêt du seul timer GitHub, puis restauration des releases explicitement relevées. Préserver Google, notifications, liaisons, comptes et historique ; aucun rollback SQL ou restauration de base. Les membres créés via GitHub possèdent un vrai mot de passe JokkoDev. Aucune commande de bascule de production n'est inventée dans ce lot local.
