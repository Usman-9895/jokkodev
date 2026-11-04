# 009 — PWA et lecture publique hors connexion

État : recette fonctionnelle et visuelle du lot E validée par Ousmane ; publication en PR autorisée. Base `81d5e54370dc03bcf87a392c115c67855dfd0171`, branche `feature/pwa-offline-reading`. Fusion et déploiement restent des étapes distinctes non autorisées ici.

## Frontière de données retenue avant extension

Le layout Next comprend un SessionProvider et un header hydraté. Les questions/projets utilisent des lectures publiques REST no-store, des instantanés SSR et des mutations/modérations pouvant retirer une publication. Les pages RSC et leurs préchargements ne sont donc pas une archive admissible. Un cache générique des navigations pourrait republier une information privée ou devenue indisponible.

Le lot conserve **uniquement des documents de lecture rédigés sans session** : `/hors-connexion` et `/lecture-hors-connexion/ressources`. Ces handlers Next statiques renvoient du HTML complet, hors layout React, sans appel API ni donnée de compte. Les trois guides viennent de la source existante `lib/information/resources.ts`, sans recopier une autre version du texte. Les liens documentaires externes restent en ligne. Leur HTML porte noindex et `X-JokkoDev-Public-Reading: 1` ; cette marque ne doit jamais être conservée si la route acquiert des données de compte.

`/ressources` reste une page Next normale en ligne. Une navigation documentaire vers cette URL, sans paramètres, reçoit la copie de lecture seulement si le réseau échoue. Il ne s'agit pas d'enregistrer son HTML Next. D'autres navigations publiques explicitement listées peuvent recevoir la page de secours, jamais une copie de question ou projet. Les détails, profils, comptes, espaces personnels, administration, API, CSP collector, RSC, paramètres et mutations ne sont pas interceptés. Un lien vers un parcours exclu peut donc aboutir à l'erreur hors ligne native du navigateur ; rien ne simule une connexion ou une action réussie.

## Stockage borné

Liste fermée de 13 documents/assets : les deux HTML, CSS de lecture, JS de lecture, JS des commandes PWA, initialisation des thèmes, tokens, deux polices locales existantes, deux logos horizontaux validés et deux icônes PNG. Pas de JS/CSS `_next`, cache RSC, réponse API, cookie, session, candidature, signalement, profil ou contact. Les fichiers sont demandés avec credentials omit et redirections refusées. Toute réponse non réussie, privée/no-store, avec Set-Cookie, Vary Cookie/Authorization ou type RSC est refusée. Les Vary RSC ajoutés automatiquement par Next ne sont tolérés que sur les deux HTML explicitement marqués, dont la construction est entièrement anonyme.

Préfixe réservé `jokkodev-public-reading-v1-`, version issue de `.next/BUILD_ID`. Une copie dure **24 heures**, mesurées par Date.now côté navigateur ; un recul d'horloge invalide la fraîcheur. Maximum 3 Mio par entrée et 8 Mio par version, 13 entrées fixes ; au plus version active + candidate et une métadonnée de version (16 Mio de plafond de payload pour deux versions). Les versions candidates abandonnées sont nettoyées à l'installation suivante ; l'activation retire les anciennes versions appartenant à ce seul préfixe. Aucun nettoyage d'autres caches.

Les corps sont validés avant écriture. Le document de secours est écrit en dernier comme marqueur de copie complète ; une lecture concurrente attend le renouvellement déjà engagé. Un échec d'installation retire la copie candidate et laisse le worker courant en place. Un renouvellement de copie expirée peut être demandé au retour en ligne ; aucun événement métier n'est mis en file. Éviction par le navigateur, refus du stockage ou fermeture anticipée peuvent rendre la copie indisponible. Après expiration sans réseau, réponse texte 503 honnête, sans proposer des guides prétendument présents. Les octets expirés non consultés ne peuvent être effacés par une tâche garantie navigateur fermé ; ils sont refusés en lecture puis retirés à l'accès, au renouvellement ou au nettoyage.

Le worker force le réseau sans repli implicite du cache HTTP pour les requêtes qu'il gère ; en cas d'échec, il examine sa copie bornée. Cela ne désactive pas le cache statique serveur Next (HIT conservé). Les requêtes hors périmètre suivent leurs règles existantes. Les copies stockées ne conservent pas les identifiants serveur ni les en-têtes de transfert/compression invalidés par leur reconstruction. Les réponses hors ligne ont X-JokkoDev-Offline: 1 et no-store ; aucun nouvel identifiant serveur n'est inventé.

## Installation et mises à jour

Manifeste à identité stable `/`, lancement `/ressources`, scope `/`, standalone, charte bleu nuit et exports PNG du SVG compact officiel (ratio conservé, variante maskable avec zone sûre). Le splash natif utilise la couleur de marque fixe ; le thème mémorisé est appliqué dans le document par le script existant. Aucun écran natif clair/sombre dynamique n'est promis.

Une proposition Installer n'apparaît qu'après beforeinstallprompt. Refus/pas maintenant mémorisé sept jours, distinct du thème ; indisponibilité du stockage gérée en mémoire. Aucune imitation du prompt d'installation ou promesse d'installation iOS/Firefox. Les navigateurs peuvent conserver leurs propres commandes d'installation, indépendamment de cette proposition.

Une nouvelle version attend. L'utilisateur reçoit Actualiser ; si un formulaire existe, un dialogue natif place le focus sur Continuer ma saisie, accepte Échap et conserve la saisie en cas d'annulation. Le message explicite d'activation autorise skipWaiting ; seul l'onglet demandeur se recharge sur controllerchange. Les autres onglets ne sont pas rechargés. La première activation et la fermeture naturelle de tous les anciens clients suivent le cycle navigateur standard.

## Sécurité et exploitation

Les politiques HTML du lot C, le collecteur, le transport API, l'observation sans URL/corps et les métadonnées SEO restent en place. Le script worker a sa propre CSP restrictive same-origin ; aucune exception inline n'est ajoutée aux documents Next. Les documents hors ligne ne contiennent pas de script inline. Les fontes et logos existants sont servis sans nouvelle dépendance, licence ou codec natif. Le routage custom conserve CSP collector puis API avant les seuls endpoints PWA.

Le worker `/sw.js` est no-store et désactivé (404) en développement, y compris pour les aperçus. Le lot fournit une recette sur build de production local. Aucun raccourci environnemental pour exposer le worker sur les pages dev n'est ajouté.

Une désactivation opérationnelle explicite `JOKKODEV_PWA_DISABLED=1` sert à la même URL un worker de retrait : activation, suppression du seul préfixe possédé et désinscription, sans handler fetch ni rechargement des onglets. Ce flag est seulement préparé, pas activé sur un environnement réel. Un rollback applicatif seul n'efface pas un ancien worker déjà installé : voir le [guide d'exploitation et nettoyage](../frontend/pwa-offline-reading.md).

## Références consultées

- [MDN — Using Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers) : cycle, installation et caches.
- [MDN — Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable) : manifeste et différences de navigateurs.
- [MDN — skipWaiting](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting) : activation d'un worker en attente, utilisée après décision explicite.
