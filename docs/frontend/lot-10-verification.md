# Vérification du lot 10 — comptes et profils

18 octobre 2026. Branche `feature/frontend-auth-integration`. Préparation initiale sans publication ; après recette et diagnostic, l’utilisateur autorise commit, push et PR vers `develop`. Aucune fusion ni fusion automatique autorisée.

## Socle réellement fusionné

Base : **`1ddc6cb5bd31cd00ca531ae4371dec5d87a970af`**. Les commits examinés des PR #10–#18 et le correctif #20 (`a818043925ada0a5a046b334e8a9e4d6a8d73685`) sont ancêtres de `origin/develop`. Le commit #19 `75c34d36422b9c2077c72c747c6bda8f63fe6916` est exclu. Les arbres complets de develop et du correctif sont identiques : restauration, PATCH null, smoke, recherche, query client et Retry-After sont présents sans différence inattendue. Preuve locale : `.cache/lot10/merge-verification.json`. `develop` a été avancé exclusivement par fast-forward avant création de la branche.

Instructions AGENTS, README, décision003, guide API, rapport des corrections et skill jokkodev-ui-fidelity lus. Charte, procédure visuelle et notes/matrice complémentaires consultées ; les PNG05/07/08/09/10/13/14/31/32 ont été réellement ouverts. Les composants et tokens approuvés sont réutilisés ; pas de refonte de l’identité.

## Environnement dédié et préservation

Node24.15.0, pnpm10.34.6, Windows, Chrome headless installé ; PostgreSQL17.11 Alpine dans Docker Linux. Docker était arrêté au premier essai ; l’application existante a été démarrée sans modification de configuration système. Un nouveau conteneur `jokkodev-lot10-20261018` (label `jokkodev.lot=10`) utilise 127.0.0.1:55472 et PGDATA tmpfs, sans montage des données de l’équipe.

Les bases neuves `jokkodev_lot10` et `jokkodev_lot10_it` ont été contrôlées : nom réel et zéro objet avant migration. Les scénarios HTTP utilisent exclusivement ces comptes/données jetables ; les intégrations créent/suppriment leurs schémas temporaires. Emails via transport fichier, exclusivement `example.test`. Aucun SMTP externe et aucune base de l’équipe utilisés. Les exemples .env existants n’ont pas été remplacés ; les variables dédiées sont injectées depuis le cache ignoré.

Le frontend de recette reste accessible sur **http://127.0.0.1:33020**, le backend sur **http://127.0.0.1:33021**. Le backend fonctionne en développement local (cookies HttpOnly sans Secure sur HTTP), le frontend est lancé depuis son build production afin de contrôler les aperçus. Les deux smoke vérifient séparément la configuration backend production avec cookies Secure. Cela ne prouve pas une chaîne HTTPS de déploiement.

Les PID de recette sont consignés dans `.cache/lot10/frontend-process.json` et `backend-process.json`. Seuls ces serveurs ont été intentionnellement arrêtés/recréés pendant les essais de panne et smoke, après vérification des PID/ports. Les Chrome temporaires ont été fermés. La base et les deux serveurs dédiés sont laissés actifs pour la validation fonctionnelle.

**Constat à signaler :** les processus initiaux 22308/37060 sur3000/3001, présents au début, ne sont plus observés en fin de mission. Aucune commande d’arrêt n’a visé ces PID ou ports. Leur cause d’arrêt n’est pas établie ; ils n’ont pas été relancés avec des variables ou destinations supposées. Ne pas assimiler ce constat à une preuve que ces services sont restés disponibles. Aucun nettoyage de leurs données ou de leurs sauvegardes n’a été effectué.

## Résultats réellement exécutés

| Contrôle | Socle avant intégration | État final intégré |
| --- | --- | --- |
| Installation figée | pnpm install --frozen-lockfile réussi, verrou inchangé | Dépendances réutilisées, aucune nouvelle dépendance |
| Prisma validate/generate | Réussis | Schéma/backend inchangés |
| Migrations / rejeu | Deux migrations sur base neuve, puis aucune en attente | Aucune migration ajoutée ni modifiée |
| Catalogue / rejeu | 50 créations puis0 | Catalogue inchangé |
| OpenAPI / types | Génération réussie, sans diff | Régénération réussie, toujours sans diff |
| Lint / TypeScript | Réussis | Réussis |
| Tests backend | 10 réussis | **10 réussis** |
| Tests frontend/client/outillage | 44 réussis | **52 réussis**, dont huit tests nouveaux de session/transport/validation |
| Tests intégration PostgreSQL | 85 réussis | **85 réussis** |
| Builds frontend/backend | Réussis en NODE_ENV=production | Réussis |
| Smoke | Mode sans base disponible réussi | Deux modes réussis : indisponible503 et base dédiée disponible200 |
| Navigateur | Références et interface préexistante examinées | Parcours réels et captures1440/768/390/320 après polices/images, puis recontrôles ciblés |
| Aperçus production | Garde préexistante | Les neuf /dev/* renvoient404, même avec paramètres de rôles/états simulés |
| Non-régression ciblée | Base exactement celle corrigée | Accueil, consultation questions/projets et informations répondent ; pas de liens /dev publics |

Aucun échec/skip dans les suites finales. Le warning Node MODULE_TYPELESS_PACKAGE_JSON sur les tests TS de présentation demeure sans échec ; l’installation a signalé le script @scarf/scarf ignoré selon la configuration existante. Aucun assouplissement de sécurité pour obtenir les résultats.

Les suites backend85 ont été rejouées après l’intégration ; les derniers ajustements de libellés/styles/cartes publiques n’ont pas changé le backend, le contrat ou ces comportements. Les contrôles lint/typecheck/tests/build concernés ont été rejoués sur ces derniers ajustements. Détails : `.cache/lot10/baseline-checks.json`, `final-checks.json`, `finish-checks.json`, `smoke-checks.json` et leurs journaux sans URL de connexion.

## Parcours réels, distincts des simulations

Le script HTTP de recette utilise **AccountClient frontend**, cookies réels, CSRF réel, PostgreSQL et emails fichier. Onze groupes de scénarios ont passé :

- Inscription, identité/session et nouvelle lecture de session.
- Vérification email, refus d’un jeton consommé.
- Lecture/sauvegarde du profil propriétaire et absence d’email/rôle/session dans la projection publique.
- Refus de route de modification d’un autre profil, de champ email modifiable et d’accès anonyme privé.
- Jeton de vérification expiré et renvoi réel via transport fichier.
- Cookie CSRF volontairement altéré : une mutation403, renouvellement du jeton, aucune répétition automatique, puis nouvel envoi explicite réussi.
- Identifiants erronés et limitation429 avec vrai Retry-After.
- Réponses neutres de récupération pour compte présent/absent, lien invalide, renouvellement, refus de rejeu et révocation des sessions précédentes.
- Jeton de renouvellement expiré refusé.
- Expiration réelle d’une session : identité nettoyée.
- Déconnexion, révocation et accès privé ultérieur refusé.

Les dates expirées sont des fixtures injectées seulement dans la base dédiée. Le premier essai avait violé un CHECK en plaçant expiresAt avant createdAt ; la fixture a été corrigée, sans modifier la contrainte ni la migration. Les jetons expirés/consommés ne sont pas distingués artificiellement par l’interface : le contrat TOKEN_INVALID les regroupe.

Dans Chrome, les formulaires ont réellement effectué inscription, connexion, vérification email, récupération et renouvellement, lecture/sauvegarde du profil et déconnexion. Prévention de double soumission vérifiée en envoyant deux submit synchrones et en comptant les requêtes réelles. État au rechargement, retour externe refusé, onglets publics, profil absent, résumé d’erreurs/focus, visibilité du mot de passe, annulation/Échap/retour au déclencheur et menu mobile contrôlés.

Le second groupe Chrome a vérifié429 et délai affiché, localStorage/sessionStorage vides, cookie de session inaccessible au JavaScript de page, erreur bio501 et lien de résumé vers le champ sans dialogue d’abandon, sauvegarde unique, bio500 sans espaces aux quatre largeurs, expiration de session injectée en base puis revalidation au focus, navigation développeur réelle et panne du seul backend33021. Lors de cette panne, le profil est masqué et la saisie du formulaire est conservée ; une nouvelle soumission explicite réussit après relance du backend. Les tests de panne n’ont pas visé3001.

Les huit tests Node nouveaux utilisent des transports contrôlés pour les garanties de course, SSR anonyme, token rotatif, CSRF sans rejeu, réponse privée périmée et202 vide. Ces tests simulés complètent les parcours réels ; ils ne sont pas présentés comme des opérations PostgreSQL.

Le premier contrôle TypeScript a détecté un mapping de réponse incorrect : le champ livré est questionTitle, pas question.title. Il a été corrigé à partir du type généré, sans modification du contrat/backend. Un rejeu de captures a aussi attendu à tort une sauvegarde alors que la valeur fictive était déjà enregistrée et le bouton désactivé ; le helper de recette a été rendu réexécutable. Ces essais ne sont pas comptés comme des réussites produit.

Une passe Chrome a relevé une exception générique isolée « Uncaught » après que ses scénarios avaient passé ; la trace détaillée n’avait pas été conservée à cette passe. Le rejeu instrumenté n’a pas reproduit l’exception. L’instantané SSR a ensuite été stabilisé pour rester anonyme, et les derniers contrôles instrumentés n’ont pas d’exception. La cause de l’occurrence isolée ne peut pas être attribuée avec certitude : ne pas la présenter comme un défaut causalement prouvé puis résolu.

## Captures et différences

Captures hors Git : `.cache/lot10/screenshots/`. Exemples :

- [Connexion ordinateur](../../.cache/lot10/screenshots/login-1440.png), [connexion320](../../.cache/lot10/screenshots/login-final-320.png).
- [Profil propriétaire ordinateur](../../.cache/lot10/screenshots/profile-editor-final-1440.png), [profil propriétaire mobile](../../.cache/lot10/screenshots/profile-editor-final-390.png).
- [Profil public ordinateur](../../.cache/lot10/screenshots/public-profile-final-1440.png), [profil public visiteur mobile](../../.cache/lot10/screenshots/public-profile-visitor-390.png).
- [Session expirée](../../.cache/lot10/screenshots/session-expired-390.png), [backend indisponible](../../.cache/lot10/screenshots/backend-unavailable-390.png), [vérification réussie](../../.cache/lot10/screenshots/verify-success-390.png).

Les captures ont été ouvertes et examinées. Coupures excessives des libellés mobiles corrigées, mêmes tokens/composants et polices conservés. Les formulaires n’affichent plus les bannières d’indisponibilité quand l’opération est réellement raccordée. Les contraintes12–128 remplacent les15 illustratifs de certaines maquettes, conformément au contrat livré. L’inscription ouvre une session réelle, donc la vérification peut proposer Mon profil au lieu d’annoncer une nouvelle connexion obligatoire.

Adaptations nécessaires : pseudonyme seul (aucun nom affiché distinct dans le contrat), avatar à initiales, compteurs « Projets publics » selon les données créés/rejoints, confirmation explicite du lien email, navigation mobile compacte, informations honnêtes sur les domaines non raccordés. Les cartes des contributions réutilisent les classes/composants communs avec statut, dates et nombre de réponses réels, sans faux tableau de réponses. Les illustrations simplifiées et footer textuel préexistants restent provisoires.

## Livré, limites et suites

[Guide d’intégration lot10](auth-integration.md), [bilan central](integration-readiness.md) et [inventaire40routes](routes.md) actualisés. Le transport partagé accepte désormais202 sans corps des endpoints email ; un202 malformé reste une erreur. Aucun changement de backend nécessaire à ce raccordement.

Les comptes et secrets de recette sont seulement dans `.cache/lot10/test-accounts.json` (ouvrir localement, sans recopier dans documentation/capture/chat). Les clés owner/second désignent des comptes fictifs dédiés ; le propriétaire possède un profil et des contributions fictives de recette. Pour une vérification manuelle, utiliser un profil de navigateur séparé afin de ne pas mélanger les cookies des applications locales. Les liens reçus sont dans le dossier mail ignoré de cet environnement.

La page profil public introuvable conserve HTTP200 initial (chargement client), l’API répond404 et l’état visuel est introuvable. Les détails publics questions/projets ne sont pas encore raccordés ; les liens depuis les contributions ne simulent donc pas leur disponibilité. Les autres mutations métier restent désactivées, le tableau de bord ne charge pas encore son résumé, l’administration n’est pas activée.

L’utilisateur a validé le reste de sa recette et autorisé la publication pour revue après diagnostic des deux liens email, décrit ci-dessous. Aucune fusion autorisée. SMTP réel, HTTPS complet, hébergement Datacloud, systemd, copie/reprise de sauvegardes hors serveur, décisions de licences et notices, contenus éditoriaux/confidentialité et coordonnées restent distincts et ouverts. Appareils physiques, lecteurs d’écran, Safari/Firefox, zoom navigateur réel200% et exploitation sur hôte Linux non validés ici ; PostgreSQL et ses tests tournent réellement sous Linux Docker. **Aptitude à la production non validée.**

## Diagnostic des liens email après recette utilisateur

Reprise du 18 octobre 2026 sur la même branche et la base `1ddc6cb5bd31cd00ca531ae4371dec5d87a970af`. Après `git fetch origin`, `origin/develop` est inchangé. Les 37 fichiers de la livraison correspondent exactement au manifeste SHA-256 de la dernière vérification, sans modification étrangère observée. Les services dédiés 33020/33021 et PostgreSQL 55472 sont réutilisés, sans migration ni redémarrage des services. Nom réel de la base `jokkodev_lot10`, label Docker `jokkodev.lot=10`, absence de montage des données de l’équipe et transport email `file` vérifiés. Les identifiants owner/second de la recette précédente sont préservés ; un nouveau compte fictif distinct est utilisé.

Le contrôle GitHub avant publication ne trouve aucune PR correspondante existante. L’API de branche indique `protected: false` pour `develop` : les règles de revue documentées ne doivent pas être présentées comme une protection technique effective. Aucune modification de protection n’est effectuée.

Les preuves précédentes extrayaient le token du texte JSON décodé et construisaient l’URL de recette. Ce complément ouvre **l’URL complète effectivement enregistrée** après décodage du JSON, sans reconstruction du token. Chaque message est sélectionné par destinataire exact, type de lien et date postérieure à la demande exécutée dans Chrome. Origine `http://127.0.0.1:33020`, chemins, unique paramètre `token` et format de 43 caractères vérifiés ; aucune URL sensible n’est conservée dans le rapport.

| Vérification réellement exécutée dans Chrome, API et PostgreSQL dédiés | Résultat |
| --- | --- |
| Inscription depuis l’application et message de vérification frais | HTTP 201, session réelle et message correspondant retrouvé |
| Ouverture complète du lien de vérification | Token URL identique au message ; aucun POST ni consommation lors du GET |
| Clic explicite de vérification | Un seul POST `/auth/verify-email`, token identique et CSRF présent ; HTTP 204 ; `emailVerifiedAt` réellement renseigné en base et interface de succès cohérente |
| Réouverture puis nouvelle soumission du lien consommé | HTTP 400 `TOKEN_INVALID`, aucune nouvelle réussite annoncée |
| Déconnexion puis récupération depuis l’application | HTTP 202 et nouveau message de renouvellement correspondant à cette demande |
| Ouverture complète et double soumission synchrone du formulaire de renouvellement | Token transmis identique, CSRF présent, un seul POST `/auth/reset-password` ; HTTP 204 et confirmation réelle |
| Connexion avec l’ancien mot de passe | HTTP 401 `INVALID_CREDENTIALS` |
| Connexion avec le nouveau mot de passe puis rechargement du profil personnel | HTTP 200, accès réel au bon profil après rechargement |
| Lien de renouvellement déjà consommé | HTTP 400 `TOKEN_INVALID` |
| Token inconnu mais de format correct | HTTP 400 `TOKEN_INVALID` |
| Ajout volontaire de caractères littéraux `\n` issus de la représentation JSON | Rejet local des deux écrans, sans mutation API ; le renouvellement affiche exactement « Le lien est absent ou incorrect. Demande un nouveau lien. » |

**Diagnostic et limite d’attribution :** aucun défaut de lecture des paramètres, de transmission du token ou de CSRF n’est reproduit avec les liens frais complets. La copie d’échappements JSON reproduit un rejet de format local ; elle constitue un mode d’échec démontré, mais pas une preuve de la manipulation faite lors des deux échecs initiaux. Les URL initialement ouvertes ne sont pas présentes dans les preuves et leur cause exacte reste indéterminée. Un token remplacé, expiré ou consommé ne peut pas être distingué par le seul message générique du contrat ; ces cas ne sont pas attribués arbitrairement à l’utilisateur ou au backend. Le texte précis de rejet local est distinct du message `TOKEN_INVALID` après réponse serveur.

Aucun code produit supplémentaire modifié pour ce diagnostic, aucune protection assouplie et aucun token nettoyé silencieusement. La [procédure locale](auth-integration.md#ouvrir-correctement-un-email-local) évite la copie de la représentation JSON. Les deux parcours frais sont vérifiés ; cette réserve sur l’attribution historique est conservée dans la PR, sans déclarer les erreurs initiales causalement corrigées.

La passe finale contient dix groupes réussis, aucune exception navigateur et aucun débordement mobile observé. Les deux captures de confirmation mobile ont été ouvertes et examinées : `.cache/lot10/screenshots/mail-diagnosis-verified-390.png` et `mail-diagnosis-reset-390.png`. Preuve sans secrets : `.cache/lot10/mail-diagnosis.json`. Les essais du helper ont d’abord utilisé un hash hexadécimal au lieu du bytea PostgreSQL, puis attendu un libellé différent du frontend ; le helper local a été corrigé et la passe entière rejouée. Ces deux essais ne sont pas des réussites produit et n’ont nécessité aucune correction du backend/frontend.

Avant publication, `pnpm lint`, `pnpm typecheck` et `pnpm test` ont néanmoins été relancés avec succès : **10 tests backend et 52 tests frontend/client/outillage**, aucun échec/skip. Preuve : `.cache/lot10/publication-checks.json` et journaux `publication-*`. Les 85 tests d’intégration, builds, génération et deux modes smoke précédents sont réutilisés : tous les fichiers de code sont identiques au manifeste testé ; seules les précisions documentaires de ce diagnostic s’y ajoutent. Les parcours de session, profil, CSRF, expiration, limitation et panne déjà exécutés restent documentés avec leurs limites ; ils ne sont pas présentés comme intégralement rejoués pendant cette reprise.
