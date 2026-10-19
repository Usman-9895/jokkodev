# Tableau de bord et candidatures — intégration lot 13

Le parcours produit utilise exclusivement l’API réelle. Références : [guide API](../api/frontend-integration.md), [session/CSRF](../decisions/003-sessions-csrf.md), [rapport de recette](lot-13-verification.md), [maquettes historiques du lot 7](dashboard-applications.md). Aucun contrat, backend, migration ou type généré modifié.

## Routes et composants

| Route | Source et comportement |
| --- | --- |
| /espace | LiveDashboard : identité SessionProvider, GET /users/me/dashboard et listes personnelles existantes pour les dernières questions, projets et candidatures |
| /projets/[id] | LiveApplicationPanel : GET /projects/:id fournit viewerRole/viewerApplication ; POST /projects/:id/applications |
| /espace/candidatures | LiveApplications : GET /users/me/applications ; status/page dans l’URL |
| /espace/candidatures?vue=recues | Même composant : GET /users/me/received-applications pour tous les projets gérés |
| /espace/projets/[id]/demandes | Vérification viewerRole OWNER puis GET /projects/:id/applications ; onglets de statut, PENDING par défaut |
| /espace/candidatures/[id] | LiveApplicationDetail : GET /applications/:id, candidat ou responsable autorisé |

Tous les endpoints sont sous /api/v1. Navigation développeur existante unique ; Mes questions et Mes projets réutilisés. La vue reçue globale est une sous-navigation de Candidatures, celle d’un projet reste dans Mes projets. Ajout du détail privé : 41 routes, dont neuf aperçus. Voir [inventaire](routes.md).

Types dérivés des schémas et opérations générés dans lib/applications/api.ts ; aucune copie de DTO. useHelpResource réutilise le transport AccountClient et ses gardes d’identité, AbortController et révision de session. Aucun cache de données privé partagé ni stockage persistant des messages. Les listes et détails de candidature retirent leurs anciennes données pendant une relecture ; une réponse d’une ancienne identité est rejetée. SessionGate retire les vues privées après déconnexion/expiration. Les refus métier ne déconnectent pas l’utilisateur.

## Présentation et données

Le dashboard reçoit seulement des compteurs : questions total/résolues/ouvertes/masquées, réponses total/acceptées, projets créés/rejoints et candidatures envoyées/en attente/reçues en attente. Son identité vient de la session et ses sections récentes des listes privées existantes. Aucun flux d’activité ou compteur par projet n’est inventé. Les erreurs partielles restent visibles ; aucune fixture de repli. Les contenus masqués n’obtiennent pas de lien public.

Les listes utilisent status=PENDING|ACCEPTED|REJECTED|WITHDRAWN, page et pageSize=4 ; total/pages viennent de meta.total et aucun second filtrage local n’est appliqué. Un changement de filtre réinitialise page=1. Libellés : En attente, Acceptée, Refusée, Retirée. Une projection de projet available=false devient « Projet indisponible », sans titre ancien, responsable ou lien public. Compétences du candidat = applicantSkills du profil, pas un champ inventé dans le formulaire. Aucun message privé n’est ajouté aux profils ou au détail public du projet.

## Mutations et permissions

Message : 20 à 1 000 caractères, non vide et sans NUL ; erreurs locales et champs serveur associés. Le brouillon reste en mémoire, avec protection contre une sortie non enregistrée. Les doubles soumissions sont bloquées synchroniquement. POST confirme un identifiant réel avant tout succès ; les projets devenus indisponibles sont relus. Une seule candidature par candidat/projet, même après refus ou retrait : aucun nouveau formulaire pour une candidature existante. Responsable, membre et recrutement fermé n’obtiennent pas de formulaire d’envoi.

PATCH /applications/:id utilise uniquement ACCEPTED, REJECTED ou WITHDRAWN. Le candidat retire sa demande PENDING ; le responsable autorisé accepte/refuse une demande PENDING, même après fermeture du recrutement. Un membre ou un administrateur n’acquiert pas les droits privés du responsable. Le serveur reste l’autorité ; viewerRole oriente seulement la présentation.

La confirmation native nomme candidat, projet et effet. Focus initial sur Annuler, boucle Tab/Maj-Tab explicite, Échap et retour au déclencheur ; résultat actualisé annoncé et focalisé même si la carte quitte le filtre. Une décision 200 répétée est traitée comme l’état courant, pas comme une erreur. Une acceptation confirmée correspond au contrat transactionnel d’adhésion. L’invalidation partagée relit membres, listes, Mes projets, profil et dashboard montés.

Une réponse réseau perdue ou incomplète bloque une nouvelle mutation : « Relire l’état » effectue un GET sans rejouer le POST/PATCH. Une relecture explicite établit l’état réel. Les erreurs CSRF renouvellent le jeton sans rejeu ; une nouvelle action de l’utilisateur est nécessaire. Erreurs structurées et Retry-After sont ceux du transport existant. Conflit 409 : actualiser et afficher le refus, jamais un succès local.

## Adaptations et limites

Composition, cartes, navigation et styles réutilisés. Vue globale reçue et route de détail privée adaptées aux contrats livrés ; la maquette 18 sert à la vue par projet. Les onglets n’affichent un nombre que pour le total du filtre réellement chargé. Les compétences absentes sont explicitées. Le dashboard conserve deux cartes principales et expose les autres totaux disponibles dans ses sections ; aucune date d’activité absente du contrat n’est fabriquée. Pseudonymes réels de recette et dates serveur remplacent les noms et compteurs de maquette. Footer et adaptations historiques restent documentés dans les guides visuels.

Les démonstrations /dev/espace et autres /dev/* restent séparées et renvoient 404 en production. Modération/signalements non raccordés ; Teranga Points exclue. Le statut HTTP initial 200 des ressources publiques inconnues après streaming reste la limite des lots 11/12 ; les API renvoient 404. Les arbitrages de licences et l’aptitude à la production restent ouverts.
