# Navigation, auto-signalement et animation — lot 16

Branche locale fix/navigation-self-report-animation, base develop **2ebb8fa4924d85527919fb46728f9fd4ba035dfa**. PR#26 fusionnée et commit14de11b7e97efd1bc545399fcf30fa61a6a00701 réellement ancêtre ; arbre identique à la livraison publiée du lot15. #19 et son commit propre75c34d36422b9c2077c72c747c6bda8f63fe6916 restent exclus. Dossier initial propre, origin conforme ; fast-forward de develop puis nouvelle branche. Recette fonctionnelle validée par Ousmane. Publication du commit et de la PR vers develop explicitement autorisée après cette validation ; fusion et déploiement exclus.

## Nouvelle règle API

Décision explicite du22 octobre2026 : un utilisateur, **ADMIN compris**, ne peut pas signaler sa question, sa réponse ou son projet. POST /api/v1/reports répond **403 SELF_REPORT_FORBIDDEN**, avec le format d’erreur structuré existant et sans création de signalement. Le serveur lit authorId (question/réponse) ou ownerId (projet) en base ; aucun identifiant d’auteur envoyé par le client n’est utilisé. La visibilité publique de la cible est contrôlée avant la propriété : un contenu masqué/inexistant conserve404 TARGET_NOT_FOUND. Le contrôle de propriété précède le doublon ; les anciens signalements ne sont jamais supprimés. Un tiers conserve409 REPORT_ALREADY_OPEN pour un doublon ouvert.

Pour une réponse, seul son **auteur propre** compte. L’auteur de la question peut donc signaler une réponse d’un autre membre. Signaler et modérer sont distincts ; les permissions, transactions, sanctions et historiques administratifs restent inchangés. Aucun champ de contrat ni migration ajouté. Description et réponse403 ajoutées dans le contrôleur NestJS, puis pnpm api:generate ; OpenAPI et schema.d.ts générés uniquement par les outils du dépôt. Une seconde génération donne exactement les mêmes empreintes.

## Frontend et routes

ReportEntry transmet l’identifiant d’auteur réel déjà fourni par les adaptateurs, via author.reference ou owner.reference. ReportTrigger utilise l’identité réelle de SessionProvider et canReportTarget : aucune action pendant loading/unavailable, sans propriétaire connu, ou pour le propriétaire connecté. Aucun test de pseudonyme ni confiance dans la simple visibilité d’un bouton. Le visiteur identifié comme anonyme garde le dialogue de connexion existant pour le contenu d’un tiers. Le changement de session retire/recalcule les actions et les brouillons du dialogue ; les lectures personnalisées conservent leurs protections de révision et absence de cache partagé.

Tous les emplacements produit de questions, réponses (y compris acceptées) et projets réutilisent cette entrée commune. Sur /signalements?type=question|project&target=UUID, le contenu et sa propriété sont relus depuis l’API publique avant de proposer une action. Pour type=answer, le contrat ne possède pas de GET public direct d’une réponse à partir de son seul UUID : la page oriente vers l’entrée contextuelle dans la question. Aucun endpoint inventé, aucune propriété supposée. L’API refuse toujours un envoi direct interdit. Les aperçus historiques restent séparés et404 en production.

## Navigation partagée

lib/layout/navigation.ts définit Questions, Projets et Administration ; PrimaryLinks les rend dans PublicHeader, AdminShell et le menu administrateur mobile. Administration est réservée à la session réellement ADMIN et pointe toujours vers **/admin/signalements**, jamais /signalements. L’état actif couvre la section /admin et ses descendants. Le lien proche de l’identité dans AccountNavigation est supprimé ; identité/profil et déconnexion restent dans la zone du compte. Le lien Signalements de la navigation propre à l’administration est conservé.

Sur ordinateur, les trois liens sont adjacents dans la navigation principale. Sur mobile, la même définition et les mêmes permissions sont utilisées. À768–1023px, le header public administrateur peut revenir sur deux lignes pour conserver les libellés et les cibles sans débordement ; il ne crée pas une seconde navigation. États actifs soulignés et noms conservés. Menus natifs, Échap et retour au déclencheur réutilisés. L’accès serveur aux données administratives reste obligatoire.

## Commande d’animation

L’illustration existante, son asset, son orbite et ses dimensions restent conservés. Icon ajoute seulement deux tracés SVG sans dépendance : pause quand l’animation est autorisée, lecture quand l’utilisateur a demandé la pause. La commande44×44px possède aria-label et title correspondant à l’action ; aucune phrase longue visible. Le focus commun reste visible et l’icône pétrole sur surface blanche utilise les tokens approuvés.

La pause manuelle ne dépend pas du focus ; IntersectionObserver et visibilitychange continuent de suspendre hors écran et dans l’onglet masqué. prefers-reduced-motion désactive le mouvement et la commande, avec pictogramme pause et nom « Animation désactivée : mouvement réduit » ; aucune lecture ne prétend le réactiver. La vérification du changement d’onglet est simulée dans Chrome headless et reste distincte d’une manipulation d’onglet dans un navigateur interactif.

## Environnement et vérifications

Windows, Node24.15.0, pnpm10.34.6, Chrome headless installé, PostgreSQL17.11 portable existant sur127.0.0.1:55475. Deux nouvelles bases jokkodev_lot16 et jokkodev_lot16_it : nom et zéro objet contrôlés avant migrations ; catalogue/rejeu idempotents. Aucun seed destructif, réinitialisation d’une base antérieure ou changement de rôle d’un compte de l’équipe. Administrateur fictif inscrit, email local vérifié, puis provisionné avec la CLI du dépôt. Aucun email à des tiers.

| Contrôle réellement exécuté | Résultat |
| --- | --- |
| Prisma validate/generate, migrations/rejeu, catalogue/rejeu | Réussis sur bases neuves dédiées |
| Génération OpenAPI/types | Diff attendu limité à la réponse403 et sa documentation ; seconde génération sans différence |
| Lint, TypeScript | Réussis sur le code final |
| Tests backend |10 réussis, aucun échec/skip |
| Tests frontend/client/outillage |88 réussis, dont deux nouveaux tests navigation/propriété |
| Intégration PostgreSQL |88 réussis, dont trois nouveaux tests de refus et variantes de propriété |
| Builds frontend/backend | Réussis dans le snapshot isolé .cache/lot16/runtime |
| Smoke | Deux modes réussis ; neuf aperçus404. Résultats réutilisés après les derniers ajustements de styles uniquement |
| Recette HTTP réelle | Six groupes réussis ; trois types, membre/admin, zéro insertion refusée, tiers, auteur de question/réponse étrangère, doublons et cibles masquées |

Les nouveaux tests PostgreSQL vérifient aussi la conservation d’un signalement historique propre déjà présent. Aucun test existant supprimé ou protection assouplie. Les suites Node ne sont pas présentées comme des transactions réelles ; la recette HTTP et Chrome utilise le même backend réel et la base dédiée.

## Recette navigateur et captures

Neuf groupes Chrome sur backend réel réussissent, sans exception applicative enregistrée : visiteur et dialogue de connexion ; session volontairement retardée sans apparition de Signaler ; propriétaire de question/réponse/projet et réponse étrangère ; envoi réel par l’auteur de question sur la réponse étrangère ; relecture de propriété sur la route de repli ; changement d’utilisateur et doublon409 ; navigation membre sans Administration ; navigation visiteur/membre/ADMIN sur accueil, questions, projets, espace et administration ; commande d’animation au clavier, hors écran, en réduction des mouvements et aux quatre largeurs. Les quatre largeurs examinées sont1440,768,390 et320px. Une seule entrée Administration visible dans la navigation principale, destination et section active contrôlées ; les protections401/403 administratives restent effectives. L’administrateur ne voit pas Signaler sur ses propres trois types de contenu.

Captures locales dans `.cache/lot16/screenshots/` : propriétaire de question, accueil administrateur, signalements administrateur, animation active et en pause aux quatre largeurs, puis réduction des mouvements à320px. Revue effective notamment des images accueil ADMIN1440/768/390, administration1440/320, question propriétaire390, animation390/320 et réduction320 : aucun débordement relevé, accès principal adjacent sur ordinateur, menu mobile unique et distinction entre sa réponse et celle d’un tiers conservée. Les captures ne sont pas ajoutées au dépôt. La navigation latérale d’administration reste présente sur ordinateur ; le menu principal mobile ouvert se superpose au contenu selon le composant existant.

Deux incidents de pilotage sont conservés dans les journaux locaux : une expression du test navigateur contenait un sélecteur mal échappé ; sa correction a permis de reprendre la navigation sans rejouer les envois réussis. Le premier contrôle hors écran utilisait une fenêtre trop haute pour sortir entièrement l’illustration ; la reprise à1440×400 vérifie d’abord la sortie réelle de la zone visible puis sa suspension. Aucun de ces incidents n’a nécessité de contourner une protection ou de modifier le comportement produit. Le changement de visibilité du document est simulé par événement ; il ne constitue pas un test manuel de bascule d’onglet.

## Accès local pour validation

- Site : **http://127.0.0.1:33080** ; API/readiness : `http://127.0.0.1:33081/api/v1/health/ready`. Utiliser exactement cette adresse : `localhost:33080` est une autre origine, volontairement refusée par le contrôle CSRF de cette recette. Le premier lien de livraison utilisait à tort `localhost` ; cette indication est corrigée sans élargir les origines autorisées.
- Comptes fictifs : ouvrir localement `.cache/lot16/test-accounts.json`, entrées `owner`, `member`, `admin`. Ce fichier ignoré contient les accès et ne doit pas être publié, servi par HTTP ou inclus dans une capture. Les identifiants des cibles sont également disponibles dans `questions`, `answers` et `projects`.
- Question du responsable : `/questions/01a1610e-4fcd-7069-9c21-95e03655a4f0`. Avec `owner`, pas d’entrée sur la question ni sa réponse ; entrée sur la réponse de `member`. Cette dernière possède déjà un signalement ouvert : son nouvel envoi reproduit le doublon attendu.
- Projet du responsable : `/projets/01a1610e-5038-73b0-b39f-23dfc72aade0` ; mêmes variantes propriétaire/tiers.
- Scénarios d’envoi encore disponibles : `member` sur la question ADMIN `/questions/01a1610e-5013-73ff-86d6-bfab6417f9cd`, ou `owner` sur la question membre `/questions/01a1610e-5023-7688-bd79-f6475dad6ef6`.
- Administration : `/admin/signalements` avec `admin`. Les comptes ordinaires restent refusés même en accès direct. Les contenus de recette historique masqués ne doivent pas être recréés ou réinitialisés pour cette validation.

Processus créés pour ce lot et laissés disponibles : backend Node PID33652 sur33081 et frontend Node PID1028 sur33080, snapshot de production isolé. Les Chrome temporaires du pilotage sont fermés. Processus préexistants conservés : frontend lot15 PID10916 sur33070, backend lot15 PID18576 sur33071 et cluster PostgreSQL PID25156 sur55475. Au contrôle final, les deux sites et les deux readiness répondent200. Aucune autre recette arrêtée ou redémarrée.

### Incident de connexion depuis le lien de livraison

Après le signalement d’Ousmane, reproduction dans Chrome réel du lien `http://localhost:33080/connexion` : le POST de connexion répond403 `CSRF_ORIGIN_REJECTED`, avant validation des identifiants. L’environnement de recette autorise exactement `http://127.0.0.1:33080` dans APP_ORIGIN/CORS_ORIGINS ; le lien fourni dans le compte rendu était donc incorrect. Sur `http://127.0.0.1:33080/connexion`, les trois comptes `owner`, `member` et `admin` se connectent avec200 ; GET session après rechargement confirme leur identité, puis la déconnexion réussit. Résultats détaillés sans secrets dans `.cache/lot16/origin-diagnosis.json`. Seule l’adresse documentée est corrigée : aucune modification des comptes, du code ou des protections, aucun service arrêté ou redémarré. Le navigateur temporaire est fermé.

## Limites et état de livraison

Recette fonctionnelle validée par Ousmane ; publication autorisée sur la branche du lot avec PR vers develop, sans fusion. Au terme de la préparation, branche locale non publiée et index vide. Les modifications utiles restent dans le dossier de travail ; copie de patch et preuves détaillées dans `.cache/lot16/`, ignorées. La destination de signalement d’une réponse requiert son contexte de question : le repli avec son seul UUID propose une explication, sans inventer un endpoint public. Le signalement conserve ses limites de perte de réponse du lot15 : incertitude explicite, motif relisible, aucun succès supposé ni rejeu automatique.

HTTP initial200 après streaming pour certains introuvables, licences, contenus définitifs, CI distante et environnement cible restent hors validation. Linux, appareil physique, lecteur d’écran, zoom navigateur réel à200% et manipulation manuelle d’onglet ne sont pas validés dans cette recette. Le mode de recette local de production ne vaut pas validation HTTPS ou aptitude au déploiement. Teranga Points reste exclue. Aucun commit, push, PR, fusion ou déploiement effectué.

Instructions, README, décisions et guides concernés lus. Charte/procédure du skill, notes d’états et PNG01/21/32 réellement examinés ; les changements explicites de ce lot priment sur les anciennes commandes textuelles. Aucun logo inventé ni modification des assets de référence. Les limites historiques de streaming/HTML200, CI de démarrage non validée, licences, contenus définitifs et environnement de production restent ouvertes. Aucun nouveau périmètre métier ajouté : pas de suppression, photos, coordonnées privées, messagerie, points ou mécanisme public d’administration.

## Publication pour revue

Contrôles réussis réutilisés : les sources frontend/backend sont identiques au snapshot construit et testé, les types générés restent stables et seules les mentions de validation/publication de la documentation ont évolué depuis la recette. Les identifiants de comptes, emails, environnements, journaux, captures, builds et copies de patch restent exclus du commit. Aucun changement de contrat supplémentaire, test ou redémarrage de service nécessaire pour cette publication. Cette autorisation ne vaut ni fusion ni validation de production.
