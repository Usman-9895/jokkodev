# Google — configuration et recette locale

Livraison locale, activation de production non autorisée par ce lot. Voir la [décision de sécurité et de parcours](../decisions/011-google-auth.md) et le [rapport de recette](../frontend/google-auth-verification.md). La base isolée de recette est `jokkodev_google_recipe` sur `127.0.0.1:5470`, distincte des précédentes recettes et de toute production.

## Google Cloud Console

1. Ouvrir un projet Google Cloud de recette autorisé, puis **Google Auth Platform** (ou APIs & Services / OAuth consent screen selon la console). Préparer Branding : nom JokkoDev, adresse d’assistance contrôlée par l’équipe, domaine autorisé, liens réels de confidentialité et d’accueil. Ne pas inventer une validation Google déjà obtenue. Pour la recette locale, utiliser un projet/client distinct de la production.
2. Dans Audience, choisir l’audience adaptée à l’équipe. Pour une application externe en mode Testing, ajouter explicitement les comptes Google de test autorisés. Ne pas saisir de compte fictif `example.test` dans Google : ces adresses servent uniquement au fournisseur simulé local. Les prérequis de vérification Google et de publication du consentement restent à confirmer dans la console réelle.
3. Dans Clients / Credentials, créer un **OAuth client ID de type Web application**. Enregistrer exactement l’URI de retour ci-dessous. Le lot n’utilise pas Google Identity Services côté navigateur : aucune origine JavaScript Google ni API Gmail/Drive n’est nécessaire au parcours serveur. Si la console demande une origine, utiliser uniquement l’origine exacte de l’environnement concerné.
4. Dans Data Access, limiter les données à OpenID et adresse e-mail (`openid`, `email`, éventuellement affiché comme `userinfo.email` par la console). Pas de profil, contacts, Gmail, Drive ou accès hors ligne.
5. Copier client ID et secret directement dans l’environnement serveur local indiqué ci-dessous. Ne pas les transmettre dans le chat, captures, terminal partagé ou dépôt. Mettre le flag à 1 seulement lorsque les deux valeurs et le callback sont configurés, puis redémarrer l’API de recette.

| Environnement | URI autorisée exacte |
|---|---|
| Aperçu de ce lot | `http://localhost:3060/api/v1/auth/google/callback` |
| Développement standard, seulement si APP_ORIGIN utilise ce port | `http://localhost:3000/api/v1/auth/google/callback` |
| Production future, client distinct | `https://jokkodev.com/api/v1/auth/google/callback` |

L’aperçu ouvre `localhost`, pas `127.0.0.1`. Ne pas enregistrer le port API interne 3061, de wildcard, query ou chemin frontend `/connexion/google` comme callback. Google renvoie le code au backend via le proxy de même origine.

Sources officielles : [configuration du client Web et flux serveur](https://developers.google.com/identity/openid-connect/openid-connect), [branding du bouton](https://developers.google.com/identity/branding-guidelines). Les intitulés de console peuvent évoluer ; suivre le parcours officiel du projet utilisé.

## Variables et modes d’aperçu

Dans le worktree local `.cache/auth-google/worktree/backend/.env`, fichier ignoré par Git :

```dotenv
GOOGLE_AUTH_ENABLED=0
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3060/api/v1/auth/google/callback
APP_ORIGIN=http://localhost:3060
PORT=3061
SESSION_COOKIE_SECURE=false
```

Conserver la connexion PostgreSQL locale dédiée, CSRF_SECRET aléatoire et le transport mail **file** déjà préparés dans ce fichier ; ne pas remplacer leurs valeurs par une configuration de production. `GOOGLE_AUTH_ENABLED=1` exige une configuration complète et un callback égal à APP_ORIGIN + chemin exact ; les erreurs de validation ne montrent que les noms des variables. Aucun secret `NEXT_PUBLIC_`. `frontend/.env.local` ne contient que l’upstream privé `API_INTERNAL_ORIGIN=http://127.0.0.1:3061`.

Un aperçu **simulé** est fourni à `http://localhost:3060/connexion`. Le fournisseur local sur 3062 affiche « Google simulé — recette locale uniquement » : JWT signés, JWKS, échange de code et PKCE réels, mais aucune connexion à Google. Ses comptes et messages sont fictifs. Il surcharge le fournisseur uniquement dans un lanceur de recette hors du produit ; aucune variable de production ne permet de choisir un fournisseur arbitraire.

Depuis `D:\DEV\JokkoDev`, démarrage explicite de ce mode :

```powershell
node .cache/auth-google/start-preview.cjs --simulated
```

Ne pas démarrer un deuxième aperçu sur les mêmes ports. Arrêter uniquement les processus de cet aperçu identifiés dans `.cache/auth-google/runtime/processes.json` avant de changer de mode. Pour un essai **Google réel**, saisir les valeurs dans backend/.env et le flag à 1, puis lancer sans `--simulated` :

```powershell
node .cache/auth-google/start-preview.cjs
```

Sans client réel configuré et avec flag0, le bouton est absent, la connexion par mot de passe reste disponible. Le client Cloud, le consentement réel, les cookies à travers Google et la réception réelle de la vérification JokkoDev restent une recette à faire par l’utilisateur ; ils ne sont pas validés par le fournisseur simulé. En transport fichier local, les liens de vérification se consultent dans `.cache/auth-google/runtime/mail/`, jamais dans Git.

## Parcours manuel local

1. Ouvrir `/connexion` ou `/inscription`, passer au clavier jusqu’à « Continuer avec Google », puis ouvrir le fournisseur. En simulation, utiliser une adresse fictive neuve et un identifiant stable fictif distinct. Sur le premier retour, choisir pseudo et mot de passe JokkoDev ; vérifier les erreurs de saisie. Le compte est MEMBER, la session est ouverte et l’écran de vérification habituel s’affiche. Consommer volontairement le lien du message local.
2. Se déconnecter, refaire le parcours avec le **même identifiant stable** ; le même compte revient. Le changement d’adresse Google ne change ni la liaison ni l’adresse JokkoDev. Vérifier ensuite la connexion par mot de passe et les pages protégées.
3. Créer un autre compte par `/inscription`, vérifier son adresse et se déconnecter. Utiliser son adresse avec un nouveau `sub` simulé : aucun accès automatique. Se connecter au compte existant, puis confirmer explicitement le mot de passe pour lier Google. Un autre compte connecté, une adresse non vérifiée, un mauvais mot de passe ou un CSRF manquant doit bloquer cette liaison. Au plus une identité par compte : une seconde liaison distincte est un conflit.
4. Réserver suspension/réactivation au compte fictif de cette base. Une suspension interdit Google et le mot de passe et invalide les sessions ; la réactivation administrative ne ressuscite pas les anciennes sessions. Ne faire aucune décision de recette sur une production.
5. Refuser le consentement, tester un retour invalide et recharger un ancien callback : message explicite, aucune session nouvelle. Annuler une demande en attente et vérifier son retrait. Une coupure ne provoque aucun renvoi automatique ; repartir volontairement depuis `/connexion` si le retour n’est plus utilisable.

Les comptes, mots de passe de recette, e-mails et captures restent dans `.cache/auth-google`, hors du commit. Les tests protocolaires versionnés sous backend/test sont uniquement des fixtures fictives.

## Migration et futur déploiement

Migration additive **20261110090000_google_auth**, dixième migration du dépôt. Avant toute base existante : autorisation, vérification du serveur/base/rôles réels, sauvegardes réussies et empreintes, SHA exact et rollback. Générer Prisma et le client HTTP selon `pnpm db:generate` et `pnpm api:generate`, construire avec installation figée. Appliquer exclusivement `prisma migrate deploy` avec le migrateur propriétaire du schéma et droit REFERENCES sur User ; jamais db push. Tables nouvelles GoogleIdentity et GoogleFlow, aucun changement des colonnes de User.

Contrôler les index uniques sub/userId, hashes du navigateur/state, expiration et CHECK ; propriétaire migrateur. Accorder au runtime SELECT/INSERT sur GoogleIdentity et SELECT/INSERT/DELETE sur GoogleFlow ; UPDATE non requis pour ce lot. Ne pas accorder de DDL ou de droits d’historique Prisma au runtime ; aucun besoin pour le worker Notifications. Vérifier les privilèges effectifs et les connexions TCP vers la base autorisée.

Déployer d’abord Google flag0, puis configurer le client réel et faire sa recette autorisée avant flag1. Vérifier les journaux privés et les cookies Secure/HttpOnly/SameSite sous HTTPS ; conserver le format de logs expurgé existant. Ne pas ajouter les paramètres OAuth au log nginx, aux erreurs Next, aux exports de traces ou à l’analytics. Aucun domaine Google supplémentaire à autoriser dans script-src, connect-src ou font-src : le bouton et la police sont servis localement ; seule une navigation volontaire quitte le site.

## Nettoyage des demandes et retour arrière

`GOOGLE_FLOW_DATABASE_URL` est une URL PostgreSQL de maintenance distincte, réservée au nettoyage. Droits CONNECT/USAGE et SELECT/DELETE sur GoogleFlow uniquement. Aucun accès requis à GoogleIdentity, User, aux mots de passe ou au secret CSRF. Ne pas copier les secrets d’un poste local. Modèles `infra/systemd/jokkodev-google-flow-prune.{service,timer}` : lien `/opt/jokkodev/google` pointant vers le backend validé, fichier root protégé `/etc/jokkodev/google-flow-prune.env`, nettoyage par lots de 1 000 toutes les cinq minutes, activation indépendante. Modèles fournis, **non installés en production**.

Depuis le backend avec cet environnement privé chargé par le mécanisme opérateur approprié :

```sh
pnpm google:prune --confirm-database jokkodev --confirm-host 127.0.0.1:5432
pnpm google:prune --confirm-database jokkodev --confirm-host 127.0.0.1:5432 --batch 1000 --execute
```

La première commande simule ; la seconde exige le flag de ligne de commande. Une demande est inutilisable après dix minutes par phase, même sans purge ; la conservation physique dépend du timer et de son suivi. Observer les compteurs selected/removed sans adresses, hash, sub ou payload. Un lot plein nécessite suivi et fréquence adaptée ; ne pas annoncer un effacement garanti à dix minutes.

Retour arrière : mettre `GOOGLE_AUTH_ENABLED=0`, redémarrer et vérifier l’API réelle ; arrêter/désactiver le timer Google si installé, puis rétablir les releases web/API explicitement relevées avant ce futur déploiement. Garder les tables, identités et historiques ; ne pas restaurer la base ni descendre le schéma. L’ancien backend ignore les tables Google ; tous les comptes créés par ce lot ont un vrai mot de passe JokkoDev et restent utilisables par ce parcours. Un navigateur encore ouvert sur le nouveau frontend recevra un refus/404 des endpoints Google indisponibles, sans conversion vers un autre mécanisme. Le choix des releases et les commandes système exactes sont à préparer lors de l’autorisation du futur déploiement, pas à deviner depuis current.

Les durées des sessions, décisions, reçus F2, données de notification et sauvegardes restent celles des guides existants. Pas de nettoyage IndexedDB ou CacheStorage privé ajouté.
