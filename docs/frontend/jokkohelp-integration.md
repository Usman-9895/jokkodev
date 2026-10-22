# Lot 11 — intégration réelle de JokkoHelp

## Base et périmètre

Branche `feature/frontend-jokkohelp-integration`, depuis `develop` avancé par fast-forward à **381d98f430b3e9acb18fba4da9cd84b93fa7948f**. PR #21 vérifiée fusionnée par l’API GitHub et son commit d35717e présent dans cette base. Le commit propre à #19, 75c34d36422b9c2077c72c747c6bda8f63fe6916, reste exclu. Le dossier était propre ; aucun commit, push, PR ou fusion autorisé pour ce lot.

Références de présentation : maquettes 02, 03, 04 et 19, planches 26/27/28/29/32, notes et charte du skill réellement examinées. Les guides des lots 3 et 5 restent historiques ; ils décrivent les démonstrations initiales. Le [lot 10](auth-integration.md) fournit la session et le client partagés. Les contrats sont ceux du [guide API](../api/frontend-integration.md), d’OpenAPI et des types générés ; aucun backend, migration ou DTO généré modifié.

## Routes et appels

| Route produit | Raccordement |
| --- | --- |
| `/` | Dernières questions via GET `/questions`, pageSize2 ; plus de fixtures JokkoHelp ni de repli fictif sur panne |
| `/questions` | GET `/technologies`, GET `/questions` avec query typée q/technology/status/page/pageSize3 |
| `/questions/[id]` | GET `/questions/:id`, GET `/questions/:id/answers` paginé ; liens vers les profils publics |
| `/questions/poser` | SessionGate, catalogue réel, POST `/questions`, redirection vers l’id réellement reçu |
| `/questions/[id]/modifier` | SessionGate, lecture personnalisée, viewerIsAuthor et identité réelle ; PATCH `/questions/:id` |
| Réponse dans le détail | POST `/questions/:id/answers`, PATCH `/answers/:id` pour son propre contenu |
| Solution dans le détail | PUT `/questions/:id/accepted-answer` avec answerId ; DELETE sur la même route |
| `/espace/questions` | GET `/users/me/questions`, statut et pagination serveur, session réelle |
| `/profils/[pseudonyme]` | Contributions questions/réponses avec liens vers les vrais détails ; projets encore non raccordés |

Tous les appels sont préfixés `/api/v1`. Les liens de profil utilisent la référence publique UUID acceptée par le backend. Aucun email de compte n’est affiché dans le contenu public. Les signalements restent indisponibles, y compris dans ces vrais détails.

## Lectures, recherche et invalidation

`lib/jokkohelp/api.ts` adapte les types générés au modèle de présentation existant : compteur réel indépendant des réponses chargées, résolution réelle, rubriques, auteurs/pays, code et solution complète. Aucun enregistrement de réponse fictif n’est créé pour représenter un compteur. La solution est épinglée une seule fois, y compris lorsqu’elle n’appartient pas à la page courante de réponses.

`live-list.tsx` réutilise cartes, filtres, états et styles validés. Les critères et la page restent dans l’URL, ainsi que dans les liens détail/retour. La soumission de critères repart à la page1. Les noms ou slugs de technologies inconnus sont transmis au serveur, qui décide du résultat ; ils ne sont plus supprimés par le catalogue local. Pas de filtrage de la seule page reçue. Le nombre de pages dépend de meta.total et meta.pageSize ; la fenêtre de liens est bornée, même avec un très grand total. Une page excessive reste vide, conformément à la réponse API, avec navigation vers les pages existantes.

La recherche livrée exige tous les mots répartis entre rubriques, titre, auteur et technologies, ignore la casse et les accents NFD ; `%`, `_` et `\` sont littéraux. Un `_` peut donc correspondre à un pseudonyme qui contient ce caractère : il ne faut pas tester uniquement le titre ni appliquer un second filtrage navigateur. Une recherche trop longue n’est pas tronquée silencieusement ; son erreur serveur reste présentée.

`useHelpResource` lit via AccountClient, proxy même origine, credentials include et no-store. Aucun cache de données privé partagé. Chaque résultat est associé au chemin, aux paramètres et à la révision/identité de session ; abort et contrôle de clé empêchent une ancienne lecture d’écraser une plus récente. Les lectures publiques personnalisées sont relues lorsque l’identité change. Réessai, focus/visibilité et compteur d’invalidation en mémoire relancent les lectures concernées, y compris les contributions d’un profil. Aucun contenu sensible dans ce compteur. Les formulaires ne se réinitialisent pas au retour du focus ; leurs lectures initiales désactivent cette revalidation. Les résultats de même identité et mêmes critères restent en place pendant une actualisation, afin de préserver les cibles de clic et les brouillons ; une erreur/404 confirmée retire les données concernées. Les anciennes données ne sont pas conservées lors d’un changement de critères ou d’identité. Une relecture déjà anonyme ne change plus artificiellement la révision de session : ce point a corrigé un vrai échec de lien au retour du focus.

`answersPage` est uniquement un paramètre de navigation du détail, converti en page pour GET answers. La liste principale utilise toujours `page`. Le panneau latéral consulte au plus cinq questions par la première technologie, omet la question courante et en montre quatre : c’est une sélection serveur limitée, sans prétendre être un moteur de similarité ni un total global filtré localement.

## Mutations et brouillons

`live-question-form.tsx` partage création/modification et les classes du formulaire existant. Champs du contrat : title/context/expected/actual/attempts/code/codeLanguage/technologyIds. Les quatre rubriques sont requises, leur somme normalisée plafonnée à20 000 unités UTF16 comme le service livré ; titre10–150 caractères, code20 000, langage30 et motif de caractères livré, technologies1–5 distinctes. Les validations restent une aide ; le serveur décide. La rubrique « Résultat obtenu » et le libellé libre de langage, différés au lot5, sont désormais présents dans le style existant.

Un PATCH ne contient que les champs modifiés. L’absence conserve les valeurs ; le retrait de code/langage envoie null explicitement, jamais sur les rubriques ou collections. La suppression du code efface son langage. Les identifiants proviennent du catalogue et des réponses réelles ; aucun id de sauvegarde inventé.

Les formulaires et décisions ont un verrou impératif contre la double soumission, plus l’état disabled/loading. Erreurs structurées associées aux champs, résumé focalisé, saisie conservée en mémoire. Après une réponse réseau/protocole ambiguë à une publication, un nouvel envoi est bloqué jusqu’à vérification explicite de la liste ou des réponses ; aucun mécanisme d’idempotence backend n’est inventé. Une réponse serveur d’échec connu ne devient pas un succès. Les brouillons ne sont pas persistés dans le navigateur. Dialogue d’abandon pour annulation/liens internes et avertissement natif avant déchargement ; le comportement de retour historique propre au navigateur n’est pas présenté comme une garantie universelle de blocage.

Le détail propose les actions selon viewerIsAuthor et l’identité réelle ; modifier sa réponse compare l’id d’auteur public avec la session. Aucun droit accordé par simple rôle administrateur. Les confirmations de solution utilisent un dialogue natif avec focus sûr, Échap et retour au déclencheur. Après mutation confirmée, relecture des réponses/détail, statut et listes/profils invalidés ; après refus, conservation de l’erreur sans faux succès. Les acceptations concurrentes suivent la sérialisation serveur, sans inventer de verrou optimiste frontend.

CSRF et Retry-After suivent le lot10, sans rejeu automatique. Correction transversale nécessaire : `AccountClient.expire` n’assimile plus tout403 métier à une expiration ; NOT_AUTHOR conserve la session. Un401 ou ACCOUNT_SUSPENDED retire toujours l’identité. Les erreurs de session relevées par GET auth/me restent déterminantes.

## Questions masquées et contenu sûr

L’endpoint privé peut retourner HIDDEN. « Mes questions » l’annonce explicitement, sans lien détail public ni modification puisque GET/PATCH public les refusent. Aucun transfert de ces données privées vers les sources publiques. Les détails inconnus et masqués utilisent le même état public, sans dévoiler la cause. Textes et extraits sont échappés par React, jamais interprétés comme HTML ; code/indentation préservés, copie native et défilement limités au bloc. Aucun Teranga Points.

## Recette locale et limites

Frontend **http://127.0.0.1:33030**, backend **http://127.0.0.1:33031**, PostgreSQL jetable sur55473. Bases `jokkodev_lot11` et `jokkodev_lot11_it`, label Docker `jokkodev.lot=11`, sans montage des données de l’équipe ; nom réel et zéro objet contrôlés avant migration. Les ressources du lot10 restent séparées sur33020/33021/55472. Le frontend est construit dans un snapshot ignoré pour ne pas écraser le .next servi par cette recette précédente.

Comptes fictifs : ouvrir **localement** `.cache/lot11/test-accounts.json`, clés owner/second, sans recopier leurs mots de passe, cookies ou tokens. Les id questionId/browserQuestionId/hiddenId permettent les vérifications contextualisées. Le transport email est fichier local ; aucune émission à un tiers. Captures et résultats : `.cache/lot11/`, hors Git. Voir le [rapport exécuté](lot-11-verification.md).

Écarts maintenus : carte simplifiée, avatar à initiales, footer textuel, édition adaptée de la création, code brut sans éditeur riche ; le panneau de questions de même technologie n’est pas une recommandation métier. Les compteurs des onglets personnels ne sont affichés que pour le filtre dont le total est réellement chargé. La réponse éditable est un formulaire inline, pas une nouvelle maquette indépendante. La fenêtre de pagination peut se replier sur deux lignes à320 pour garder ses cibles. Les détails chargés côté client nécessitent JavaScript et ont un HTML initial200 même si l’API répond404 ; ne pas les annoncer comme des404 HTTP de page.

Projets, candidatures, tableau de bord général et modération restent à raccorder. SMTP réel, HTTPS complet, exploitation systemd/Datacloud, licences, contenus éditoriaux/confidentialité, coordonnées et assets définitifs restent ouverts. Production non validée. Aucun commit/push/PR/fusion pour ce lot avant validation fonctionnelle.

## Complément lot17 — suppression propriétaire

Questions : suppression logique par leur auteur, réponses conservées mais retirées du public et solution retirée. Voir le [guide et la recette](owner-content-deletion.md) pour les contrats, références privées, permissions et limites. Aucune suppression de réponse/compte, purge ou restauration utilisateur. Recette fonctionnelle valid?e par Ousmane ; publication autoris?e pour revue, sans fusion ni d?ploiement.
