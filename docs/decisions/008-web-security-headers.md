# 008 — En-têtes HTML, observation CSP et identifiants de requête

État : proposition locale du lot C, à relire par Ousmane et Serge. Base `3657487c811d924b5291395b0e7261ce2b7c83b0`. Ne constitue pas une validation de la configuration active du VPS.

## Politique HTML en deux niveaux

Les pages Next reçoivent COOP `same-origin` et une Permissions-Policy interdisant caméra, microphone, géolocalisation et paiement, fonctions non employées actuellement. La politique Referrer-Policy existante reste `strict-origin-when-cross-origin` pour les pages ; l'API conserve `no-referrer`. La différence est intentionnelle : navigation publique avec référent limité entre origines, aucune transmission de référent depuis les réponses API.

Une CSP bloquante limitée applique `base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'`. Elle protège ces usages, pas l'exécution de tout script injecté. La politique complète est placée en `Content-Security-Policy-Report-Only`, sans exception `unsafe-inline` pour les scripts. Next émet des scripts inline : leurs signalements sont attendus et ne doivent pas être traités comme une attaque confirmée.

Pas de nonce factice ou partagé. La documentation Next indique que les nonces par requête exigent le rendu dynamique et désactivent le rendu statique/ISR. Une politique bloquante complète nécessite donc une décision distincte : rendu dynamique des segments concernés et nonces réels, ou stratégie de hachage compatible et prouvée. La stratégie de hachage expérimentale du framework n'est pas activée automatiquement. Le thème sombre et sa future initialisation devront être vérifiés avant activation d'une politique de scripts bloquante.

## Observation privée et bornée

Le serveur Node reçoit `POST /security/csp-report` hors de l'API REST Nest. Ce point technique n'exige ni session ni CSRF : il ne réalise aucune action métier et ne conserve aucun rapport brut. Un tiers peut forger des rapports ; ils ne servent jamais à suspendre un compte, modifier un quota de connexion ou prendre une décision automatique de sécurité.

Types acceptés : `application/csp-report` et `application/reports+json`. Corps maximal 16 Kio, 60 requêtes POST par minute et par processus, dix rapports traités par requête. Les dépassements renvoient 413/429 ; les rapports malformés 400 et les méthodes non prévues 405. Le modèle nginx ajoute également une limite de corps et un contrôle de débit. Aucune dépendance, base, table ou clé supplémentaire.

Seuls les compteurs par directive d'une liste fermée sont journalisés. Aucune URL, query string, sourceFile, script-sample, blocked-uri, document-uri, identité ou contenu du rapport ne figure dans les événements. Le corps n'est jamais retransmis à un service externe. Les journaux restent soumis aux limites d'espace et de conservation de l'exploitation ; le quota limite la réception, il ne garantit pas la collecte exhaustive des violations. `report-uri` est retenu pour sa compatibilité et sa destination relative à l'origine, y compris en recette locale. Il est déprécié ; une évolution `Reporting-Endpoints`/`report-to` reste possible après validation des origines et navigateurs.

## Corrélation sans confiance dans le visiteur

Le serveur Node produit un UUID pour chaque réponse, y compris si Next sert une page de son cache. Les journaux `web_request` contiennent uniquement événement, UUID, méthode, statut et durée. Aucun identifiant reçu du visiteur n'est utilisé. Le relais retire `X-Request-Id` entrant et ne conserve dans la réponse qu'un UUID syntaxiquement valide émis par le backend de confiance. Sur une réponse API relayée, Node et Nest partagent ainsi l'identifiant de réponse ; si l'amont ne fournit pas un ID valide, Node conserve son UUID local.

Le modèle nginx journalise son `$request_id` et `$upstream_http_x_request_id` en JSON échappé, avec méthode, statut et durée, sans URL ni adresse IP. Cela rapproche nginx du service qui répond. Les sous-requêtes serveur Next vers Nest ont leurs propres identifiants : aucun traçage distribué complet d'un chargement de page n'est revendiqué. Pas de propagation aveugle d'un ID navigateur, ni de modification de la frontière IP de la décision 006.

## Source unique HSTS à la frontière HTTPS

Conserver HSTS dans Helmet pour les réponses directes de l'API. Sur le frontal HTTPS nginx, `proxy_hide_header Strict-Transport-Security` retire la valeur de l'amont et l'unique `add_header ... always` existant fournit `max-age=31536000`. Cela ne doit pas être déployé en retirant le seul HSTS du serveur par erreur, ni étendu à tous les sous-domaines sans validation HTTPS de ceux-ci.

Le modèle est un exemple de configuration, pas une copie à appliquer au serveur. Vérifier les `location`, les héritages `add_header`/`proxy_hide_header`, les limites d'upload, les challenges ACME, les certificats, les ACL et les autres virtual hosts. Les autres applications hébergées ne doivent pas être modifiées.

## Sources consultées

- [Next.js — Content Security Policy](https://nextjs.org/docs/app/guides/content-security-policy) : implications des nonces sur le rendu et le cache. Documentation courante plus récente que Next 16.4.2 installé ; comportement local vérifié séparément.
- [MDN — Content-Security-Policy-Report-Only](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy-Report-Only) : observation et mécanismes de rapport.
- [nginx — proxy_hide_header](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_hide_header) : suppression d'un en-tête de réponse d'amont.
