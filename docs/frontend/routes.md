# Inventaire des routes frontend — lot 10

40 routes de page App Router (31 produit et 9 aperçus). Les routes /espace utilisent la session réelle ; seul le profil personnel est raccordé. L’administration reste une attente publique sans données privées, ce qui ne constitue pas une autorisation administrateur. Les aperçus ne sont pas dans la navigation publique.

| Route | Situation actuelle |
| --- | --- |
| `/admin` | Administrateur requis — attente publique sans données privées |
| `/admin/signalements` | Administrateur requis — attente publique sans données privées |
| `/admin/signalements/[id]` | Administrateur requis — attente publique sans données privées |
| `/connexion` | Compte réel raccordé au backend |
| `/inscription` | Compte réel raccordé au backend |
| `/mot-de-passe-oublie` | Compte réel raccordé au backend |
| `/nouveau-mot-de-passe` | Compte réel raccordé au backend |
| `/verification-email` | Compte réel raccordé au backend |
| `/espace/candidatures` | Session réelle requise — interface métier encore non raccordée |
| `/espace` | Session réelle requise — interface métier encore non raccordée |
| `/espace/profil` | Lecture et modification réelles du profil propriétaire |
| `/espace/projets` | Session réelle requise — interface métier encore non raccordée |
| `/espace/projets/[id]/demandes` | Session réelle requise — interface métier encore non raccordée |
| `/espace/questions` | Session réelle requise — interface métier encore non raccordée |
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
| `/` | Public — consultation de données fictives |
| `/profils/[pseudonyme]` | Profil public réel et contributions paginées ; aucun email public |
| `/projets` | Public — consultation de données fictives |
| `/projets/proposer` | Interface publique — opération backend indisponible |
| `/projets/[id]/modifier` | Interface publique — opération backend indisponible |
| `/projets/[id]` | Public — consultation de données fictives |
| `/questions/actions` | Interface publique — opération backend indisponible |
| `/questions` | Public — consultation de données fictives |
| `/questions/poser` | Interface publique — opération backend indisponible |
| `/questions/[id]/modifier` | Interface publique — opération backend indisponible |
| `/questions/[id]` | Public — consultation de données fictives |
| `/regles` | Public — rédaction proposée à relire |
| `/ressources` | Information publique en attente |
| `/signalements` | Interface publique — opération backend indisponible |

Les paramètres des listes questions/projets sont `q`, `technology`, `status`, `page` ; le retour depuis un détail conserve ces critères. Les paramètres des aperçus sont décrits dans les guides de chaque lot, jamais des autorisations serveur. Les cinq ancres de `/regles` sont documentées dans le [guide du lot 9](information-quality.md).

`not-found.tsx` traite les routes absentes, sans être une route produit supplémentaire. Le statut HTTP observé pour une ressource inconnue peut différer après démarrage du streaming : voir le [rapport de vérification](lot-9-verification.md). Les icônes, assets statiques et proxy `/api/v1/*` ne sont pas des pages ; le proxy cible le backend existant, sans API Next concurrente.

Les opérations de compte et de profil sont raccordées. Les opérations de contribution, candidature et modération restent non raccordées et désactivées côté frontend. Les consultations publiques de questions/projets sont fictives et identifiées comme telles. À propos/Ressources restent en attente de contenu ; aucune page de conditions contractuelles n’est inventée. Voir le [bilan central pour Serge](integration-readiness.md).
