# Préparation de livraison — lot 15

19 octobre 2026, Windows, branche locale chore/release-readiness. Base develop **c1dd09713625e25cf6e847ec2e70afde48f5ddfc**. PR #25 fusionnée, commit c85075ca5976675d303cb87329b17fb2d86dee49 ancêtre ; arbre identique au lot 14 publié. Le commit propre de #19, 75c34d36422b9c2077c72c747c6bda8f63fe6916, reste exclu. Dossier initial propre. develop avancé exclusivement par fast-forward. Préparation et recette réalisées sans publication. Après cette recette, Ousmane valide localement le lot et autorise le commit, le push de chore/release-readiness et une PR vers develop ; aucune fusion, promotion vers main ou mise en production autorisée.

## Ce que prouve cette recette

Fonctionnement local : frontend build production Next16.4.0, backend en configuration development avec transport email fichier, HTTP sur127.0.0.1. Cela ne valide pas HTTPS/SMTP réels ni l’environnement cible. Les deux modes smoke vérifient séparément les exigences de configuration backend production et cookies Secure. Ils ne constituent pas une recette navigateur HTTPS.

Node24.15.0, pnpm10.34.6, PostgreSQL17.11 Windows portable déjà installé. Deux nouvelles bases **jokkodev_lot15** et **jokkodev_lot15_it** sur127.0.0.1:55475 ; noms effectifs et zéro objet vérifiés avant migration. Aucune réinitialisation de base antérieure, aucun seed de démonstration destructif. Le cluster existant est préservé. Comptes fictifs distincts, cibles de sanctions jetables uniquement dans cette nouvelle base. L’administrateur est vérifié par email puis provisionné par la CLI admin:grant du dépôt, sans attribution SQL ou élévation publique.

Docker ne répond pas et seule la distribution interne docker-desktop est listée par WSL. Aucun hôte Linux général disponible pour cette exécution, aucun service système démarré. Le workflow Linux préparé ne doit pas être présenté comme exécuté.

## Matrice des parcours réellement vérifiés

Les succès API signifient requêtes authentifiées avec cookies/CSRF réels, PostgreSQL dédié et relectures. Les succès Chrome passent par les composants produit et le même backend ; les interceptions réseau mentionnées sont uniquement des fautes de recette, sans remplacer la réponse métier par une fixture.

| Parcours | Résultat | Vérification |
| --- | --- | --- |
| Inscription, vérification email | Réussi | Chrome201 puis204 ; message JSON corrélé à destinataire/date, URL complète décodée, token identique transmis avec CSRF, compte vérifié en base |
| Lien consommé, invalide ou représentation JSON incorrecte | Réussi | Refus400 TOKEN_INVALID pour token consommé/inconnu ; séquences littérales de fin de ligne refusées localement sans mutation |
| Récupération et renouvellement | Réussi | Chrome202 puis204 ; ancien mot de passe401, nouveau200, sessions révoquées, lien consommé refusé |
| Session rechargée et déconnexion | Réussi | Chrome et API, accès privé refusé après déconnexion/changement d’utilisateur |
| Profil propriétaire et projection publique | Réussi | PATCH réel et GET personnel/public sans email ; profil public consulté depuis Chrome |
| Question : création/modification/recherche | Réussi | Chrome, rechargement ; API recherche combinée, critères URL conservés au retour |
| Réponse d’un autre membre et modification | Réussi | Chrome publication, API modification et relecture |
| Acceptation/retrait de solution | Réussi | Chrome et API ; statut et réponses relus après rechargement |
| Mes questions, profil, accueil | Réussi | La question réellement créée apparaît dans les trois vues Chrome |
| Projet : création/modification et recrutement | Réussi | Chrome et API ; objectif persisté, CLOSED puis OPEN sans masquage |
| Candidature et listes privées | Réussi | Chrome envoi, rechargement candidat, demande reçue par le responsable |
| Acceptation et adhésion | Réussi | Chrome confirmation ; API, membre public et Mes projets rejoints relus |
| Refus et retrait distincts | Réussi | API sur projets séparés, statuts relus ; aucune nouvelle candidature fabriquée |
| Dashboard et catégories personnelles | Réussi | Chrome après changement d’utilisateur et API, compteurs/projets réels |
| Signalements question/réponse/projet | Réussi | Chrome et API ; doublon409, contenu toujours public après signalement seul |
| Accès admin | Réussi | Visiteur401, membre403 côté API ; Chrome n’effectue aucune lecture privée avant rôle confirmé |
| Filtres, pagination, détail/historique admin | Réussi | Chrome et API, OPEN/CLOSED, page2, données réelles |
| Clôture sans sanction | Réussi | Chrome et API, une action en historique, lecture seule après rechargement |
| Masquage question/réponses/projet | Réussi | API404 publics ; disparition confirmée dans les vues publiques Chrome pour les questions/projets |
| Masquage d’une solution acceptée | Réussi | API : acceptation retirée et question non résolue ; relecture Chrome |
| Suspension et révocation | Réussi | API sur auteur jetable : ancienne session refusée, nouvelle connexion refusée ; autre contenu encore public |
| Décision concurrente et perte de réponse | Réussi | Une transaction en base ; Chrome relit sans mutation rejouée et sans faux succès |
| Perte de réponse à un signalement | Réussi pour l’incertitude | Insertion réelle unique, réponse interrompue ; aucun succès certain, aucun rejeu, motif conservé lisible dans l’écran final |
| CSRF, expiration, erreur/vide admin | Réussi | Chrome403 réel, jeton renouvelé sans rejeu ; saisie conservée ; session expirée retire les données ; page filtrée vide |
| Introuvable/masqué : API et état visuel | Réussi | API404 et même état public sans motif privé |
| Introuvable/masqué : statut HTML direct | Échoué au critère404 | HTML200 conservé après streaming ; voir analyse ci-dessous |
| Neuf aperçus en production | Réussi |404 avec paramètres de simulation, vérification navigateur/HTTP et ajout au smoke reproductible |
| Lecteur d’écran, physique, Safari/Firefox, zoom réel200% | Non vérifié | Chrome headless seul ; tentative de raccourci de zoom sans changement vérifiable, aucun viewport assimilé à du zoom |
| Linux complet, HTTPS/SMTP, cible de production | Non vérifié | Aucun déploiement effectué |

## Corrections ciblées

| Défaut et reproduction | Correction | Fichiers et contrôle |
| --- | --- | --- |
| Membres à joinedAt égal : responsable parfois après un membre ; ordre secondaire peu prévisible | Tri de présentation de la page reçue par isOwner puis id, sans mutation des données, permissions ou pagination | lib/jokkoprojects/api.ts, live-detail.tsx ; test Node d’ordre, non-mutation et page partielle, fixture réelle à dates égales, contrôle Chrome |
| Réponse perdue à POST reports : motif gardé en mémoire mais plus visible alors que le message dit saisie conservée | Motif affiché en champ lecture seule, copiable, uniquement dans l’état incertain. Aucun formulaire ni nouvel envoi proposé, aucun stockage persistant | live-report.tsx ; perte de réponse après insertion réelle, assertion texte/readonly et un seul POST, focus et captures quatre largeurs |
| Garde production des aperçus vérifiée manuellement dans chaque lot | Neuf routes testées systématiquement par le smoke existant, paramètres de simulation compris | scripts/smoke.mjs ; deux modes smoke sur snapshot final |

Le tri ne garantit **pas** que le responsable appartient à la première page serveur. Une page ne contenant que des membres ne reçoit aucun membre inventé ou importé d’une autre page. L’écart de description API « responsable en premier » nécessite toujours une coordination avec Serge pour un ordre global avant pagination, si cette garantie est requise.

## Introuvables et streaming : constat et travail restant

Reproduction avec UUID inconnu et contenus masqués : API404, interface introuvable, accès HTML direct200. La navigation cliente aboutit au même état visuel ; le statut d’un transport RSC ne doit pas être confondu avec celui d’un document HTML direct.

Un essai local sur Next16.4.0 a attendu une lecture publique anonyme no-store avant le retour des pages de détail et appelé notFound sur404 uniquement. Le build et les mesures directes ont encore donné200 : les loading.tsx parents, notamment racine, permettent déjà le démarrage du flux. L’essai a été retiré, sans conserver une requête doublée inefficace ni modifier globalement le rendu.

La [documentation Next sur loading et les statuts](https://nextjs.org/docs/app/api-reference/file-conventions/loading) explique que le statut ne change plus après démarrage du flux. Options à examiner : routage ciblé avant streaming (proxy avec lookup public, sans transformer une panne en404), ou réorganisation des frontières de chargement pour les seuls détails publics. Définir aussi timeout/panne, coût de lecture, navigation cliente, courses de masquage et rendu des accès directs. Une modification globale de streaming ou un statut arbitraire ne serait pas une correction acceptable. Impact : soft404 pour indexation/clients HTTP ; API et confidentialité restent correctes. Ce point doit être traité avant de promettre des404 de document.

## Reproductibilité et CI

Installation figée exécutée. Prisma validate/generate, migrations/rejeu et catalogue/rejeu, génération OpenAPI/types sans différence, lint, TypeScript, **10 tests backend,86 frontend/client/outillage,85 intégration PostgreSQL** : réussis, aucun échec/skip dans les suites finales. Builds frontend/backend dans un snapshot isolé pour préserver les builds des recettes existantes. Logs expurgés d’URL de connexion dans .cache/lot15, comptes et emails séparés ignorés. Les contrôles Node à transports maîtrisés restent distincts des recettes HTTP/Chrome réelles.

Le workflow [.github/workflows/quality.yml](../../.github/workflows/quality.yml) est préparé uniquement. YAML analysé localement, étapes relues ; aucune exécution distante. Ubuntu24.04, Node24.15.0, pnpm10.34.6, verrou figé, PostgreSQL17.11-alpine éphémère et deux bases CI locales au job. Prisma/migrations/catalogue et rejeux, génération avec vérification du diff, lint/types/tests/builds, deux modes smoke. Aucun email réel ni secret de production ; pas de pull_request_target, permissions contents:read, credentials checkout non persistées, aucun déploiement. Reste à valider le job sur un runner Linux après publication autorisée ; les versions d’actions sont des tags v4, pas des révisions immuables.

Présence de CI ≠ protection des branches : develop est encore déclaré protected:false par GitHub lors du contrôle initial. Aucun paramètre GitHub modifié. Définir les contrôles obligatoires et revues indépendantes avec l’équipe après un premier job réellement vert.

## Contenus et licences

Voir [audit des ressources et licences](../licenses/lot15-audit.md) : rédaction des règles, politique de confidentialité, coordonnées, signature/illustrations définitives restent à approuver. La confidentialité publique reste une attente, pas une politique applicable. Aucune coordonnée inventée. Les notices ne certifient pas la conformité CADEV ; portée des restrictions sur outils/composants système toujours ouverte.

## Préalables priorisés

1. **Avant diffusion publique** : faire approuver confidentialité/règles/coordonnées/assets et les obligations de licences/distribution ; conserver les attentes honnêtes tant que non validées.
2. **Avant déploiement cible** : sélectionner/configurer SMTP réel, HTTPS/proxy et cookies Secure, PostgreSQL/rôles/secrets/migrations contrôlées, sauvegarde/restauration et rétention hors serveur, systemd/arrêts propres, stockage Datacloud et surveillance. Exécuter la recette sur cet environnement ; ce lot ne valide aucun de ces services.
3. **Avant déclarer les contrôles reproductibles validés sur Linux** : publier seulement après autorisation, obtenir un job CI vert, compléter notices natives Linux, tester scripts exploitation/restore dans un Linux jetable. Le précédent correctif restore n’est pas assimilé ici à un nouveau test opérationnel Linux.
4. Corriger la sémantique404 de document si exigée pour la livraison ; trancher l’ordre global des membres avec Serge ; compléter navigateur cible, zoom200%, lecteurs d’écran et appareils physiques.
5. Évolution contractuelle séparée éventuelle : relecture/idempotence des signalements pour résoudre la réception incertaine. Aucun mécanisme inventé dans ce lot. Décisions produit et limitation multi-processus restent dans [open-items](../decisions/open-items.md).

**Conclusion de portée :** parcours locaux vérifiés, automatisation préparée et exécutée localement selon les résultats ; aptitude au déploiement cible et validation effective de production **non acquises**. Recette locale validée par Ousmane ; publication pour revue autorisée. Cette validation ne vaut ni validation de production ni autorisation de déploiement ou de promotion vers main.

## Accès pour la validation d’Ousmane

Frontend **http://127.0.0.1:33070**, API **http://127.0.0.1:33071/api/v1**, origine/proxy/build cohérents. Ouvrir /connexion puis lire uniquement localement **.cache/lot15/test-accounts.json** : browser (auteur des créations Chrome, mot de passe courant), reporter (candidat et déclarant), other (responsable des projets API), admin (administration). author est déjà suspendu pour preuve, ne pas l’utiliser pour les parcours ordinaires. Aucun secret dans ce rapport. Emails JSON dans .cache/lot15/mail : JSON.parse, destinataire et date de demande, puis URL complète du texte décodé ; ne pas copier les séquences littérales de fin de ligne.

- Accueil : http://127.0.0.1:33070/
- Question Chrome encore visible : http://127.0.0.1:33070/questions/01a1541e-ad0d-732d-b8ec-f20c77c31e66
- Projet Chrome avec adhésion de reporter : http://127.0.0.1:33070/projets/01a1541e-fc65-7588-a0eb-b15d5b5969b6
- Projet avec candidature de browser laissée en attente : http://127.0.0.1:33070/projets/01a1541a-d00a-7161-8ee2-562c7e625566
- Demande reçue, connexion other : http://127.0.0.1:33070/espace/projets/01a1541a-d00a-7161-8ee2-562c7e625566/demandes
- Détail de candidature, browser ou other : http://127.0.0.1:33070/espace/candidatures/01a1542e-53d1-760e-bb48-b0c4a6f9719b
- Tableau de bord, Mes questions, Mes projets, candidatures : /espace, /espace/questions, /espace/projets, /espace/candidatures.
- Administration : http://127.0.0.1:33070/admin/signalements ; rapports encore ouverts sur les contenus jetables de browser/other, ne sanctionner que ces comptes de recette. Les sanctions déjà réalisées ne sont pas annulées artificiellement.

La recette évoluera après vos décisions ; ne pas recréer une candidature sur un projet déjà utilisé pour ce candidat (unicité réelle). Les identifiants supplémentaires sont dans le fichier local.

## Preuves et incidents de vérification

API :16 groupes réussis ; Chrome :10 groupes comptes/email,6 parcours transverses,10 signalements/admin initiaux,9 complémentaires,7 finaux,2 ciblés et2 contrôles de panne réseau de lecture. Les fichiers de résultats finaux n’enregistrent aucune exception navigateur. Interceptions de test uniquement pour couper une réponse après une vraie transaction, altérer CSRF ou simuler une panne réseau ; ni serveur factice ni repli vers fixtures dans le produit. Les réponses tardives/simulations de transport des tests Node restent distinctes de ces parcours réels.

Un pilote a dépassé le quota réel de cinq projets/heure du compte lors de la préparation et reçu429. Il a repris à partir des projets enregistrés, sans suppression ni modification du quota. Une première capture n’a pas trouvé les cartes de l’accueil après démarrage ; le diagnostic suivant a confirmé API200, DOM réel et aucune exception, puis la passe complète avec vérification explicite de readiness a réussi. Aucune cause définitive attribuée à cet incident du pilote. Un smoke final a quitté avec le code natif Windows3221226505 avant contrôle HTTP, sans diagnostic JavaScript ni processus restant sur ses ports. La sortie est conservée ; la reprise isolée des **deux modes smoke a réussi**, y compris les neuf aperçus404. La cause de cette interruption native reste indéterminée. Aucune protection ni assertion supprimée pour obtenir un succès.

Captures locales exclues du dépôt dans **.cache/lot15/screenshots/**. Vues finales : lot15-home, question, project, contact, dashboard, own-questions, own-projects, received, admin-final et uncertain avec suffixes1440/768/390/320. Captures supplémentaires : confirmations, motif long, code/titre long, expiration, état vide et confirmations email. Images réellement ouvertes/examinées : home1440/390, project1440/768/390/320, dashboard1440/768/320, uncertain1440/768/390/320, admin-final1440/390, long-question320. Pas de nouveau changement de charte, refonte ou écart majeur ajouté ; footer, pictogrammes et illustrations simplifiées restent les adaptations historiques. À320, le dialogue incertain défile à l’intérieur, sa fin reste accessible au clavier. Le raccourci Ctrl+Plus dans Chrome headless n’a pas produit de zoom vérifiable : **200% non validé**.

Processus finaux créés pour ce lot : frontend **PID49912/33070**, backend **PID48492/33071**, disponibles et readiness200. PostgreSQL **PID43868/55475** est réutilisé sans redémarrage ; aucun nouveau cluster créé. Les Chrome temporaires ont été fermés. Les seuls arrêts/recréations étaient les propres serveurs lot15 pendant builds/smoke.

Contrôle avant/après des recettes antérieures : mêmes PID, services lot13 (33050/33051) et lot14 (33060/33061) disponibles ; lot12 frontend/backend restent actifs (PID40376/39056), liveness200 et readiness503. Connexion directe à sa base configurée refusée ECONNREFUSED ; cela démontre la destination actuellement inaccessible, **pas la cause de son arrêt/indisponibilité**. Journaux accessibles sans détail supplémentaire sur cette cause ; aucune action sur ces services. Lots10/11 déjà injoignables et leurs anciens PID absents au début, pas de relance.

Les pannes de lecture des listes questions/projets et de la liste administrateur ont aussi été injectées uniquement dans Chrome : erreur explicite, zéro carte/ligne ancienne ou fictive, critères conservés et réessai explicite rétablit les données réelles. Aucun serveur arrêté pour ces contrôles.

## Préparation de publication après validation locale

Les15 fichiers ont été comparés au manifeste de la recette finale : aucune différence. Les contrôles réussis sont réutilisés, et non présentés comme rejoués pour la publication. Seules les mentions documentaires de validation ont été actualisées ensuite. Workflow relu : permissions contents:read, credentials non persistées, PostgreSQL éphémère avec identifiants exclusivement jetables, aucun secret de production, service payant provisionné ou déploiement automatique. Les éventuelles exécutions GitHub doivent être examinées après création de la PR ; leur présence ou leur succès ne sont pas déduits des contrôles locaux. Services de recette préservés pendant cette préparation.
