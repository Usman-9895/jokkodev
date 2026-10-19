# JokkoProjects — intégration réelle, lot 12

Évolution : le [lot 13](dashboard-applications-integration.md) raccorde désormais tableau de bord et candidatures. Les constats antérieurs d’indisponibilité ci-dessous sont historiques.

Base develop **98fc593c6c1d897e388846d2560a6bf374492253**, fusion de #22 vérifiée par Git et GitHub. Le commit propre à #19 n’est pas inclus. Branche `feature/frontend-jokkoprojects-integration`, recette fonctionnelle validée par Ousmane et publication pour revue autorisée, sans fusion. [Rapport de recette](lot-12-verification.md).

## Parcours et sources

| Route | Source réelle |
| --- | --- |
| `/projets` | `GET /projects`, `GET /technologies` |
| `/projets/[id]` | `GET /projects/:id`, `GET /projects/:id/members` |
| `/projets/proposer` | SessionGate, catalogue puis `POST /projects` |
| `/projets/[id]/modifier` | SessionGate, détail `viewerRole=OWNER`, `PATCH /projects/:id` |
| `/espace/projets` | Session réelle, `GET /users/me/projects?role&page&pageSize` |
| `/profils/[pseudonyme]?tab=projects` | Contributions publiques réelles et liens vers les détails |
| `/` | Liens existants vers `/projets` ; aucune liste de projets n’était présente sur l’accueil |

Toutes les opérations API sont sous `/api/v1`, via le proxy et le client partagé. Sources contractuelles : [guide API](../api/frontend-integration.md), OpenAPI et `schema.d.ts` générés, DTO et services NestJS examinés sans modification. Aucune migration, dépendance ou modification du client partagé ajoutée.

`lib/jokkoprojects/api.ts` adapte exclusivement les types générés : `ProjectSummaryDto`, `ProjectDetailDto`, `MemberDto`, `OwnProjectSummaryDto`, leurs pages et DTO de mutation. `ProjectInput` représente la saisie, pas un contrat parallèle. Identifiants de technologies réels ; pays ISO convertis avec la fonction de profils existante. Aucun email, message privé de candidature ou droit dérivé du rôle global n’est copié dans la présentation publique.

`live-list.tsx`, `live-detail.tsx`, `live-form.tsx` raccordent les composants et styles du lot 6. Les fonctions communes `useHelpResource`, `HelpPages`, `useDraftGuard` et l’invalidation existante du lot 11 sont réutilisées aussi pour les projets : elles ne dépendent pas d’un modèle de question. Il n’existe pas de cache de réponses global ; l’abandon réseau et la clé requête/session/identité empêchent l’affichage d’un résultat ancien. L’invalidation après sauvegarde actualise les autres vues montées et les statistiques/contributions du profil public. Une vue remontée relit l’API.

## Listes, membres et permissions

La recherche utilise le contrat livré, sans filtrage local : tous les mots, champs/normalisation et caractères littéraux décrits dans le guide API. `q`, `technology`, `status=all|open|closed` et `page` restent dans l’URL. Modifier les critères remet la page à 1 ; le détail puis le retour conservent ces critères. La taille publique est 4 ; les pages sont calculées avec `meta.total`, sans ramener silencieusement une page excessive à la dernière. Catalogue indisponible, erreur de liste et résultat vide sont distincts ; aucun repli sur les fixtures.

Les membres publics utilisent l’endpoint paginé (12 par page, paramètre frontend `membersPage`) et les indicateurs `isOwner` reçus, jamais leur position dans la liste. La pagination apparaît seulement si nécessaire ou sur une page excessive. Elle préserve les critères de la liste. Le compteur global vient du serveur, pas de la longueur de la page.

Mes projets utilise `role=OWNER` pour Créés et `role=MEMBER` pour Rejoints ; l’absence de rôle signifie Tous. Taille 3, total uniquement pour la catégorie sélectionnée : les autres totaux ne sont pas inventés. Le responsable seul voit Modifier sur un projet visible. Un membre ou un administrateur n’obtient pas ce droit par son rôle global. `HIDDEN` est explicité dans la vue privée, sans extrait objectif ni lien détail/modification ; le contenu n’est pas republié publiquement. Le détail public et les membres répondent avec la même erreur API 404 pour inconnu/masqué.

`viewerRole` et `viewerApplication` orientent uniquement la présentation. Une appartenance ou candidature existante n’est affichée que si le serveur la renvoie. Aucune mutation de candidature, adhésion, traitement de demande, suppression, transfert ou exclusion n’est ajoutée. Les signalements restent non raccordés.

## Formulaire et sécurité

Le même formulaire sert à créer/modifier : titre 10–150 caractères, objectif 30–5 000, 1–10 technologies distinctes, disponibilité facultative de 300 caractères au plus, recrutement OPEN/CLOSED. Les champs obligatoires ont labels permanents ; résumé et erreurs sont associés/focalisés. Les limites sont celles des DTO actuels, non les propositions historiques des maquettes. Texte brut React, sans injection HTML.

PATCH omet les champs inchangés. Disponibilité vidée : `null` explicite ; titre, objectif, technologies et recrutement ne sont jamais remplacés par `null`. Aucun résumé éditable ou champ nouveau n’est inventé. Fermer le recrutement n’est pas masquer le projet et n’annule pas les demandes existantes.

SessionGate et le fournisseur des lots 10/11 protègent les accès directs et démontent les données privées à l’expiration. Le CSRF reste en mémoire, acquis avant mutation, renouvelé sur erreur sans rejeu. Les refus `NOT_OWNER` ne déconnectent pas le membre. Les erreurs structurées et Retry-After passent par les composants communs.

Verrou synchrone contre double soumission, formulaire désactivé pendant envoi, saisie conservée après échec. Après résultat réseau/protocole ambigu d’une création, nouvel envoi bloqué jusqu’à vérification explicite de Mes projets ; aucune idempotence serveur n’est prétendue. Redirection uniquement vers l’id confirmé par le serveur. Pas de stockage navigateur persistant des brouillons. Annulation/navigation interne : dialogue natif commun, action sûre, Échap et retour du focus. `beforeunload` dépend du navigateur ; le bouton Retour de l’historique n’est pas intercepté universellement.

## Références, adaptations et limites

PNG 11/12/15/16 et planches 26/27/28/30/32, notes séries 02/03/05 et charte examinés. Présentation, logos et composants validés conservés. Modification adaptée du formulaire de création. La recherche/compétence de liste était déjà ajoutée au lot 6. Navigation produit commune réutilisée dans les formulaires, une ligne mobile ; initiales des membres recentrées après contrôle visuel. Disponibilité facultative conformément au contrat, contrairement à l’astérisque de la maquette. Pas de faux compteurs de demandes ou de boutons Gérer les demandes actifs. Carte simplifiée, icônes et footer textuel existants conservés.

Les sources `fixtures.ts`, `demo.ts` et `source.ts` restent pour les aperçus de développement ; aucune route produit de projets ne les appelle. `/dev/jokkoprojects` et les huit autres aperçus sont 404 en production. Les démonstrations de candidatures des lots antérieurs restent clairement isolées.

Le rendu de données est côté navigateur et nécessite JavaScript. Pour un UUID inconnu/masqué, l’HTML initial est **200**, puis l’état introuvable après l’API **404** : ne pas confondre ces statuts avec un 404 HTTP de page après streaming. Un identifiant mal formé conserve l’erreur de validation du contrat. Le serveur ne livre pas de version de modification : ce lot ne prétend pas détecter un écrasement concurrent de deux sauvegardes valides.

Le service membres annonce dans OpenAPI un responsable en premier, mais son implémentation trie par `joinedAt`, puis `userId` ; à égalité exacte, cette priorité n’est pas explicitement garantie. La présentation utilise donc `isOwner` et n’invente pas de tri global sur une seule page. Point contractuel à soumettre à Serge, sans correction backend dans ce lot.

Voir le [bilan central](integration-readiness.md) pour les domaines suivants. Candidatures, tableau de bord général et modération non intégrés ; #19 exclue. SMTP réel, HTTPS complet, systemd, Datacloud, licences et validations éditoriales restent distincts. Aucune déclaration d’aptitude à la production.
