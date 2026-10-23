# Vérification locale et conservation

## Ressources

- Worktree correctif : `D:\DEV\JokkoDev\.cache\lot21\worktree` ; audit préservé : `D:\DEV\JokkoDev\.cache\lot20\worktree`.
- Bases nouvelles : `jokkodev_security21` / `jokkodev_security21_it`, PostgreSQL 17.11 sur 127.0.0.1:55475. La seconde est réservée aux schémas temporaires des tests ; aucune base d’équipe n’a été réinitialisée.
- Config et comptes : `.cache/verification/env.json`, `.cache/verification/accounts.json`. Les ouvrir **dans un éditeur local**, sans publier leur contenu. Clés des comptes : owner, member, other, admin, suspended (ce dernier volontairement suspendu). Ces données ne sont pas des fixtures du produit.
- Email JSON local : `.cache/verification/mail` ; stockage photo : `%TEMP%/jokkodev-security21-avatars`. Liens lus après JSON.parse, tokens jamais imprimés.
- Recette propre : frontend 33300, API 33301 ; tests IP 33303/33304 ; nginx API dédiée 33305 ; smoke 33310/33311 ; debug Chrome 9296. Tous ces ports sont réservés aux seuls processus de ce lot pendant les essais et vérifiés libres avant démarrage.

## Rejouer sans modifier une recette d’équipe

Ne pas écraser les fichiers privés ni recréer les bases peuplées. Vérifier destination, propriété de la recette et ports avant toute commande. Depuis le worktree, Node 24.15.0 et pnpm 10.34.6 :

```powershell
$env:PNPM_CLI='D:/DEV/JokkoDev/.cache/npm/_npx/168ca33e231eaaf0/node_modules/pnpm/bin/pnpm.cjs'
# Chaque tâche lit seulement la configuration privée dédiée et contrôle ses destinations.
$env:SECURITY_CHECKS='validate,generate,contract,lint,typecheck,unit,integration,security-ip'
node scripts/security/run-checks.mjs
```

`migrate,migrate-replay,catalogue,catalogue-replay,build` sont aussi disponibles. Les lancer seulement après vérification explicite de cette destination ; le catalogue est idempotent, pas un seed de comptes. Arrêter notre frontend avant de reconstruire son `.next`. Aucun `db push`.

```powershell
node scripts/security/start-local.mjs
# http://127.0.0.1:33300 ; API http://127.0.0.1:33301/api/v1
node scripts/security/stop-local.mjs
```

L’environnement est arrêté à la livraison ; ses données restent disponibles pour revue. `start-local` refuse les ports occupés, conserve les PIDs ; `stop-local` vérifie PID+port avant arrêt. Ne pas utiliser ce lanceur pour redémarrer un service d’équipe ou une recette antérieure.

`pnpm test:security-ip` est aussi exécutable indépendamment : fournir **explicitement** `SECURITY_DATABASE_URL`, `SECURITY_CONFIRM_DATABASE` et éventuellement `SECURITY_BASE_PORT` dans l’environnement, pas dans la ligne de commande. Seules `jokkodev_security21` et la base CI éphémère `jokkodev_ci` sur 127.0.0.1 sont acceptées. Il contrôle la base effective, ne migre rien, démarre/arrête uniquement son backend et son relais, utilise de vrais sockets 127.0.0.1/127.0.0.2 et une identité aléatoire inexistante. `SECURITY_WEB_PORT=33300` ajoute un contrôle du vrai serveur web de cette recette ; il doit déjà être démarré avec l’origine cohérente. Le script est ajouté à la CI sur son PostgreSQL éphémère, sans secret production.

## Scénarios ponctuels et preuves

- `reproduce-sec20.mjs` : reproduction **historique avant correction**, attend l’ancien contournement. Ne pas l’employer comme test de réussite après correction. Voir `before-proof.json`.
- `business-regression.mjs` : initialise cinq comptes et contenus jetables, refuse un fichier de comptes existant. La passe initiale de ce lot a produit 83 assertions réussies. Ne pas le relancer aveuglément sur la base déjà peuplée ; revoir des fixtures neuves et destinations si une nouvelle campagne est autorisée.
- `api-relay.test.mjs` et `security-proxy-outcome.test.mjs` dans les tests racine : corps/cookies/CSRF/headers/erreurs, requête unique et classification d’incertitude. Pas de dépendance réseau externe.
- `nginx-regression.mjs` : Docker Desktop local, pair TCP préalablement mesuré dans `docker-peer.json`. Crée son seul réseau et ses conteneurs étiquetés ; clients distincts par IP réseau effective, pas XFF ; nettoie ces ressources et ferme son seul backend. Configuration HTTP API ciblée, pas une validation TLS SystaLink ou un inventaire système. Les images déjà disponibles ont été utilisées, aucun service payant créé.
- `smoke-isolated.mjs` : copie runtime ignorée, build séparé puis deux smoke. Refuse une copie existante ; après inspection, `SECURITY_SMOKE_RESUME=1` reprend la même copie. Garder ses fichiers serveur à jour avant un nouveau build. Aucun résultat antérieur à Next 16.4.2 n’est réutilisé.

Journaux ignorés `.cache/verification/logs/`, Chrome et captures `.cache/verification/screenshots/` (`public-profile-marker.png`, `question-marker.png`). Le harnais CDP local utilisé est `.cache/verification/browser-regression.mjs`, adapté du lot 20 ; `INFORMATION_REVIEW_REUSE=1` pour notre serveur existant. Il bloque les destinations non locales, ne publie pas les cookies et ferme son seul Chrome. Les captures sont publiques/fictives, sans écran de mot de passe. Les tests API ont retiré certains projets et suspendu leur compte fictif dédié : ne pas présenter chaque fixture comme encore active.

Le bootstrap spécifique au poste, `.cache/lot21/prepare.mjs` dans le dossier principal ignoré, a créé uniquement les deux nouveaux noms après refus d’existant et contrôle de vacuité. Il lit une configuration de cluster en mémoire, sans l’imprimer ; ne pas en faire une procédure de migration de production. Une autre machine nécessite ses propres ressources vérifiées et une adaptation revue des garde-fous, pas la copie d’identifiants.
