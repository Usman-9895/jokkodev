# Référencement et page 404 — 30 octobre 2026

Base develop : `0d9ef75e628c9a43b04a86cd464b6470289c88e1`. Branche locale `feature/seo-custom-404`. Aucun déploiement dans ce lot.

## Audit du domaine avant modification

Lecture HTTP publique : accueil 200, titre « Accueil | JokkoDev » ; questions 200, titre « Questions | JokkoDev ». Pas de canonical observé dans ces réponses. `/robots.txt` et `/sitemap.xml` répondaient 404 ; `/ppp` 404 avec noindex et l’ancienne page minimale. Ces observations décrivent les réponses du jour, pas l’état de l’index Google.

## Métadonnées et contenus

`frontend/src/lib/seo/metadata.ts` centralise l’origine officielle `https://jokkodev.com` et les titres/descriptions des huit pages publiques principales. Des URL canoniques absolues, Open Graph et Twitter les accompagnent. L’image sociale réutilise le fichier PNG officiel existant, sans nouvelle image ni police. L’accueil décrit l’identité WebSite en JSON-LD : nom JokkoDev, URL et description réels, sans témoignage, note ni action de recherche inventée.

Axes éditoriaux : marque JokkoDev ; communauté de développeurs africains ; entraide technique ; projets collaboratifs entre développeurs. Pas de balise meta keywords ni de répétition artificielle dans le contenu.

Les listes et les détails de questions/projets effectuent une lecture REST publique côté serveur. Métadonnées et rendu partagent la lecture au sein de la requête grâce à React cache ; fetch reste no-store, sans cache persistant, cookie, Authorization ou en-tête transmis par le visiteur. Les instantanés anonymes initialisent le composant existant ; les lectures de session et les actions continuent de passer par les contrôles existants. Le hook rejette un ancien résultat lorsque l’identité de ressource/session change ; un nouveau résultat ou une erreur remplace l’instantané.

Les détails utilisent le titre réel et un extrait du contexte/de l’objectif. Les listes filtrées ou paginées sont noindex/follow et pointent vers la liste canonique. Les pages de comptes, l’espace personnel, l’administration, les formulaires de contribution et les signalements sont noindex. Les profils publics sont également noindex/follow par prudence et exclus du sitemap : leur accessibilité publique ne vaut pas décision d’accroître leur découvrabilité personnelle. Une indexation des profils pourra être étudiée séparément.

`robots.txt` autorise les pages et annonce le sitemap ; seul `/api/` est exclu de l’exploration. Les autres parcours restent explorables pour que Google lise noindex. Ces directives ne protègent pas les données : l’authentification et les autorisations serveur restent nécessaires et inchangées.

## Sitemap

`/sitemap.xml` est produit à la demande, indépendamment du build, à partir des huit pages statiques et des listes publiques `/questions` et `/projects` de l’API existante. Les contenus masqués/supprimés ne sont pas exposés par ces listes anonymes. Aucune route privée, aucun profil ni paramètres de recherche ne sont inclus. Les lastmod des contenus viennent de updatedAt ; aucune date artificielle n’est attribuée aux pages statiques.

Pagination de 50 (maximum autorisé par le contrat), limite de 100 pages par catégorie, délai global contrôlé de 20 secondes avant chaque appel et timeout de 5 secondes par appel. Au-delà de 5 000 éléments par catégorie ou en cas d’incohérence/panne, réponse 503 + Retry-After 300, jamais faux succès vide ni sitemap partiel. Le dernier appel peut prolonger le délai global de 5 secondes au maximum. Une croissance dépassant ces bornes nécessitera un index de sitemaps. Réponse no-store pour ne pas conserver les URL de contenus retirés ; pas de polling ni tâche planifiée ajoutée. Une mutation concurrente pendant la pagination peut déplacer des éléments ; les passes suivantes et les liens publics complètent la découverte.

## Page introuvable et HTTP

Visuel 404 typographique, icône code, palette et polices existantes, titre et explication lisibles, accès accueil/questions/projets/contact. Le défaut global possède un header de marque minimal et le footer commun. Les questions et projets manquants réutilisent ce contenu dans leur cadre public, sans main/h1 imbriqués. Aucun nouveau média ni animation continue.

La vérification d’existence précède le rendu du détail. Seul un 404 de l’API ou un identifiant mal formé déclenche notFound ; une panne/503 reste une indisponibilité et émet noindex. Les cinq anciens loading.tsx (racine, listes et détails questions/projets) ont été retirés : ils forçaient le démarrage du streaming avant la décision et masquaient le contenu sans JavaScript. Les indicateurs et erreurs des composants interactifs restent disponibles ; le formulaire de signalement reçoit sa propre limite Suspense. Contrepartie : le navigateur attend la lecture publique bornée avant l’affichage initial des routes concernées.

Les contrôles locaux prouvent des HTTP 404 sur les exemples de détails absents pour un client ordinaire et Googlebot. Ce n’est pas encore une preuve du déploiement ni de l’exploration réelle par Google. Les profils restent un parcours client noindex, hors correction des statuts HTTP des détails question/projet.

## Search Console — après publication et déploiement validés

1. Ousmane ouvre https://search.google.com/search-console avec son compte Google, puis ajoute une propriété **Domaine** : `jokkodev.com`, sans https ni www.
2. Copier l’enregistrement TXT exact fourni par Google. Dans la zone DNS LWS, **ajouter** un TXT à la racine (@), sans remplacer les TXT SPF/DKIM/DMARC ou les entrées Resend/LWS existantes. Ne pas inventer de jeton ni supprimer un jeton d’un autre propriétaire.
3. Attendre sa visibilité DNS, cliquer Valider. Conserver le TXT pour maintenir la preuve de propriété.
4. Vérifier HTTP 200 du sitemap déployé et l’origine canonique, puis soumettre `https://jokkodev.com/sitemap.xml` dans Sitemaps.
5. Inspecter l’accueil, Ressources, une question et un projet visibles. Contrôler l’URL active et demander leur indexation si éligibles.
6. Surveiller indexation, erreurs sitemap, requêtes et clics. Aucun délai, classement ou indexation garantis. Search Console ne nécessite pas d’ajouter Google Analytics à l’application.

Avant la soumission : confirmer les accès Googlebot réels (aucune ancienne restriction IP), HTTP/HTTPS et www vers le domaine choisi, pas de noindex global sur nginx, contenu utile et disponibilité des services. Les canoniques applicatives sont livrées ; aucune redirection nginx ni modification DNS n’est faite ici.

## Déploiement

Lot frontend + smoke/documentation uniquement : aucun backend, contrat, dépendance ni migration modifié. Après revue, PR vers develop puis déploiement d’un SHA figé selon la procédure existante : sauvegardes, release distincte, installation figée, génération Prisma sans base réelle pour build, build, cache Next accessible au compte de service, bascule et contrôles. Ne pas activer un traitement de conservation supplémentaire. Vérifier ensuite sitemap/robots/canoniques, nouveaux codes 404, connexion, consultation et propriétaire. Ancienne release à conserver pour retour arrière. L’ajout TXT Search Console et l’envoi du sitemap ne sont pas réalisés dans ce lot.

## Sources officielles consultées

- https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=fr
- https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap?hl=fr
- https://developers.google.com/search/docs/appearance/site-names?hl=fr
- https://support.google.com/webmasters/answer/9008080?hl=fr
- https://nextjs.org/docs/app/api-reference/file-conventions/not-found

Les versions de documentation en ligne peuvent différer ; le comportement a été contrôlé avec Next.js 16.4.2 installé, sans option expérimentale ajoutée.
