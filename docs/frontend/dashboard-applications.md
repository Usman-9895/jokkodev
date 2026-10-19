# Lot 7 — tableau de bord et candidatures

Évolution : le [lot 13](dashboard-applications-integration.md) raccorde désormais tableau de bord et candidatures. Les constats antérieurs d’indisponibilité ci-dessous sont historiques.

## État réel

Le lot 6 a été fusionné par la PR #6, base `develop` à `8615a98`. Branche de travail : `feature/frontend-dashboard-applications`. Aucun backend ou type généré modifié. Aucune dépendance ajoutée.

Le contrat OpenAPI (`packages/api-client/src/schema.d.ts`) ne définit que liveness/readiness et le format général d’erreur. Les dossiers NestJS auth, users, projects et applications restent des emplacements réservés. **Aucune opération de session, résumé, candidature, décision ou adhésion n’est intégrée.** Le transport HTTP prévoit cookies/no-store et un futur jeton CSRF, sans constituer un contrat d’authentification opérationnel.

## Routes

| Route | Comportement |
| --- | --- |
| `/espace` | Tableau de bord indisponible, sans identité ni activité privées. |
| `/espace/candidatures` | Liste personnelle indisponible, lien vers projets publics. |
| `/espace/projets/[id]/demandes` | Lecture/décisions indisponibles, aucun candidat affiché. Le paramètre ne déclenche aucun accès privé. |
| `/projets/[id]` | Consultation fictive existante ; candidature publique désactivée. |
| `/dev/espace` | Espace de démonstration commun, 404 hors développement. |

Paramètres de `/dev/espace` :

- `view=dashboard|sent|received|apply|questions|projects`, défaut dashboard.
- `state` : états compatibles avec la vue seulement ; valeurs absentes/invalides normalisées. Chargement, vide, erreur, expiration ; candidature : envoi/erreur/confirmation injectés.
- `perspective=eligible|visitor|pending|member|owner|closed|administrator|expired`. Aucun cookie, rôle ou utilisateur persistant créé. La perspective propriétaire n’accorde aucune autorisation serveur.
- `filter=all|pending|accepted|refused|withdrawn` pour candidatures ; défaut en attente pour demandes reçues. Filtres personnels de questions et catégories de projets conservés via leurs composants existants (`filter=resolved|open`, `tab=created|joined`).
- `outcome=success|error|conflict|expired` : résultat local d’une décision fictive. Un conflit/une erreur n’affiche pas une réussite et ne modifie pas la candidature. L’expiration retire les messages affichés. Réessayer/relire signifie relire les exemples, jamais un serveur.

Les paramètres ne sont pas un futur contrat API. Aucune pagination ajoutée aux candidatures : les maquettes n’en définissent pas et aucun contrat n’est disponible. Les sélecteurs et onglets utilisent GET/liens natifs, avec paramètres cohérents et sans dépendance à un état global.

## Composants et navigation

`DeveloperNavigation` est partagée : tableau de bord, profil, questions, projets, candidatures et demandes reçues. L’élément courant utilise `aria-current=page`, une forme et une couleur distinctes. Desktop : colonne latérale ; mobile : six accès sur deux lignes pour conserver les six destinations demandées et les cibles tactiles. Le header reste public, faute de session réelle.

`MyQuestions` et `MyProjects` des lots 5/6 sont réutilisés avec `embedded` et `baseHref`, sans deuxième liste ou seconde navigation. Leurs anciens aperçus conservent leur adresse ; leurs navigations personnelles utilisent le même composant. Le profil mène à l’aperçu existant du lot 4. Les créations/modifications mènent aux aperçus existants.

`DeveloperDashboard` dérive ses compteurs des mêmes collections fictives (cinq questions, quatre candidatures dont une en attente, projets créés/rejoints existants). `SentApplications` expose uniquement les demandes d’un candidat fictif. `ReceivedApplications` présente les messages de deux candidats fictifs absents des membres du projet public ; lecture et boutons réservés à la perspective responsable. Les compétences appartiennent au profil d’exemple, sans champ supplémentaire de candidature.

`ApplicationForm` est injecté comme panel dans le détail existant via `contributionPanel` ; ce slot ne change pas le parcours public. C’est une adaptation sobre du formulaire du détail projet 12 et de la planche 30. Message non vide validé localement, sans limite de longueur métier inventée. Pas de stockage, téléversement, messagerie, notifications ni Teranga Points. Rien n’est sérialisé par un champ texte nommé en cas de soumission native sans JS.

Les dialogues réutilisent `LocalDialogAction` : Annuler reçoit le focus, Échap ferme, Tab/Shift+Tab sont contenus, focus restitué. Après décision locale et disparition de la carte du filtre courant, le focus va au message de résultat. Un verrou immédiat empêche les doubles décisions, en plus de désactiver les actions pendant l’attente simulée. Les demandes traitées sont en lecture seule. Les temporisations locales servent uniquement à examiner cet état ; elles ne représentent aucun délai API.

## Données et règles de démonstration

`lib/applications/demo.ts` est séparé du transport/API et n’est consommé que par l’aperçu. Les statuts dessinés et notes 17/18/29/30 définissent les variantes de présentation ; leurs codes API restent à confirmer. Aucun retrait ni nouvelle soumission proposé dans ce lot. Aucun ajout aux membres après une décision fictive. Une candidature acceptée n’est pas interprétée comme preuve d’adhésion : ce champ/effet attend une réponse serveur explicite.

Les candidatures utilisent des projets existants, sans demande en attente sur un projet déjà rejoint ou proposé par Awa. Les noms de candidats diffèrent de la maquette pour éviter de candidater avec des personnes déjà membres du jeu public. Le recrutement fermé des demandes reçues est une **variante de contexte**, sans mutation du projet public ouvert. Compteurs du dashboard dérivés de l’état initial ; les décisions de l’aperçu mettent à jour uniquement sa collection et ses onglets, puis sont perdues au rechargement. Pas de cache privé ou session fictive partagée.

## Préalables attendus de Serge

Sans inventer de chemins d’endpoints, il faut publier et régénérer les contrats des opérations suivantes :

1. Session/identité, expiration, suspension, déconnexion et permissions effectives sur chaque projet ; règles cookies/CSRF.
2. Résumé du dashboard : compteurs et sources autorisées, champs publics/privés, états d’absence d’activité et pagination des aperçus.
3. Création de candidature : message, validations et limites, recrutement, exclusion du propriétaire/membre, unicité et gestion d’un résultat ambigu.
4. Candidatures envoyées : statut, projet inaccessible/masqué, visibilité du message, filtre/pagination, politique éventuelle de retrait et états terminaux.
5. Demandes reçues : portée limitée au responsable, profil public autorisé, projet cible, filtrage/pagination et absence d’accès automatique ADMIN/membre.
6. Décisions : transitions légales, concurrence/idempotence, refus d’accès/expiration, erreurs de validation, réponse de relecture après conflit. Confirmer l’effet transactionnel d’acceptation sur `ProjectMember`, sans inférer une adhésion du seul statut.
7. Codes HTTP et erreurs uniformes réellement exposées, mise à jour des vues/compteurs après réponse serveur et nettoyage des caches privés.

Le frontend appliquera ces règles après publication des types générés ; les protections NestJS restent indispensables. Aucun endpoint deviné ni mécanisme de token local ajouté.

## Écarts assumés

Bannières de démonstration, header visiteur, six entrées mobile au lieu des cinq de la planche, icônes géométriques réutilisées, noms/compteurs harmonisés avec les collections existantes, footer DevTeranga provisoire. Profil des candidats indisponible, donc aucun faux lien vers une identité non définie. Retrait omis ; messages d’adhésion remplacés par une indication prudente. Carte du détail simplifiée héritée du lot 6. Aucune fidélité parfaite ou authentification fonctionnelle revendiquée.

Les conditions, captures et contrôles réellement exécutés figurent dans [le rapport du lot 7](lot-7-verification.md). Appareils physiques, lecteurs d’écran, Linux et zoom réel 200 % ne sont pas couverts par la revue automatisée.
