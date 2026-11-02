# Lot B — Stabilité du header et de la session

Base : `50026ee57cf694f94fe58195e1bf35d5f498c334`, branche `fix/header-session-stability`. Recette locale le 2 novembre 2026. Aucune publication ou opération VPS.

## Diagnostic et comportement livré

La version précédente rendait deux `AccountNavigation` (ordinateur/mobile) et deux textes de vérification dans le HTML du header. Constat reproduit sur le build de production précédent. Le client `AccountClient.refresh` possède déjà une promesse partagée : aucun défaut de regroupement ni double appel attribuable à StrictMode n'a été démontré. Aucun changement de ce client, du provider, des cookies, du CSRF ou du contrat API.

Le header rend maintenant une seule navigation principale et une seule zone compte. Le choix de disposition relève du CSS au seuil existant de 1200 px ; le menu mobile possède un bouton accessible, les états ouvert/fermé, Échap et restitution du focus. Les liens se ferment à la navigation ; le changement de largeur ferme le menu et évite de laisser le focus dans une zone masquée.

`HeaderSession` isole la zone compte dans un Suspense avec squelette de secours. Le chargement ordinaire du store reste un état client explicite, qui affiche le même squelette : Suspense ne supprime pas magiquement cet aller-retour. Les formes sont décoratives et non focalisables, sans texte de vérification ni animation continue. Deux emplacements de taille réservée accueillent ensuite les liens anonymes ou l'identité/déconnexion. L'erreur de session garde une explication accessible ; aucun compte n'est affiché si la lecture échoue.

Le header d'administration réel réutilise `PublicHeader` ; son ancien menu de compte dupliqué est supprimé. Les autorisations serveur et le gate ADMIN restent inchangés. L'aperçu administratif conserve sa présentation de démonstration et reste interdit en production.

Une ancienne règle tablette `:has(a[href="/admin/signalements"])` augmentait la hauteur du header quand le rôle ADMIN devenait connu. Retirée après reproduction navigateur. Le lien Administration ajoute toujours une ligne au menu mobile lorsque le rôle est confirmé ; ce changement mesuré reste sous le seuil CLS ci-dessous, sans déplacement du corps de page par augmentation du header.

La navigation publique de secours dans `noscript` permet d'atteindre les pages et l'authentification sans JavaScript. Elle n'affiche aucune identité privée. Les messages de vérification utiles aux espaces protégés/formulaires restent en place : seul le texte parasite du header est supprimé.

## Rendu et performances

Pas de `cookies()` serveur, `force-dynamic`, nouveau stockage, cache de réponse privée ou dépendance. Les pages statiques restent statiques au build et `/ressources` renvoie `x-nextjs-cache: HIT` dans la recette de production locale. Les routes déjà dynamiques pour le SEO restent inchangées. Ne pas présenter toutes les pages publiques comme ISR : certaines étaient déjà dynamiques.

Sur quinze scénarios (1440, 1200, 768, 390 et 320 px × invité/membre/admin), un seul appel initial `/auth/me` observé, puis aucun nouvel appel lors de la navigation cliente vers Contact. Le provider reste partagé. Les rafraîchissements légitimes au focus, retour d'onglet, intervalle et nouvelle page complète sont conservés : aucune promesse de zéro appel ultérieur.

Hauteur du header et dimensions de la zone compte identiques avant/après résolution dans chaque scénario. CLS attribué aux sources du header mesuré avec PerformanceObserver, hors interactions récentes : maximum ~0,01084 sur la passe finale, inférieur à 0,02 dans les quinze cas. Ce sont des mesures locales avec réponses de session retardées et un backend fictif ; ni données terrain, ni garantie universelle. Le TTFB public inférieur à 400 ms n'a pas été établi pour cette nouvelle version non déployée. La présence d'un HIT ne constitue pas une mesure de TTFB.

## Vérifications exécutées

- Installation pnpm 10.34.6 figée, 467 paquets ; lockfile inchangé.
- Génération Prisma 7.10.1 avec URL fictive inaccessible, sans connexion aux bases réelles.
- Lint frontend et test de session, TypeScript frontend, builds backend/frontend/client : réussis.
- Suite Node frontend/client/outillage : 110 cas, 109 réussis, un ignoré pour les permissions de création de liens Windows ; aucun échec.
- Nouveau test comportemental : refresh simultanés regroupés, nouvelle lecture après succès, panne qui retire l'identité, nouvelle tentative et réponse anonyme.
- Smoke production sur ports dédiés 33762/33763 : pages, robots/sitemap indisponible contrôlé, neuf aperçus 404, liveness/readiness, cookies, CSRF, absence Swagger et configuration invalide. Serveurs temporaires arrêtés.
- Chromium production local : 15 vues, largeur réservée, absence de débordement, liens de compte espacés, rôles invité/membre/admin, menu Échap/focus/redimensionnement, navigation cliente, header administratif, déconnexion, panne de session et navigation mobile sans JavaScript. Aucun pageerror.
- Les captures ordinateur 1440/1200 et mobile 390/320 ainsi que le squelette et la vue tablette 768 ont été examinées visuellement. Tokens, logos et polices approuvés réutilisés.

Le premier passage navigateur s'est arrêté sur un sélecteur de test trop large (`header` incluait le héros éditorial). Le second a détecté le décalage tablette décrit plus haut ; corrigé puis build et recette rejoués. Les incidents ne sont pas des contrôles réussis ; seule la dernière passe est retenue.

## Limites et recette utilisateur

L'API de la recette visuelle est une fixture locale, pas une authentification PostgreSQL réelle. Aucun compte ni email de production utilisé. Pas de nouvelle recette PostgreSQL : backend, migrations et règles métier inchangés. Les tests de session existants et le smoke couvrent les comportements partagés ; une validation de connexion réelle reste à faire après intégration dans l'environnement approprié.

Lecteur d'écran, appareil physique, Firefox/Safari et zoom réel à 200 % non testés. La CI distante n'est pas validée par ces résultats. Pas de promesse de performance ou de sécurité globale.

Pour la revue, un aperçu invité isolé peut être démarré sur `/ressources` ; son relais fictif renvoie une session absente et refuse les autres opérations. Vérifier menu mobile, espacement Connexion/S'inscrire et liens. Les captures montrent les états membre/admin contrôlés, sans créer de compte fictif dans le produit.

Les fichiers restent locaux pour validation. Aucun commit, push, PR, fusion ou déploiement. Les corrections de contenu du lot A restent en attente de confirmation ; ce lot ne les applique pas.

## Validation et publication

Ousmane a validé la recette du lot B le 2 novembre 2026. Publication autorisée du commit et d’une PR normale vers `develop`, sans fusion automatique ni déploiement. Les résultats ci-dessus sont réutilisables uniquement après vérification de l’identité des fichiers contrôlés. La revue indépendante Ousmane/Serge reste requise avant fusion.
