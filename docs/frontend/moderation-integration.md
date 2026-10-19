# Signalements et administration minimale — intégration lot 14

Parcours produit réels, sans fixtures de repli. Sources : [contrat API](../api/frontend-integration.md), [session/CSRF](../decisions/003-sessions-csrf.md), [rapport de vérification](lot-14-verification.md), [références visuelles historiques](reports-moderation.md). Aucun backend, migration, contrat ou type généré modifié ; aucune dépendance ajoutée.

## Routes, données et permissions

| Route | Appels et accès |
| --- | --- |
| Questions/réponses/projets publics | ReportEntry ouvre ReportTrigger dans le contexte réel ; POST /reports sous session réelle |
| /signalements?type=question/answer/project&target=UUID | Repli explicite par type et identifiant, aucune lecture de fixture ; serveur vérifie la cible au POST |
| /admin et /admin/signalements | AdminGate puis GET /admin/reports, filtres et pagination serveur |
| /admin/signalements/[id] | GET /admin/reports/:id, historique inclus ; POST /admin/reports/:id/resolve |

Préfixe /api/v1. Le contexte public du dialogue utilise le titre réel ou l’auteur de la réponse et sa question, jamais un motif privé. Le lien de repli par identifiant n’invente pas de GET individuel de réponse. L’identité du déclarant et l’auteur visé par la sanction sont déterminés par le backend. Aucun email, coordonnées privées ou signalement inclus dans les pages publiques. Les extraits administrateur sont ceux du contrat (500 caractères au plus), texte React échappé, sans injection HTML ou éditeur riche.

lib/reports/api.ts dérive modèles/payloads/paramètres des types générés. Le motif libre suit 10 à 1 000 caractères et la validation du texte, sans taxonomie inventée. reason porte les erreurs locales et serveur. Le résultat doit confirmer un identifiant réel correspondant à la cible avant le message « Signalement reçu ». REPORT_ALREADY_OPEN affiche le doublon, sans revendiquer un nouvel enregistrement. Aucune déduction de déjà-signalé avant réponse serveur : il n’existe pas d’indicateur public fourni. TARGET_NOT_FOUND invalide et relit la consultation, sans conserver un ancien contenu derrière le dialogue.

AdminGate utilise SessionGate et un vrai rôle ADMIN, y compris lors d’un accès direct. Aucune requête de liste/détail n’est montée avant confirmation d’accès. Le backend protège aussi chaque opération. Un membre authentifié reçoit un refus explicite ; un visiteur se connecte. La session est relue après un refus administrateur. Les réponses privées n’utilisent pas de cache partagé et sont retirées pendant relecture, erreur ou changement d’identité. AccountClient incrémente désormais sa révision lors d’un changement d’identité ou de rôle, et rejette aussi les résultats de mutations privées d’une ancienne session. Cela ne rejoue ni n’annule une écriture déjà effectuée sur le serveur. Les messages/motifs restent en mémoire seulement et ne sont jamais placés dans le stockage navigateur ou les URL.

## Liste et décisions

URL status=all|open|closed convertie en absence de filtre/OPEN/CLOSED ; page positive et pageSize=4. Filtres et total sont appliqués par le serveur ; pages calculées depuis meta.total. Changer de filtre revient à page1. Le détail et son retour conservent les critères. Pas de faux compteurs d’onglets : le contrat ne livre pas de totaux séparés. États chargement, aucun signalement, aucun résultat, erreur avec relecture et signalement introuvable.

Aucune décision présélectionnée. Motif requis, résumé d’erreurs focalisé, puis confirmation nommant la cible, le motif et les conséquences. NO_ACTION clôture sans sanction ; HIDE_CONTENT masque la cible et retire la solution si c’est une réponse acceptée ; SUSPEND_ACCOUNT suspend l’auteur/responsable déterminé par le serveur, révoque ses sessions et ne masque pas automatiquement ses contenus. Aucun délai de suspension, suppression, restauration ou réactivation ajouté.

Le brouillon de décision est conservé dans la vue protégée du signalement pendant ses relectures et erreurs ; il est séparé par identifiant et supprimé lors de la perte de session/permission.

Une seule requête resolve applique la décision, écrit l’historique et clôture atomiquement : pas de seconde clôture. Les routes d’actions directes et d’historique global ne sont pas raccordées, le détail répond au périmètre minimal. Après succès réel, invalidation des listes, détail, historique et autres consultations montées ; les vues publiques se relisent aussi au retour/focus selon les conventions précédentes. Aucune notification temps réel interutilisateurs n’est promise.

REPORT_ALREADY_CLOSED relit le détail et montre l’état actuel sans faux succès ; CANNOT_SUSPEND_ADMIN conserve le signalement ouvert. Verrou immédiat des doubles soumissions. En cas de réponse réseau perdue/incomplète, nouvelle décision bloquée jusqu’à relecture explicite GET, sans rejeu du POST. Pour le déclarant, aucune route de lecture/idempotence n’est livrée : une réception ambiguë reste non confirmée dans le dialogue, sans bouton de renvoi sûr. Fermer ou recharger ne prouve pas la réception. Un mécanisme futur de réconciliation demanderait un contrat de Serge ; aucune route inventée.

CSRF mémoire, cookies HttpOnly, erreurs structurées et Retry-After réutilisés. Jeton CSRF invalide renouvelé sans rejeu ; nouvelle action explicite nécessaire. Une limitation affiche seulement le délai réellement fourni. Les refus métier ne sont pas assimilés à une déconnexion.

## Composants, responsive et adaptations

LiveReportList/LiveReportDetail, ResolutionForm et useAdminResource réutilisent cartes, badges, champs, erreurs, pagination et invalidation existants. AdminShell conserve uniquement Signalements et retour au site ; menu mobile natif AdminAccountMenu avec Échap/retour au déclencheur, et accès aux comptes réels. Le lien Administration du header public n’est montré qu’à ADMIN, sans constituer une autorisation serveur.

ReportTrigger utilise un dialogue natif nommé, fermeture et retour au déclencheur, confinement Tab/Maj-Tab. Les confirmations utilisent LocalDialogAction (focus initial Annuler, Échap, boucle clavier). Après décision/erreur, le résultat reçoit le focus même lorsque le formulaire devient lecture seule. Composition tableau sur ordinateur, cartes sur mobile, textes non sécables contenus, réduction des mouvements commune. L’extrait est du texte brut, pas un rendu complet du contenu absent du contrat.

Écarts documentés : absence des compteurs dessinés sur les onglets, menu mobile adapté à la session réelle, textes d’effets plus explicites, pseudonymes/dates de recette réels, icônes et footer minimal historiques. Le dialogue est désormais sur le vrai détail public. La route de repli identifie le type et l’UUID sans inventer de titre lorsqu’aucune lecture contractuelle ne le fournit. Pour une réponse, le contrat admin donne sa visibilité propre mais pas celle de sa question parente : le lien associé peut répondre404 si la question a été masquée ; aucune distinction publique inventée.

Les /dev/moderation et /dev/signalements restent des démonstrations isolées en404 en production. Les entrées des contenus fictifs renvoient uniquement aux aperçus, pas aux mutations réelles. Aucun rôle persistant fictif ni sélecteur de rôle produit. Teranga Points exclue. Voir le rapport pour les contrôles réels et les limites avant production.

## Complément de recette globale (lot 15)

Voir le [rapport de livraison](../release/readiness.md). Après perte de la réponse à un signalement, le motif est désormais affiché en lecture seule, copiable dans cet écran. Cela ne confirme pas la réception, ne persiste pas la saisie et ne réactive aucun formulaire d’envoi.
