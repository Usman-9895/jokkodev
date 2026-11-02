# Lot C — Pages et preuves techniques de sécurité

Base : `3657487c811d924b5291395b0e7261ce2b7c83b0`, après fusion de #36. Branche `fix/web-security-headers`. Diagnostic et recette du 2 novembre 2026. Travail local, aucun accès SSH, commit, push ou déploiement.

## Constats de production confirmés

Quatre GET anonymes sur `/`, `/connexion`, `/api/v1/questions` et `/ppp`, sans compte ni cookie. Les pages HTML (200/404) ont nosniff, Referrer-Policy, DENY et un HSTS de 31536000 secondes ; aucune CSP, Permissions-Policy, COOP ou X-Request-Id observé. L'API a sa CSP Helmet, COOP, no-referrer, ID de requête et no-store. Ses en-têtes bruts contiennent deux HSTS : Helmet avec includeSubDomains puis nginx sans cette option.

Les constats confirment une partie du document de feuille de route, pas son intégralité. Aucun score d'analyseur de sécurité ni note du jury n'a été mesuré ou promis.

## Préparation livrée

- En-têtes de protection HTML et CSP en deux niveaux, détaillés dans la [décision 008](../decisions/008-web-security-headers.md).
- Réception de rapports CSP réellement testée avec Chromium ; seuls des compteurs de directives sont journalisés.
- Identifiant local neuf sur chaque réponse Node ; corrélation au retour du backend pour les API relayées ; pas de confiance dans l'identifiant entrant.
- Modèle nginx avec source HSTS unique au frontal, format de journal expurgé et limite du point de réception CSP. Syntaxe `listen ... ssl http2` conservée pour éviter la directive autonome plus récente dans le modèle destiné à Ubuntu/nginx 1.24.

Aucun changement backend, DTO, type généré, migration, dépendance ou règle d'authentification. L'endpoint technique CSP appartient au serveur Node ; ce n'est pas un nouveau contrôleur REST métier. Les protections IP/CSRF/cookies et le caractère non rejouable des mutations sont conservés.

## Protections existantes inventoriées

| Sujet | État du code examiné | Action du lot C |
|---|---|---|
| Santé | liveness et readiness distinctes | Réutilisées ; pas de nouveau `/health` redondant |
| Contrat | OpenAPI exportable ; Swagger absent en production | Conserver ; proposer au jury le contrat versionné et une démonstration locale, sans ouvrir Swagger publiquement |
| Connexion | 30 tentatives/IP/15 min et 5/compte/15 min ; compteur en mémoire | Aucun recalibrage arbitraire ; architecture mono-processus à documenter |
| Inscription | 20/IP/heure | Conservé |
| Contributions | question 10/utilisateur/heure, réponse 30/utilisateur/heure, signalement 20/utilisateur/heure | Conservé |
| Erreur de connexion | même `INVALID_CREDENTIALS` pour email inconnu/mot de passe erroné | Conservé ; pas de garantie générale contre tous les canaux d'énumération |
| Corps et champs | JSON/urlencoded 64 Kio, DTO stricts ; photos traitées séparément | Conservé ; limites upload du frontal à préserver |
| Métier | suites de recette comptes, solutions/points, candidatures/contact, modération déjà présentes | Ne pas inventer de nouveaux résultats PostgreSQL pour ce lot sans changement métier |

Les 144 tests PostgreSQL du dernier lot de conservation ne sont pas des tests relancés dans cette recette. Docker est devenu indisponible pendant le travail ; aucune base d'équipe utilisée en remplacement.

## Contrôles locaux réussis

- Installation figée pnpm 10.34.6 : 467 paquets. Tentative hors ligne initiale incomplète, installation normale ensuite réussie ; verrouillage inchangé.
- Prisma généré avec URL fictive inaccessible ; aucune migration ni connexion de production.
- Lint frontend/serveur/test, TypeScript frontend, builds backend/client/frontend.
- 16 tests backend compilés réussis.
- 114 tests Node frontend/client/outillage : 113 réussis, un ignoré pour une permission Windows ; aucun échec.
- Quatre nouveaux tests de comportement : rapports expurgés, limites 16 Kio avec Content-Length et chunked, quota/réouverture de fenêtre, identifiants locaux/retour amont et exclusion de l'ID visiteur.
- Smoke production : pages, robots/sitemap indisponible contrôlé, neuf aperçus 404, liveness/readiness sans base, cookies/CSRF, Swagger absent et configuration invalide.
- Chromium : onze parcours (accueil, questions, détail question, projets, détail projet, ressources, à propos, inscription, connexion, profil protégé anonyme et 404). API fictive locale et contenu explicitement fictif. En-têtes présents, zéro violation bloquante spontanée et aucun pageerror ; navigation hydratée sur ordinateur et mobile. Le profil privé n'a pas été lu avec un compte réel.
- Une sonde inline locale est exécutée ET signalée : preuve que Report-Only observe, pas qu'il protège de toute injection. Une base externe ajoutée par la recette est effectivement refusée par la politique bloquante.
- Seize événements de rapports CSP réellement reçus dans la passe Chromium. Trois ou quatre signalements de scripts inline par page observés : attendus avec Next, non corrigés par une fausse exception de sécurité.
- `/ressources` reste `x-nextjs-cache: HIT` et deux réponses ont des identifiants distincts. Aucun TTFB terrain ni score A+ revendiqué.

Le lint a d'abord signalé deux imports Node manquants (Buffer et performance) ; imports explicites ajoutés, lint/tests/build ensuite relancés avec succès. La revue automatique a interrompu une vérification TypeScript pour limite d'utilisation avant exécution ; contrôle repris et réussi après reprise du travail.

## Validation nginx non achevée

Le Docker local répondait initialement (image nginx:alpine, version 1.31.3). Lors de l'essai isolé, le socket Docker est devenu introuvable. La commande n'a donc pas prouvé la syntaxe ni la déduplication fonctionnelle. Pas de redémarrage Docker ou de service d'équipe, pas d'arrêt de conteneur tiers. Aucun succès nginx local ou Ubuntu 1.24 annoncé.

Les fichiers de certificat générés pour ce test sont auto-signés, jetables et hors dépôt, sans lien avec les certificats du site. Le modèle doit être relu et validé via `nginx -t` sur la cible avant toute publication de cette configuration en exploitation. Un merge applicatif ne met pas automatiquement à jour `/etc/nginx`.

## Limites et critères restant ouverts

- La CSP de scripts complète n'est pas bloquante : elle nécessite une stratégie compatible avec Next et les futurs ajouts (thème, PWA). Ne pas la basculer simplement après 24 h malgré les violations inline connues.
- La collecte agrégée sacrifie les URL et extraits pour la confidentialité ; elle ne permet pas de localiser chaque script ni d'authentifier chaque rapport.
- Corrélation par requête HTTP, pas de trace distribuée complète des sous-requêtes SSR.
- Configuration nginx réellement active, héritage des directives, rotation des journaux et TLS du VPS restent à vérifier. Les journaux existants nginx/journald ne sont pas automatiquement expurgés par ce nouveau format.
- Les en-têtes applicatifs du lot C ne sont pas déployés. La correction HSTS a ensuite été appliquée par Ousmane dans le seul virtual host JokkoDev ; voir la vérification ci-dessous.
- Recette HTTP locale, pas de nouveaux parcours PostgreSQL/SMTP réels, de test physique, lecteur d'écran, Safari/Firefox ou CI distante.

## Étape opérateur nécessaire

Avant d'écrire une procédure de modification ciblée, recueillir `nginx -v`, le résultat de `sudo nginx -t` et les directives actives pertinentes (server_name, HSTS, proxy_hide_header, formats/access_log). Ne pas transmettre une configuration complète susceptible de contenir des secrets.

Après validation du code : revue indépendante Ousmane/Serge, publication par PR vers develop sans fusion automatique, sauvegardes, préparation de release et tests de santé. La modification nginx doit être un diff minimal du virtual host JokkoDev existant, préservant les ACL publiques, autres applications, ACME, domaines, certificats, limites et routage IP. Sauvegarder ce fichier, vérifier nginx -t, puis recharger. Compter les HSTS bruts et contrôler les parcours réels et la réception de rapports expurgés.

Retour arrière séparé : ancien lien de release pour le code ; copie du virtual host pour nginx, avec nginx -t avant recharge. Aucun retour arrière de base requis. Le lot C reste une préparation avec réserve nginx et CSP complète, pas une déclaration de sécurité totale.

## Vérification HSTS sur le VPS après intervention opérateur

Ousmane a confirmé nginx 1.24.0 (Ubuntu), le lien actif vers /etc/nginx/sites-available/jokkodev et le bloc HTTPS de JokkoDev. Il a exécuté le bloc de sauvegarde et d'ajout de proxy_hide_header Strict-Transport-Security, avec nginx -t réussi puis rechargement. La première requête affichait encore deux HSTS ; la cause de ce résultat transitoire n'a pas été démontrée.

Le contrôle externe ultérieur, GET anonymes avec nouvelles connexions TCP, a constaté HTTP 200 et exactement un en-tête Strict-Transport-Security: max-age=31536000 sur /api/v1/questions et /. La déduplication HSTS est donc confirmée sur ces réponses. Cela ne valide ni le nouveau format de journal nginx, ni son emplacement de réception CSP, ni les modifications applicatives toujours locales. Aucune autre modification serveur effectuée par l'agent.

## Validation et publication

Ousmane autorise la publication du lot C le 2 novembre 2026 : commit et PR normale vers `develop`, sans fusion automatique ni déploiement. Les contrôles locaux sont réutilisés après vérification des fichiers inchangés ; la correction HSTS opérateur est indépendante de cette publication. Le modèle nginx complet et ses nouvelles directives de journalisation/réception CSP restent à valider sur la cible avant application. La revue indépendante Ousmane/Serge reste requise.
