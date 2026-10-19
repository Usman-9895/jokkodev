# Vérification du lot 12 — intégration JokkoProjects

18 octobre 2026. Base **98fc593c6c1d897e388846d2560a6bf374492253**, branche locale `feature/frontend-jokkoprojects-integration`. Rapport des contrôles avant publication. Recette fonctionnelle du lot 12 validée par Ousmane ; commit, publication de la branche et PR vers develop autorisés, sans fusion.

## Préparation et environnement

AGENTS, README, décisions et guides projets/API lus. Skill jokkodev-ui-fidelity appliqué : charte, procédure, notes et maquettes 11/12/15/16 et planches 26/27/28/30/32 réellement consultées/ouvertes. #22 est fusionnée selon GitHub, merge commit identique à origin/develop, tête eab98bc ancêtre. #19, commit propre 75c34d36422b9c2077c72c747c6bda8f63fe6916, n’est pas ancêtre. Dossier initial propre ; develop avancé uniquement par fast-forward, nouvelle branche créée sans reset/rebase.

Les anciens ports de recette n’écoutaient pas. Le moteur Docker n’était pas accessible ; Docker Desktop a été démarré. Ses conteneurs à redémarrage automatique étaient alors visibles, sans arrêt ni modification par cette mission. Les conteneurs des lots 10/11 étaient arrêtés et n’ont pas été relancés/réinitialisés. La cause de leur arrêt antérieur n’est pas démontrée. Aucun nettoyage des données ou sauvegardes existantes.

Nouvelle destination dédiée : **127.0.0.1:55474/jokkodev_lot12**, base d’intégration jokkodev_lot12_it. Conteneur `jokkodev-lot12-20261018`, label jokkodev.lot=12, PostgreSQL17.11-alpine en tmpfs, aucun montage de données de l’équipe. Nom effectif et zéro objet vérifiés avant migrations ; catalogue rejoué sans seed de démonstration destructif. Les fixtures de membres, candidature informative, masquage et expiration restent uniquement dans cette base. Les dates de la fixture de tri des membres et les contenus longs sont restaurés dans finally. Les données de recette créées sont conservées. Le tmpfs est volatil si le conteneur est arrêté : ne pas le redémarrer pour préserver la recette.

Node24.15.0, pnpm10.34.6, Windows, Chrome headless installé, PostgreSQL sous Docker Linux. Dépendances verrouillées déjà installées réutilisées, aucun changement de dépendance/verrou. Frontend **http://127.0.0.1:33040**, backend **http://127.0.0.1:33041**, APP_ORIGIN et proxy/build alignés. Cookies HttpOnly locaux HTTP, CSRF dédié ; emails fichier local vers example.test, aucun tiers. Build dans `.cache/lot12/runtime`, sans écraser les builds des autres recettes. Secrets dans env.json/pg.env/test-accounts.json ignorés, jamais copiés dans le dépôt ou les captures.

Les serveurs lot 12 et leur conteneur restent disponibles pour Ousmane. PID/ports exacts dans `.cache/lot12/frontend-process.json` et `backend-process.json`. Seuls ces processus, vérifiés par port/PID, ont été arrêtés/recréés pour build et pannes. Les Chrome temporaires ont été fermés. Une interruption du frontend a été observée pendant la première recette Chrome ; aucune cause établie. Ce seul frontend a été relancé, et les contrôles interrompus terminés ensuite.

## Contrôles réellement exécutés

| Contrôle | Résultat |
| --- | --- |
| Prisma validate/generate | Réussis |
| Migrations et rejeu | Réussis, base dédiée vide puis aucune migration en attente |
| Catalogue et rejeu | Réussis |
| Génération OpenAPI/types | Réussie sans différence ; aucun contrat modifié |
| Lint / TypeScript | Réussis sur le code final |
| Tests backend | **10 réussis**, aucun échec/skip |
| Tests frontend/client/outillage | **68 réussis**, dont sept nouveaux tests projets, aucun échec/skip |
| Intégration PostgreSQL | **85 réussis**, aucun échec/skip |
| Builds frontend/backend | Réussis dans le snapshot isolé ; reconstruits après les corrections visuelles |
| Smoke | Deux modes réussis : API/base indisponible503 et base dédiée200 |
| Parcours HTTP réels | **14 groupes réussis**, AccountClient, cookies/CSRF et PostgreSQL réels |
| Parcours Chrome | **13 groupes réussis**, aucune exception enregistrée |
| Chrome complémentaire | **7 groupes réussis**, vraie panne, CSRF, expiration, réponse tardive et contenus longs |
| Revue finale | **4 groupes réussis**, 20 captures, clavier/focus, pagination membres et liste personnelle vide |
| Aperçus en production | Les neuf routes `/dev/*` renvoient404, y compris avec paramètres de simulation |

Commandes et sorties sans identifiants de connexion dans `.cache/lot12/logs/`. Runners/checks : baseline-checks.json, final-checks.json, integration-checks.json, build-check.json, smoke-checks.json, real-http-checks.json, browser-checks.json, browser-extra-checks.json, final-visual-checks.json. Les contrôles d’intégration et smoke précédant les derniers ajustements de présentation sont réutilisés après ces seuls changements frontend/CSS ; backend/contrats inchangés. Lint/types/tests et builds ont été repris sur le dernier ajustement des titres de cartes. Les tests Node contrôlés ne sont pas présentés comme des parcours navigateur ou PostgreSQL.

## Résultats fonctionnels

- Deux comptes fictifs indépendants enregistrés. Création via adaptateur puis formulaire Chrome ; deux submit synchrones produisent un seul POST. Détail, listes, Mes projets et profil public utilisent le véritable identifiant.
- Modification préremplie, valeurs et recrutement confirmés côté API et après rechargement. Disponibilité effacée par null, champs absents conservés. Null interdits et collection vide rejetés400 ; pas de500. Ouverture/fermeture ne masque pas le projet.
- NOT_OWNER réel pour autre membre, membre rejoint et administrateur ; session conservée. L’administrateur temporaire de fixture est remis MEMBER dans finally. Aucune élévation frontend ou session fictive persistante.
- Catégories OWNER/MEMBER et totaux/pagination serveur, membre ajouté par fixture dédiée sans candidature intégrée. Une candidature PENDING préparée en base est seulement informative ; détail anonyme sans indication privée, aucun message de candidature exposé.
- Recherche plusieurs mots répartis entre champs, casse/accents, `%` et `_` littéraux, technologie inconnue, filtres combinés, pages distinctes/total global, retour liste↔détail. Une véritable réponse ancienne est retenue puis libérée après une recherche plus récente, sans écraser ses résultats.
- Membres publics paginés, rôles reçus et liens vers profils ; pas d’email. Retour de pagination préserve les critères. Contributions du profil : vrais liens, projets masqués exclus.
- Masqué/inconnu : même404 PROJECT_NOT_FOUND pour détail/membres ; privé HIDDEN avec explication sans lien public/modification. HTML de page initial **200**, puis état introuvable après API404 : limite maintenue et explicitée.
- CSRF réellement altéré après acquisition en mémoire : un403, renouvellement sans rejeu, saisie préservée, nouvel envoi explicite réussi. Vraie panne du seul backend33041 : création incertaine conservée/bloquée, aucun rejeu ; zéro projet en SQL pendant panne, exactement un après vérification et nouvel envoi. Liste en erreur sans fixtures et reprise après réessai.
- Expiration réelle par fixture temporelle : liste privée démontée et contrôles du responsable retirés ; consultation publique maintenue. Identité et données privées ne persistent pas entre utilisateurs.
- Non-régression réelle comptes/JokkoHelp : connexion, profil, création question, réponse du second compte, acceptation puis retrait de solution, consultations et navigation accueil→projets.
- Clavier : résumé de validation focalisé, erreurs associées, annulation avec action sûre, Échap et saisie conservée ; lien d’évitement focalise réellement main ; menu mobile Échap. Mouvement réduit actif, aucune animation CSS en cours constatée. Titres sans espaces150, objectif proche5000 et disponibilité300 restent sans débordement aux quatre largeurs.

## Corrections et essais non conclusifs conservés

Première compilation : nom d’icône absent et affectation union TypeScript du PATCH corrigés, sans cast généralisé. Un premier test de requête privée n’établissait pas sa session de fixture : précondition corrigée, test rejoué. Le premier essai CSRF renouvelait le cookie avant la première acquisition en mémoire, et réussissait donc légitimement ; il a été refait après une mutation réelle et navigation SPA. La première fixture d’expiration plaçait expiresAt avant createdAt pour une session récente, refusée par la contrainte PostgreSQL ; createdAt et expiresAt ont ensuite été ajustés conformément à cette contrainte, puis le scénario a réussi. Ces échecs de helpers ne sont pas comptés comme réussites produit ni masqués par un assouplissement des protections.

Après examen des captures : navigation du formulaire alignée sur l’espace produit (une ligne mobile), initiales des membres recentrées, pagination de membres masquée lorsqu’inutile, titres des cartes autorisés à occuper leur ligne sur tablette plutôt que comprimer leurs mots. Les captures affectées sont reprises. Les formulaires gardent les compositions, tokens et composants validés ; pas de refonte de navigation générale.

## Réserve backend séparée

Écart mineur confirmé : `projects.controller.ts`, description de GET members, annonce le responsable en premier ; `projects.service.ts`, `memberOrder` et `members`, trie par joinedAt/userId. Avec deux adhésions au même instant et l’id du membre inférieur, une première page de taille1 renvoie un non-responsable (HTTP200, total2, isOwner=false). Reproduction par mise à égalité temporaire des dates de la fixture dédiée, puis restauration. Preuve : `.cache/lot12/member-order-check.json`. Attendu selon la description : responsable d’abord. Corriger le tri global avant pagination ou clarifier le contrat avec Serge ; ne pas trier seulement la page côté navigateur. Aucun backend modifié ; les rôles affichés restent justes via isOwner. Cet écart n’empêche pas la gestion par le responsable.

## Accès et captures

Ouvrir localement `.cache/lot12/test-accounts.json`, entrées owner/second, pour les identifiants fictifs. Ne pas recopier mots de passe ou tokens dans le chat. Les clés projectId, browserProjectId, hiddenId, joinedId et pendingId servent aux scénarios. Routes : `/projets`, `/projets/proposer`, `/projets/[projectId]`, `/projets/[browserProjectId]/modifier`, `/espace/projets?role=OWNER` ou MEMBER, `/profils/[owner.id]?tab=projects`.

Captures hors Git : `.cache/lot12/screenshots/lot12-{list,detail,create,edit,mine}-{1440,768,390,320}.png`, plus long, validation, panne, expiration et catégorie vide. Les vues ordinateur/mobile sont réellement examinées ; ce n’est pas une déclaration pixel perfect.

Candidatures, traitement des demandes, tableau de bord général, signalements/modération restent hors intégration. Pas de Teranga Points. Disponibilité facultative, compteurs personnels limités à la catégorie chargée, carte simplifiée, icônes/footer provisoires et panneau de candidature indisponible sont documentés dans le [guide](jokkoprojects-integration.md). Aucun contrôle lecteurs d’écran, appareil physique, Safari/Firefox, zoom navigateur réel200% ou déploiement Linux complet exécuté. SMTP réel, HTTPS, systemd, Datacloud, licences et contenus/coordonnées définitifs restent ouverts. **Aptitude à la production non validée.**

## Vérification avant publication

Les 24 fichiers du lot ont été comparés au manifeste de l’état testé : aucune différence. Les contrôles réussis sont réutilisés, et non annoncés comme relancés pour la publication. Seules les mentions documentaires de validation et d’autorisation ont ensuite été actualisées. Aucun arrêt ou redémarrage de service pour cette publication.
