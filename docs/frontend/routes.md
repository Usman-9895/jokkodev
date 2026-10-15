# Inventaire des routes frontend — lot 9

40 routes de page App Router (31 produit et 9 aperçus). Une route produit dépendante de session/permission affiche actuellement une attente publique sans données privées : ce n’est pas un contrôle d’accès. Les aperçus ne sont pas dans la navigation publique.

| Route | Situation actuelle |
| --- | --- |
| `/admin` | Administrateur requis — attente publique sans données privées |
| `/admin/signalements` | Administrateur requis — attente publique sans données privées |
| `/admin/signalements/[id]` | Administrateur requis — attente publique sans données privées |
| `/connexion` | Interface publique — opération backend indisponible |
| `/inscription` | Interface publique — opération backend indisponible |
| `/mot-de-passe-oublie` | Interface publique — opération backend indisponible |
| `/nouveau-mot-de-passe` | Interface publique — opération backend indisponible |
| `/verification-email` | Interface publique — opération backend indisponible |
| `/espace/candidatures` | Session requise — attente publique sans données privées |
| `/espace` | Session requise — attente publique sans données privées |
| `/espace/profil` | Session requise — attente publique sans données privées |
| `/espace/projets` | Session requise — attente publique sans données privées |
| `/espace/projets/[id]/demandes` | Session requise — attente publique sans données privées |
| `/espace/questions` | Session requise — attente publique sans données privées |
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
| `/profils/[pseudonyme]` | Profil public — lecture backend indisponible |
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

Les opérations de compte, contribution, candidature et modération restent indisponibles. Les consultations publiques de questions/projets sont fictives et identifiées comme telles. À propos/Ressources restent en attente de contenu ; aucune page de conditions contractuelles n’est inventée. Voir le [bilan central pour Serge](integration-readiness.md).
