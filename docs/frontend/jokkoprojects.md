# Lot 6 — Consultation et interfaces de gestion de JokkoProjects

> État historique du lot 6. Le parcours produit utilise désormais le backend : voir [intégration lot 12](jokkoprojects-integration.md). Les sources fictives restent réservées aux aperçus.

La branche `feature/frontend-jokkoprojects` part de `develop` au commit `9e63322`, après récupération des références, vérification de la fusion du lot 5 (PR #5) et avance rapide uniquement. Le dossier était propre. Aucun changement backend, contrat API, dépendance ou verrouillage pnpm.

**Aucune opération de projets n’est intégrée à une API réelle.** Le contrat OpenAPI et les types générés inspectés contiennent seulement les deux routes de santé. Le module backend `projects` reste un emplacement réservé, sans route métier. Les projets consultables sont fictifs et explicitement signalés. Création, sauvegarde, candidatures et lecture personnelle restent indisponibles dans le parcours public.

## Routes

| Route | Comportement |
| --- | --- |
| `/projets` | Liste publique de démonstration, recherche globale, filtres de compétence/recrutement et pagination locale. |
| `/projets/[id]` | Détail public fictif, recrutement, objectif, compétences, disponibilité, responsable et membres publics renseignés. Aucun message ou compteur de candidature privé. |
| `/projets/proposer` | Page d’attente expliquant l’absence de session/API ; aucun formulaire de publication fonctionnel. |
| `/projets/[id]/modifier` | Page d’attente ; aucune donnée privée ni formulaire de modification chargé. |
| `/espace/projets` | Indisponibilité explicite de la liste personnelle sans session réelle. |
| `/dev/jokkoprojects` | Aperçus fictifs réservés à `NODE_ENV=development` ; 404 en production, y compris avec paramètres de succès ou responsable. |

Le header public, le menu mobile, les logos et le footer existants sont conservés. Les deux actions « Explorer les projets » de l’accueil conduisent à `/projets`. L’accueil ne présente pas de cartes de projets individuels : aucun nouveau bloc d’accueil n’est ajouté. Les cartes et détails partagent leurs identifiants fictifs, notamment `demo-associations`, `demo-ressources-dev`, `demo-ateliers`, `demo-tutorat` et `demo-typescript-projet`.

## Critères de consultation

Paramètres URL **de la présentation locale**, à harmoniser avec le futur contrat de Serge :

| Paramètre | Règle locale |
| --- | --- |
| `q` | Recherche par mots, sans distinction de casse ou d’accents, sur titre, résumé, objectif, responsable et technologies. Espaces externes retirés ; 200 caractères maximum dans l’interface, suivant la convention du lot 3, pas une limite métier backend. |
| `technology` | Une compétence du catalogue local ; valeur inconnue ignorée. |
| `status` | `all`, `open`, `closed` pour le **recrutement**. Aucun statut de cycle de vie ou de visibilité supplémentaire inventé. |
| `page` | Entier positif sûr, défaut 1 ; page supérieure à la dernière ramenée à celle-ci avec redirection. |

Recherche et filtres combinés s’appliquent à toute la collection **avant** pagination. Quatre projets par page, neuf exemples, soit trois pages. Tri local fixe par date décroissante puis identifiant ; aucun contrôle de tri ni valeur de tri API inventé. Changer les critères via le formulaire réinitialise la page à 1. Les liens de détail transportent seulement les critères reconnus ; le retour conserve recherche, filtres et page. Le formulaire GET fonctionne aussi sans JavaScript ; son amélioration cliente utilise une transition Next discrète, sans animation d’entrée à chaque frappe.

La liste vide initiale est distincte d’un filtre sans résultat. Le jeu public n’injecte pas d’erreur ou de permissions par des paramètres `state`/`perspective` : ces paramètres sont réservés à la route de développement. Les erreurs de lecture réelles disposent d’une frontière Next avec nouvelle tentative ; les états réseau présentés dans l’aperçu restent des injections, pas des pannes API testées.

## Organisation des composants et données

- `lib/jokkoprojects/model.ts` : types de présentation locale `ProjectView`/`ProjectDraft`, distincts des DTO générés. Les champs suivent les maquettes et notes disponibles ; leur forme ne constitue pas un contrat de transport.
- `fixtures.ts` : collection publique fictive. Membres sans emails, sessions, messages privés ou candidatures. `demo.ts` : relations personnelles fictives séparées, deux projets créés et un rejoint par le personnage de démonstration.
- `source.ts` : frontière serveur `ProjectSource` avec lecture locale asynchrone. Remplacer cette source par un adaptateur utilisant les types générés lorsque les endpoints sont prêts. Ne pas filtrer seulement une page d’API reçue.
- `query.ts` : critères, URLs et sélection globale. La normalisation de recherche du lot 3 est réutilisée. L’import TypeScript explicite est compatible avec les tests natifs Node ; `allowImportingTsExtensions` est activé uniquement dans le frontend `noEmit`, sans changement du backend.
- `shared.tsx`, `filters.tsx`, `list.tsx`, `detail.tsx` : composition publique et états. `form.tsx`, `mine.tsx`, `preview-error.tsx` : aperçus de gestion/erreur, sans adaptateur de mutation.
- `CommunityMap` extrait le motif décoratif déjà utilisé dans JokkoHelp, conservant son rendu. Carte Natural Earth et notice existante réutilisées. Les icônes cible, horloge et livre prolongent les SVG géométriques du composant commun `Icon`, sans bibliothèque.
- `styles/projects.css` : styles du lot, importés dans le dispositif existant ; tokens et polices locaux inchangés. Cartes à deux colonnes sur ordinateur, une colonne sur mobile, aucun bloc masqué par une barre d’action fixe.

Le contenu de projet est du texte brut rendu par React, avec sauts de ligne et coupure des mots longs ; aucun HTML non fiable injecté. Pas de Markdown, éditeur riche, téléversement, messagerie, transfert de responsabilité, exclusion ou suppression ajoutés. Les images sont dimensionnées et décoratives. Les champs absents sont identifiés comme non renseignés, plutôt que remplacés par des informations privées ou des compteurs arbitraires.

## Formulaires et permissions de démonstration

Le même `ProjectForm` sert à créer et modifier, avec valeurs initiales copiées et libellés adaptés. Champs : titre, objectif, compétences recherchées, disponibilité attendue du collaborateur et recrutement. Aucun champ résumé supplémentaire, fichier ou URL externe ajouté sans spécification. Disponibilité facultative dans l’aperçu ; son obligation et son format restent à confirmer. Le plafond proposé de dix compétences n’est pas imposé comme limite métier opérationnelle.

La validation **locale de démonstration** demande titre, objectif et une compétence non vides. Les erreurs sont associées aux champs ; un résumé focalisé permet d’y retourner. Envoi injecté : saisie et soumission désactivées. Erreur injectée : saisie conservée. Après validation locale, le message indique qu’aucun projet n’a été enregistré. `success` représente seulement une confirmation simulée, réservée au développement. Aucun statut public ne change après ces interactions.

L’annulation utilise le dialogue commun du lot 5 : action sûre initiale, Tab/Shift+Tab contenus, Échap, retour au déclencheur, réinitialisation du brouillon. Le brouillon reste en mémoire React, sans localStorage, URL ou logs. `beforeunload` prévient une sortie complète selon les restrictions du navigateur ; il n’intercepte pas globalement toutes les navigations internes Next.js.

Perspectives fictives : `owner`, `member`, `visitor`, `administrator`, `suspended`. Seul `owner` examine la modification ; dans Mes projets, cela s’applique uniquement aux cartes de catégorie créée. Ni un membre ordinaire ni un administrateur ne reçoit automatiquement cette action. Visiteur/suspendu ne voit aucune liste personnelle. Ces règles de présentation ne remplacent pas les permissions NestJS, et ne créent aucune session ou rôle persistant.

Les candidatures relèvent du lot 7 : pas de formulaire de message, candidature envoyée, acceptation, retrait ou adhésion simulée dans le parcours public. Recrutement ouvert : action d’envoi désactivée et explication. Recrutement fermé : message et navigation vers d’autres projets, sans action d’envoi. La perspective membre du détail est explicitement fictive et ne prétend pas établir une appartenance réelle. Aucun compteur de demandes privées dans Mes projets. Le bouton de traitement « Gérer les demandes » du PNG est différé au lot 7 ; sa responsabilité est indiquée sans action factice.

## Paramètres de l’aperçu

| Paramètre | Valeurs |
| --- | --- |
| `view` | `create` par défaut, `edit`, `mine`, `list`, `detail`. |
| `state` | Création/modification : `initial`, `empty`, `long`, `sending`, `error`, `success`. Liste : `initial`, `loading`, `empty`, `error`. Détail : `initial`, `long`, `missing`, `not-found`, `unavailable`. Mes projets : `initial`, `loading`, `empty`, `error`, `unavailable`. |
| `perspective` | Les cinq perspectives fictives ci-dessus ; défaut responsable pour gestion, visiteur pour consultation. |
| `tab` | Mes projets : `all`, `created`, `joined`, avec compteurs issus de la collection fictive entière ; zéro dans l’état vide, pas de nombre annoncé pendant chargement/erreur/indisponibilité. |
| `project` | Identifiant fictif pour le détail/préremplissage ; valeur inconnue : `demo-associations`. |

Valeurs d’écran/état/perspective inconnues remplacées par leurs défauts. Les filtres de consultation sont également examinables en aperçu. `unavailable` est une variante de conception injectée : aucun contrat disponible ne distingue actuellement projet masqué, accès refusé ou suspension. Le produit n’invente donc pas ces distinctions.

## Contrats attendus de Serge

Fournir dans OpenAPI, sans fixer ici de noms d’endpoints :

1. Liste et détail publics : identifiants, champs publics exacts, format de description/objectif, responsable et membres éventuellement publics, dates UTC, données absentes. Exclure emails et candidatures privées.
2. Recherche, filtres de technologies/recrutement, tri, pagination globale (`data`/`meta`) et paramètres autorisés ; catalogue et identifiants de technologies.
3. Création/modification : champs obligatoires/facultatifs, limites confirmées, disponibilité, recrutement, validation, permissions du responsable et réponse confirmant la sauvegarde.
4. Liste personnelle : catégories proposées/créées et rejointes, droits effectifs par projet, visibilité des contenus masqués, pagination éventuelle et compteurs autorisés. Les compteurs de candidatures attendront le lot 7.
5. Session, expiration, suspension, cookies et CSRF, refus d’autorisation ; vérifier les droits côté serveur indépendamment de la visibilité des boutons.
6. États de recrutement/visibilité réellement distinguables, ressources introuvables/non révélées, format uniforme d’erreur (`code`, `message`, `fieldErrors`, `requestId`), conflits de modification, limites d’usage et comportement de nouvelle tentative.

Après accord : `pnpm api:generate`, adaptateur utilisant le package généré et le transport central, sessions réelles puis essais avec comptes de test dédiés. Le backend, les migrations et les candidatures ne sont pas modifiés dans ce lot.

## Références et écarts

Maquettes 11, 12, 15, 16, planches 26, 27, 28, 30, 32, notes des séries 02/03/05 et matrice examinées. Modification : adaptation du formulaire de création, pas une maquette indépendante. Les contraintes proposées dans les notes restent à confirmer avec Serge.

Recherche et filtre de compétence ajoutés à la composition de la liste conformément au périmètre demandé, alors que le PNG ne montre que le recrutement. Bannières et labels de démonstration augmentent la hauteur. Header visiteur et footer provisoire existants conservés ; navigation personnelle mobile non présentée comme une session réelle. Les titres mobiles et badges se replient pour conserver la lisibilité et les cibles 44 px. Illustration de carte simplifiée existante, pas le tracé hachuré exact de la planche.

Le jeu est harmonisé entre liste, détail et Mes projets : la bibliothèque de ressources reste ouverte, conformément à la liste 11, malgré sa représentation fermée dans la planche 16. Technologies et dates suivent la même collection. Titres de contributions illustratifs sous les membres, messages et compteurs de candidature ne sont pas ajoutés comme champs publics. Confidentialité, contact et signature DevTeranga définitive restent différés.

Voir les contrôles réellement exécutés et captures dans [le rapport du lot 6](lot-6-verification.md).
