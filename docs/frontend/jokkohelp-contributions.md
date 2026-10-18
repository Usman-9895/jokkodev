# Lot 5 — Interfaces de contribution à JokkoHelp

Document historique des interfaces de démonstration. Le [lot 11](jokkohelp-integration.md) décrit leur raccordement actuel au backend et remplace les constats d’absence d’API de ce document.

Le lot 4 est intégré dans `develop` au commit `dceab34` (PR #4). La branche `feature/frontend-jokkohelp-contributions` part de cette intégration, après récupération des références et avance rapide. Aucun changement du backend, du contrat généré, des dépendances ou du verrouillage pnpm.

**Ce lot ne publie ni ne sauvegarde de contenu.** Le contrat OpenAPI présent contient uniquement les deux routes de santé. Aucune session, lecture personnelle, mutation de question/réponse ou opération sur une solution n’est intégrée. La navigation reste celle d’un visiteur.

## Routes

| Route | Comportement |
| --- | --- |
| `/questions/poser` | Champs du futur formulaire, aperçu local du texte et annulation ; publication désactivée avec explication. Aucun formulaire HTML susceptible d’envoyer les données par défaut sans JavaScript. |
| `/questions/[id]/modifier` | Information d’indisponibilité ; aucune donnée personnelle ni formulaire de modification chargé. |
| `/espace/questions` | Information d’indisponibilité de la session et de la liste personnelle ; aucun exemple présenté comme les publications du visiteur. |
| `/questions/[id]` | Consultation du lot 3 conservée ; futur formulaire de réponse désactivé. Aucun bouton d’acceptation ou retrait de solution dans le parcours public. |
| `/dev/jokkohelp-contributions` | Aperçu explicitement fictif, disponible uniquement lorsque `NODE_ENV=development`. Renvoie 404 dans le build de production, quels que soient ses paramètres. |

L’aperçu n’est pas dans la navigation publique. Ses paramètres sont locaux à la revue et **ne constituent pas un contrat API** :

| Paramètre | Valeurs et usage |
| --- | --- |
| `view` | `create` (défaut), `edit`, `mine`, `detail`, `reply`. |
| `state` | Création/modification : `initial`, `empty`, `sending`, `error`, `success`, `long`. Liste personnelle : `initial`, `loading`, `empty`, `error`, `unavailable`. Détail/réponse : `initial`, `sending`, `error`, `success`. Valeur absente ou invalide : `initial`. |
| `perspective` | `visitor`, `member`, `author`, `suspended`, `administrator`. Perspective fictive sans session, rôle persistant ou token. Défaut auteur pour modification/liste/détail, membre pour création/réponse. |
| `filter` | Liste personnelle : `all`, `resolved`, `open`. Filtres appliqués à toute la collection locale ; valeur invalide : `all`. |
| `question` | Identifiant d’une question fictive existante pour préremplir une modification. Valeur inconnue : exemple NestJS. Aucune lecture privée. |

Exemples : `/dev/jokkohelp-contributions?view=create&state=empty`, `?view=edit`, `?view=mine&filter=resolved`, `?view=detail&perspective=author`, `?view=detail&perspective=administrator`, `?view=reply&state=error`.

## Composants et contenu

- `QuestionForm` partage création et modification : titre, technologies locales, description en paragraphes et extrait de code. Le mode change le titre et l’action ; `initial` reçoit une copie du contenu existant. Les rubriques facultatives et le code restent saisissables même si la question initiale n’en contient pas ; leurs blocs vides sont retirés de l’aperçu normalisé. `demo` active seulement la vérification locale, jamais un adaptateur réseau.
- `ReplyForm` propose texte brut, code facultatif et aperçu échappé via `QuestionContent`. Aucune interprétation HTML, aucun éditeur riche, Markdown, pièce jointe ou téléversement ajouté.
- `QuestionDetail` extrait la composition existante du lot 3 et reçoit éventuellement des emplacements de réponse/actions de démonstration. Le rendu public conserve ses critères de retour et sa copie des blocs de code.
- `MyQuestions` affiche dans l’aperçu les cinq exemples déjà attribués à Awa dans les fixtures du lot 3 : une résolue, quatre ouvertes. Titres et liens vers les détails restent cohérents. Pas de pagination personnelle inventée : ni la maquette 19 ni un contrat disponible ne la définissent.
- `LocalDialogAction` utilise le dialogue HTML natif : focus initial sur Annuler, fermeture avec Échap et retour au déclencheur. L’annulation réinitialise le brouillon en mémoire ; aucune suppression serveur.
- `SolutionAction`, importé uniquement par l’aperçu, présente une confirmation fictive. Confirmer ne change **jamais** la solution ni les réponses du jeu de consultation.

Les styles sont dans `frontend/src/styles/contributions.css`, importés par l’organisation existante. Tokens, logos, polices locales et composants natifs du lot 1 sont réutilisés. Les animations et la réduction des mouvements des lots précédents restent applicables ; aucun effet d’entrée supplémentaire ne retarde les formulaires. Actions mobiles dans le flux normal, sans barre fixe masquant un champ ou le focus. Champs et boutons au moins 44 px ; le code possède son propre défilement horizontal.

`QuestionDraft` et `PreviewPerspective` dans `lib/jokkohelp/contributions/presentation.ts` sont des types **de présentation locale**, pas des copies de DTO générés. Le contenu reste le `ContentBlock` du lot 3 (paragraphes et code). Les rubriques « Résultat attendu » et « Ce que tu as essayé » existent déjà dans ce format ; elles sont facultatives dans l’aperçu. « Résultat obtenu », dessiné dans la maquette, n’est pas ajouté comme nouveau champ : sa présence et son caractère obligatoire attendent les spécifications/contrats. Aucun plafond de technologies ou longueur métier déduit d’une image.

La validation locale de démonstration vérifie titre, choix d’au moins une technologie et premier paragraphe de description non vides ; une réponse nécessite du texte. Un bloc de code seul ou une rubrique facultative ne remplace pas la description. Ces règles servent à examiner les erreurs de saisie ; elles ne sont pas annoncées comme les contraintes de NestJS. Les erreurs sont liées aux champs et un résumé reçoit le focus. Les états d’envoi sont injectés, désactivent la saisie et empêchent de répéter la validation ; il n’existe aucun envoi réel.

## Isolation et permissions

Les exemples supplémentaires de contribution sont dans `lib/jokkohelp/contributions/demo.ts`, séparés de tout futur adaptateur. Les brouillons restent dans l’état React, sans stockage navigateur, URL, logs ou session fictive. N’utiliser que des textes fictifs pendant la revue. Les paramètres publics `state=success` ou `perspective=author` n’activent pas de mutation ni de résultat simulé.

Dans l’aperçu, visiteurs et comptes suspendus ne peuvent pas saisir de réponse. Un membre peut examiner la réponse ; seul l’auteur examine modification et acceptation/retrait. La perspective administrateur n’accorde pas automatiquement ces dernières actions. La liste personnelle et la modification sont indisponibles dans les autres perspectives. **Cette présentation n’est pas une autorisation serveur.** La modification des réponses n’est pas confirmée dans les spécifications disponibles et reste différée.

Un brouillon modifié déclenche `beforeunload` lors d’une sortie complète, sous réserve des restrictions du navigateur. L’annulation a un dialogue explicite ; sa confirmation évite un second avertissement de sortie. Ce mécanisme n’intercepte pas globalement toutes les navigations internes Next.js. Aucun succès réel n’est présenté, même après vérification locale d’une saisie valide.

## Contrats attendus de Serge

Sans fixer de noms d’endpoints ou de DTO, fournir et documenter dans OpenAPI :

1. Session courante, état suspendu, expiration, déconnexion, cookies et mécanisme CSRF utilisable par les mutations ; permissions effectives par contenu.
2. Création et modification des questions : format exact de contenu, champs/rubriques obligatoires ou facultatifs, technologies et identifiants du catalogue, limites, normalisation et réponse confirmant l’enregistrement.
3. Lecture des questions personnelles : périmètre propriétaire, statuts (y compris contenus masqués si prévu), filtres, tri et éventuelle pagination serveur.
4. Publication des réponses : contenu, validation, droits, erreurs et résultat réel. Trancher explicitement si leur modification appartient au périmètre métier et avec quelles permissions.
5. Acceptation et retrait : auteur de la question, réponse appartenant à la question, transactions et traitement de concurrence. L’administrateur n’obtient pas ce droit par simple rôle.
6. Codes HTTP et erreurs uniformes (`code`, `message`, `fieldErrors`, `requestId`), noms des champs, refus d’accès, expiration, limites d’usage et comportement de nouvelle tentative/double soumission.

Après livraison des contrats : génération via `pnpm api:generate`, utilisation des types générés et du client HTTP central, intégration des adaptateurs et essais avec comptes de test dédiés. Les données de démonstration ne serviront pas de cache privé. Ne pas mettre de mots de passe, cookies ou tokens dans le stockage navigateur. Signalement, authentification, contrats et backend restent hors de ce lot.

## Références et écarts conservés

Maquettes 04, 03 et 19, planches 27, 28, 29 et 32 et leurs notes effectivement consultées. La charte prévaut sur les approximations PNG. La variante modification adapte le formulaire de création ; il n’existe pas de maquette distincte à reproduire.

Les bannières de démonstration/indisponibilité ajoutent de la hauteur. Le header reste visiteur, la navigation personnelle est une présentation fictive et la barre personnelle mobile de la maquette n’est pas présentée comme une navigation connectée réelle. Les cartes reprennent les auteurs, dates et compteurs du jeu local, pas les trois publications exactes de la planche. Tags avec boutons natifs de 44 px et sélecteur séparé ; aucun plafond de cinq tags inventé. Les champs supplémentaires non confirmés et la barre d’éditeur riche sont différés. Logos compacts validés, avatars à initiales et signature DevTeranga provisoire des lots précédents conservés. Confidentialité et contact définitif restent différés.

Voir les preuves, commandes et limites dans [le rapport du lot 5](lot-5-verification.md).
