# Inventaire des routes frontend — lot 14

41 routes de page App Router (32 produit et 9 aperçus). Les routes /espace utilisent la session réelle ; profil personnel, Mes questions, Mes projets, tableau de bord et candidatures sont raccordés. L’administration minimale est raccordée sous SessionGate et rôle ADMIN réel ; le serveur vérifie chaque lecture et mutation. Les aperçus ne sont pas dans la navigation publique.

| Route | Situation actuelle |
| --- | --- |
| `/admin` | Administration réelle réservée à ADMIN, sans données avant vérification de session |
| `/admin/signalements` | Administration réelle réservée à ADMIN, sans données avant vérification de session |
| `/admin/signalements/[id]` | Administration réelle réservée à ADMIN, sans données avant vérification de session |
| `/connexion` | Compte réel raccordé au backend |
| `/inscription` | Compte réel raccordé au backend |
| `/mot-de-passe-oublie` | Compte réel raccordé au backend |
| `/nouveau-mot-de-passe` | Compte réel raccordé au backend |
| `/verification-email` | Compte réel raccordé au backend |
| `/espace/candidatures` | Listes privées réelles envoyées/reçues (vue=recues), filtres/pagination serveur et retrait |
| `/espace/candidatures/[id]` | Détail privé réel candidat/responsable et décisions autorisées |
| `/espace` | Identité, compteurs et sections personnelles réels |
| `/espace/profil` | Lecture et modification réelles du profil propriétaire |
| `/espace/projets` | Liste réelle privée, catégories OWNER/MEMBER et pagination serveur ; masqués explicités |
| `/espace/projets/[id]/demandes` | Demandes privées réelles du projet, réservées au responsable ; décisions et statuts serveur |
| `/espace/questions` | Liste personnelle réelle, statuts/pagination serveur et masquage explicite |
| `/dev/comptes` | Aperçu développement — 404 en production |
| `/dev/design-system` | Aperçu développement — 404 en production |
| `/dev/espace` | Aperçu développement — 404 en production |
| `/dev/informations` | Aperçu développement — 404 en production |
| `/dev/jokkohelp` | Aperçu développement — 404 en production |
| `/dev/jokkohelp-contributions` | Aperçu développement — 404 en production |
| `/dev/jokkoprojects` | Aperçu développement — 404 en production |
| `/dev/moderation` | Aperçu développement — 404 en production |
| `/dev/signalements` | Aperçu développement — 404 en production |
| `/a-propos` | Information publique en attente |
| `/confidentialite` | Information publique en attente |
| `/contact` | Orientation publique — contact direct indisponible |
| `/` | Dernières questions réelles ; autres domaines selon leur état d’intégration |
| `/profils/[pseudonyme]` | Profil public réel et contributions paginées ; aucun email public |
| `/projets` | Liste réelle, catalogue API, critères URL et pagination serveur |
| `/projets/proposer` | Session requise ; création réelle |
| `/projets/[id]/modifier` | Session responsable requise ; modification/recrutement réels |
| `/projets/[id]` | Détail et membres publics réels ; candidatures réelles selon session et permissions |
| `/questions/actions` | Information sur les contributions et les entrées de signalement réelles |
| `/questions` | Liste réelle et catalogue API, critères URL et pagination serveur |
| `/questions/poser` | Session requise ; création réelle |
| `/questions/[id]/modifier` | Session auteur requise ; modification réelle |
| `/questions/[id]` | Détail et réponses réels ; réponse/modification/solution selon session et auteur |
| `/regles` | Public — rédaction proposée à relire |
| `/ressources` | Information publique en attente |
| `/signalements?type=…&target=UUID` | Repli réel par type/identifiant ; entrées contextuelles en dialogue, POST /reports sous session |

Les paramètres des listes questions/projets sont `q`, `technology`, `status`, `page` ; le retour depuis un détail conserve ces critères. Les paramètres des aperçus sont décrits dans les guides de chaque lot, jamais des autorisations serveur. Les cinq ancres de `/regles` sont documentées dans le [guide du lot 9](information-quality.md).

`not-found.tsx` traite les routes absentes, sans être une route produit supplémentaire. Le statut HTTP observé pour une ressource inconnue peut différer après démarrage du streaming : voir le [rapport de vérification](lot-9-verification.md). Les icônes, assets statiques et proxy `/api/v1/*` ne sont pas des pages ; le proxy cible le backend existant, sans API Next concurrente.

Les opérations de compte et de profil sont raccordées. Les contributions JokkoHelp sont raccordées. Les projets sont raccordés ; candidatures et modération restent non raccordées. À propos/Ressources restent en attente de contenu ; aucune page de conditions contractuelles n’est inventée. Voir le [bilan central pour Serge](integration-readiness.md).
