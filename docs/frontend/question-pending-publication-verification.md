# F2 — rapport de vérification locale

4 novembre 2026. Branche `feature/question-pending-publication`, worktree `.cache/question-pending/worktree`, base `origin/develop` `8f1ff453858a58ba0c46479e5bc2d2aaf6a75094`. [Guide](question-pending-publication.md) et [décision 010](../decisions/010-question-pending-publication.md). Recette validée par Ousmane ; commit, push et PR vers develop autorisés. Aucun accès VPS, fusion, migration de production ou déploiement. À la publication, les empreintes confirment le même code testé ; seuls les textes documentaires de statut sont actualisés, sans modification du comportement, de la migration ou du contrat.

## Environnement et contrôles techniques

Windows, Node 24.15.0, pnpm 10.34.6, Next 16.4.2, Prisma 7.10.1. Frontend **production local 3530**, API Nest réelle en développement **3531**, base PostgreSQL 17.11 dédiée **5460 / jokkodev_f2** initialement vide. Sept migrations appliquées dont la nouvelle table additive ; 50 technologies initialisées, deux comptes MEMBER fictifs créés via l'API. Cookies/CSRF réels, email fichier. Aucun service d'un autre projet redémarré. Aucune dépendance ajoutée et verrou inchangé.

| Contrôle | Observation |
| --- | --- |
| Installation | `pnpm install --frozen-lockfile`, 467 paquets. |
| Prisma | Génération et validation réussies ; sept migrations appliquées puis statut à jour. La suite d'intégration rejoue les migrations dans des schémas temporaires. |
| Contrat | NestJS modifié puis `pnpm api:generate` ; seconde génération identique pour OpenAPI et types client. |
| Lint / TypeScript / build | Réussis sur le code final, après séparation du stockage F2 ; routes statiques conservées dont `/questions/poser`, `/ressources` et documents publics PWA. |
| Unitaires | 19 tests backend réussis ; 150 tests Node, 149 réussis, un ignoré : création de lien symbolique indisponible sous ce compte Windows. Aucun échec. |
| Intégration PostgreSQL | **158 tests réussis**, zéro ignoré/échec. Inclut 10 scénarios API F2 et une recette de purge bornée. Résultats réutilisables après le dernier ajustement exclusivement frontend de nom/version de stockage. |
| Smoke | Deux modes réussis sur ports dédiés 3534/3535, readiness 200, API directe/relais, cookies/CSRF, CORS/429 et fermeture des aperçus/Swagger en production. Serveurs temporaires arrêtés. |

Logs `.cache/question-pending/verification/final-{lint,typecheck,test,build,smoke}.log`, `integration.log`, `contract-generation.log`, `final-checks.json`. Les tests PostgreSQL utilisent seulement `TEST_DATABASE_URL` F2 et leurs schémas jetables ; les tests CLI confirment hôte/base et ne suppriment aucune question. Le backend de l'aperçu est volontairement en développement pour la recette HTTP locale ; le smoke démarre aussi le backend en configuration de production fictive. Aucun test Linux/VPS ou contrôle GitHub revendiqué.

## Résultats fonctionnels observés

| Scénario | Preuve |
| --- | --- |
| Coupure / enregistrement | Fetch de session réellement en échec, éditeur déjà ouvert conservé ; écriture IndexedDB confirmée explicitement, clé unique et date à sept jours. Aucun POST au retour du réseau. |
| Fermeture et reprise | Profil Chromium fermé puis rouvert, session revérifiée, même payload/clé ; pas de remplissage automatique du formulaire. Copie complète relisible, y compris code et technologies. |
| Réponse perdue | Harnais laisse le vrai POST créer et recevoir 201, puis coupe sa réponse. État incertain sans lien. Après rechargement, reprise explicite avec les mêmes octets de payload et clé : identifiant initial, une question et un reçu en PostgreSQL. |
| Double clic / concurrence | Double clic dans Chromium ne provoque pas un nouvel envoi. Huit POST simultanés avec même clé dans le test API donnent tous le même ID et une seule question. Clé primaire et insertion question/reçu transactionnelles vérifiées ; panne par trigger du reçu annule aussi la question. |
| Conflit / ancien client | Même clé et contenu différent : 409 explicite. Ancien POST sans clé : comportement préservé. Propriétés imbriquées supplémentaires refusées ; même clé sous B appartient seulement à B. |
| Session / isolation | Authentification réelle A/B, changement et déconnexion dans un autre onglet masquent la copie précédente. Expiration réelle SQL des sessions fictives : verrouillage au contrôle suivant. API rejoue aussi avec absence/expiration de session, CSRF absent et origine étrangère : refus. |
| F1 | Suppression seulement de la version source après confirmation. Parcours F1 complet rejoué : sauvegarde/reprise, conflit de version, validation serveur, réponse perdue sans rejeu et publication confirmée. |
| Stockage | Refus d'ouverture et quota d'ajout injectés : saisie conservée, pas de faux succès ni POST. Transactions réelles testent version concurrente, une seule copie et refus d'identité avant accès. Limite UTF-8 couverte en unitaire. |
| Expiration | Horloge de fixture à la borne exacte de sept jours : payload retiré, repère de clé conservé, plus de bouton d'envoi. Côté serveur, attente proche de l'échéance puis 410 même après suppression du reçu. Pas d'attente réelle d'une semaine. |
| Conservation serveur | CLI sans confirmation refusé ; simulation sans suppression ; exécution bornée puis seconde passe. Un reçu vivant avec date de rétention altérée reste protégé, les trois questions de fixture restent présentes. |
| Modération / suppression | Une répétition retrouve uniquement le reçu minimal, sans exposer le texte après masquage/suppression ; lecture de détail 404. |
| Mise à jour PWA | Proxy local avec vrais workers A puis B : attente sans perte, annulation avec focus sûr, sauvegarde distincte F1 puis rechargement volontaire. Attente/clé inchangées et brouillon repris. Module de stockage F1 extrait du SHA déployé relit le brouillon après F2 : compatibilité de retour arrière vérifiée. |
| Périmètre public | 13 fichiers publics plus métadonnée de version dans CacheStorage, aucune route API/compte/formulaire ni payload/clé d'envoi. Transport du proxy réellement coupé : les trois articles guides restent lisibles, `/questions` reçoit le secours honnête ; retour réseau restaure la navigation publique. |

## Navigateur et rendu

**133 assertions navigateur réussies** : 53 parcours F2, 21 stockage/PWA/compatibilité F1, 31 non-régression F1 et 28 contrôles visuels/clavier/contrastes. Les 53 vérifications F2 sont rejouées après le dernier contrôle empêchant un ancien onglet d'envoyer une demande remplacée ; les autres couvrent le stockage, les styles et les parcours inchangés par ce contrôle et restent réutilisés. Zéro échec final. Une interruption de l'aperçu a interrompu un passage intermédiaire après 40 assertions ; aperçu F2 relancé seul, passage complet rejoué avec succès. Cette interruption n'est pas comptée comme une validation.

Sept contrôles HTTP complémentaires réussis sur le dernier aperçu : HTML statique identique, cache Next HIT, identifiants de requête renouvelés, CSP bloquante limitée sans unsafe-inline et politique complète Report-Only présentes, API prête, session privée no-store et worker JavaScript no-store. Résultats `http-results.json`. Les réglages HSTS/nginx ne sont pas testés sur ce loopback HTTP ; aucun fichier de leur configuration n'est modifié.

Concurrence de l'interface : remplacement d'une attente avec les vraies transactions locales pendant qu'un ancien panneau reste affiché ; aucun POST sur le clic périmé, nouvelle copie montrée pour une nouvelle décision volontaire. Ce contrôle s'ajoute à la concurrence et à l'unicité PostgreSQL.

Chromium installé **148.0.7778.96**, profils/contextes isolés, sans injection Kaspersky. API et comptes fictifs **réels localement**, pas de modèle de session simulé dans le produit. Les fixtures de panne réseau, quota, date et réponse perdue sont confinées aux harnais. La recette principale mesure les exceptions `pageerror` ; aucun incident JavaScript/hydratation non intercepté observé. Les erreurs de transport provoquées délibérément sont attendues, pas des publications confirmées.

Captures comparables des états attente (copie ouverte), incertain et confirmé en **Clair/Sombre à 1440, 768, 390 et 320 px**, sans débordement de document. Inspection visuelle des captures : tokens, logos et structure de la carte/colonne de conseils existants conservés. Le nouveau panneau augmente la longueur de la page, particulièrement sur mobile ; sa copie détaillée se replie nativement. Textes d'état explicites, boutons de 44 px, dialogues avec focus sur l'action conservatrice, Échap et retour au déclencheur, préférence reduced-motion sans nouvelle animation. Les dix paires texte/fond calculées (titres, corps, copie, code et action, dans les deux thèmes) dépassent 4,5:1 ; valeurs exactes dans `visual-results.json`. Une ligne de code très longue reste défilable dans sa zone aux quatre largeurs, sans élargir le document.

Preuves privées : `browser-results.json`, `extra-results.json`, `f1/browser-results.json`, captures `pending-*`, `uncertain-*`, `confirmed-*` et galerie `index.html` dans `.cache/question-pending/verification/`. Les captures, comptes, payloads de recette, profils, caches et builds restent hors du diff versionnable. Deux premiers contrôles du harnais complémentaire utilisaient des sélecteurs trop larges/inexacts pour les guides et le titre de secours : corrigés, recette rejouée ; ces échecs de harnais ne sont pas présentés comme des succès.

## Limites et suite

Recette locale de bureau uniquement : pas d'appareil physique, navigateur mobile réel, Safari/Firefox ou production. La coupure réseau de page est utilisée pour l'API ; pour le worker, coupure du transport proxy, car l'émulation de page seule ne suffit pas. Le disque n'a pas réellement été saturé. L'expiration et la purge sont accélérées par des dates de fixture, pas par un vieillissement de huit jours réel.

Pendant une coupure totale, révocation/expiration serveur inconnue jusqu'à reconnexion ; communications inter-onglets interdites détectées au focus/polling selon F1. Stockage local non chiffré et révocable ; sa perte peut empêcher la reprise de la même clé. Après sept jours, résultat incertain : vérifier Mes questions avant une nouvelle demande. Retirer volontairement une clé tentée peut permettre un doublon avec une nouvelle demande : l'interface avertit et demande ce choix.

Le contrat suppose la conservation des reçus pendant leur fenêtre. La commande de purge est préparée sans timer ; sans activation opérationnelle, la conservation réelle dépasse huit jours. Le rollback doit garder reçus et bases navigateur ; l'ancien backend ne peut pas traiter l'endpoint F2. Voir le guide avant déploiement. La revue indépendante backend/sécurité reste à effectuer avant fusion. La publication en PR est autorisée après validation ; fusion, migration de production et déploiement restent distincts.
