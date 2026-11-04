# F1 — vérification locale du 4 novembre 2026

Recette fonctionnelle et visuelle validée par Ousmane ; publication en PR autorisée. Base `193881df53418664a689f8e91d6b6d14c6d4ad50`, branche `feature/question-local-drafts`. [Guide, durée, confidentialité et reprise](question-local-drafts.md). Le code final correspond aux empreintes de recette ; seuls les textes documentaires de statut sont actualisés pour la publication autorisée. Aucun déploiement.

## Environnement réellement utilisé

Windows, Node 24.15.0, pnpm 10.34.6, Next 16.4.2. Frontend **build de production** sur 127.0.0.1:3500 avec le serveur custom et les politiques du lot C ; API réelle en développement sur 3501, PostgreSQL Docker 17.11-alpine dédié sur 127.0.0.1:5459. Conteneur et volume F1 créés après inventaire des ressources existantes et contrôle des ports libres. Destination `jokkodev_f1` initialement vide, six migrations existantes appliquées et 50 technologies initialisées. Aucune migration nouvelle, aucune base d'équipe modifiée, aucun Docker ou service d'un autre projet redémarré.

Deux comptes MEMBER fictifs créés par la vraie API ; authentification, cookies et CSRF réels. Emails uniquement dans le dossier fichier de recette. Aucun envoi SMTP ou compte de production. Le profil Chromium 148.0.7778.96 persistant `D:\DEV\JokkoDev\.cache\question-drafts\browser-profile` est réservé au lot. Les tests de fermeture/reprise réutilisent ce profil, les tests de quota utilisent des contextes séparés. Les identifiants locaux restent hors Git, à l'emplacement indiqué dans le guide.

## Contrôles techniques

| Contrôle | Résultat réellement obtenu |
| --- | --- |
| Installation figée | 467 paquets, verrou inchangé, aucune dépendance ajoutée. Téléchargements parfois lents, sans mise à jour globale. |
| Prisma | Génération 7.10.1 et six migrations existantes appliquées sur la cible F1 neuve et vérifiée ; catalogue initialisé. |
| Lint / TypeScript | Réussis sur l'état final. |
| Build | Réussi pour backend, client et frontend ; pages statiques préservées. |
| Tests complets | 16 tests backend réussis ; 146 tests Node, 145 réussis, zéro échec, un ignoré : lien symbolique indisponible sous ce compte Windows. |
| Tests ciblés brouillons/session | 17 réussis, inclus dans la suite complète : dates UTC, limites UTF-8, schéma strict, identité avant ouverture de stockage, panne réseau, invalidation et mutation privée avant CSRF. |
| Deux modes smoke | Réussis sur 3514/3515 : API directe et via relais, readiness **200**, cookies, CSRF, 429/CORS, Swagger/aperçus fermés. Base F1 explicitement confirmée, aucun compte ni email créé par ce smoke. Processus smoke arrêtés. |
| Navigateur principal | **31 assertions réussies**, zéro incident final et zéro exception pageerror relevée sur les pages suivies. |
| Navigateur complémentaire | **12 assertions réussies**, zéro incident final : stockage et cycle PWA A/B. |
| Dialogues et contrastes calculés | **20 assertions réussies**, soit **63 au total** au navigateur : confirmation de reprise aux quatre largeurs dans les deux thèmes, annulation, focus sûr, texte contrasté et réduction des mouvements. |

Logs finaux et reçus : `.cache/question-drafts/verification/final-{lint,typecheck,test,build,smoke}.log`, `final-checks.json`, `browser-results.json`, `extra-results.json`. Les empreintes de sources/captures et la galerie sont dans ce même dossier. Ces fichiers et les comptes de recette ne sont pas versionnés. Aucun contrôle CI distant ou Linux revendiqué ; pas de suite PostgreSQL exhaustive rejouée, le backend n'étant pas modifié. Les scénarios métier décrits ci-dessous utilisent toutefois réellement PostgreSQL et l'API.

## Matrice des scénarios

| Scénario | Preuve observée |
| --- | --- |
| Coupure pendant la rédaction | Fetch de session effectivement bloqué ; vérification au focus en échec réseau ; titre et champs restent dans le formulaire déjà ouvert. Écriture IndexedDB explicite réussie sans réseau. |
| Fermeture / reprise | Navigateur fermé puis rouvert avec le même profil, session revérifiée en ligne ; proposition sans reprise automatique. Saisie temporaire conservée par annulation, puis champs du brouillon restaurés après confirmation. |
| Changement de compte | Connexion réelle B dans un autre onglet : ancienne saisie A retirée. Lors d'un rejeu, B reprend son propre brouillon existant, jamais celui de A. Les deux enregistrements restent sous des clés différentes. |
| Déconnexion autre onglet | Déconnexion réelle dans B : l'autre formulaire est démonté et aucun champ de brouillon n'est rendu. |
| Session expirée | Sur la seule base F1, échéance des sessions du compte fictif A déplacée dans le passé ; le contrôle suivant reçoit 401 et verrouille formulaire et accès au brouillon. Reconnexion réelle nécessaire. |
| Durée et concurrence | Même module de stockage transpilé dans Chromium, transactions IndexedDB réelles : juste avant sept jours, borne exacte puis seconde lecture ; nettoyage idempotent. Une suppression basée sur une ancienne version échoue sans retirer la copie plus récente. Les brouillons de recette antérieurs à l'ajout de l'index local sont conservés et repris lors du rejeu final. |
| Stockage refusé / plein | SecurityError sur l'ouverture et QuotaExceededError sur put injectés dans les seules fixtures navigateur. Saisie conservée, aucun « Brouillon enregistré ». Pas de saturation réelle du disque. |
| Taille dépassée | Échantillon borné de 300 000 caractères : sauvegarde refusée, saisie intacte, sans troncature ni faux succès. |
| Validation | Titre trop court refusé par le client, brouillon conservé. Technologie UUID inexistante refusée **400 par le vrai backend**, sans suppression de la copie. |
| Réponse de publication perdue | Le harnais laisse le POST atteindre l'API et constate **201**, puis coupe sa réponse au navigateur. Un seul POST, aucun rejeu ; brouillon conservé et indicateur incertain persistant. Après réouverture et reprise, publication encore bloquée jusqu'au choix explicite de vérification. |
| Publication confirmée | Après choix explicite et titre différent, vrai succès serveur, navigation vers le détail et absence du brouillon A ; le brouillon B est encore présent. |
| Suppression manuelle | La copie locale est retirée après confirmation ; le titre de la saisie ouverte reste intact. |
| Mise à jour PWA | Proxy loopback temporaire 3510, worker version A puis B, vrais cookies et session membre déjà établis localement. Version en attente sans perte ; focus sur annulation, Échap garde le texte non enregistré. Après sauvegarde explicite et acceptation du rechargement, reprise du texte sauvegardé. Pas de publication via ce proxy. |
| Frontière PWA | 13 documents/assets publics plus la métadonnée de version, sans brouillon, formulaire privé ni réponse API dans CacheStorage. IndexedDB séparé. Aucun fichier du worker, du manifeste ou des politiques de sécurité modifié. |

Les contrôles de dates utilisent une horloge passée en argument au module, pas une modification de l'horloge du système ou du serveur. Les écritures sur sessions, comptes et questions ne ciblent que la base F1 dédiée ; ces ressources fictives restent disponibles. Les brouillons du navigateur ne résident pas dans PostgreSQL et ne sont pas automatiquement disponibles dans un autre profil navigateur.

## Revue visuelle et accessibilité

Formulaire comparé à la planche approuvée `JokkoDev_04_Poser_question_v1.png`. Les champs, la colonne de conseils et la navigation existants sont conservés ; la zone locale s'insère au début de la carte sans redessiner les logos. Huit captures comparables du formulaire en Clair/Sombre à **1440, 768, 390 et 320 px** ; absence de débordement document mesurée à chaque largeur. Examen des captures 1440 clair, 768 clair et 320 sombre, ainsi que de l'état stockage plein et du dialogue PWA sur mobile. Les textes longs des champs monolignes restent consultables par défilement dans le champ.

Réutilisation des tokens sémantiques, du focus et des dialogues natifs ; contrôles de 44 px et boutons repliables. Focus sûr lors de la confirmation de reprise et de mise à jour, Échap annule sans écraser les champs ; aucune animation ajoutée. Huit captures supplémentaires du dialogue de reprise aux quatre largeurs dans les deux thèmes, avec limites du viewport et focus vérifiés. Contraste calculé sur les couleurs CSS effectives du texte/fond de la zone : **13,14:1 en Clair**, **10,11:1 en Sombre**. Le dialogue PWA peut aussi être annulé lorsque la rédaction n'est pas enregistrée. Pas de lecteur d'écran réel, appareil physique ou zoom réel à 200 % testé ; aucune conformité WCAG globale ou fidélité pixel parfaite revendiquée. Ousmane a ensuite validé la recette visuelle.

## Incidents conservés

- Première exécution du nouveau test Node : propriété de paramètre TypeScript non prise en charge par strip-only de Node 24.15. Réécrite en propriété explicite, puis tests repassés.
- Un test attendait une exception synchrone alors que le refus d'identité est une promesse rejetée ; assertion corrigée sans desserrer la protection, et absence d'ouverture IndexedDB confirmée.
- Sélecteur de mot de passe trop exact (label avec indication obligatoire), attente de reprise asynchrone manquante et titre de message attendu à tort comme heading : harnais corrigé, sorties d'échec conservées.
- Au rejeu, le compte B avait légitimement sa propre copie : l'ancienne assertion « aucune offre » n'était plus valable. Le scénario vérifie désormais la reprise de B et l'absence de contenu A, ce qui le rend rejouable.
- La mesure initiale de contraste interprétait à tort les coefficients CSS color(srgb) comme des canaux rgb sur 255. Convertisseur corrigé ; les deux contrastes effectifs passent. Ce faux échec de harnais est conservé dans contrast-parser-incident.json.
- Avertissements conservés : MODULE_TYPELESS_PACKAGE_JSON des tests Node et dépréciation pg lors de requêtes du backend réel. Le helper local initial shell=true a été remplacé par le lancement direct de pnpm.cjs ; aucun argument de secret n'a été imprimé.
- Un changement de fichier par commande shell a été refusé en sandbox ; reprise avec accès autorisé au seul worktree, puis vérification du contenu et des tests finaux. Aucune opération sur les données d'équipe.

Les incidents ne sont pas assimilés à des réussites. Les fichiers intermédiaires sont conservés dans le dossier de preuves local.

## Limites et validation demandée

Stockage local non chiffré et révocable par le navigateur ; la vérification applicative d'identité n'empêche pas un accès direct au profil navigateur ou un script malveillant de même origine. Une expiration serveur pendant une panne totale n'est détectable qu'au retour du contrôle serveur. Pas de reprise après fermeture hors ligne, synchronisation multiappareil, file d'envoi, rejeu automatique, historique de versions ou récupération d'une saisie jamais enregistrée. Une métadonnée incertaine ne peut être garantie si le stockage échoue ; le guide explique la vérification manuelle de Mes questions.

Pas d'accès au domaine de production ni au VPS pendant F1. Aperçu 3500, API 3501 et PostgreSQL 5459 laissés disponibles, proxies et serveurs smoke arrêtés. Publication en PR autorisée ; fusion et déploiement restent des étapes distinctes.
