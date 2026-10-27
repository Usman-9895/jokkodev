# Décision 007 — politique de conservation des données

Politique validée explicitement par Ousmane le **26 octobre 2026**, dans le chat de préparation du déploiement. Responsables publiés : Ousmane Mbacké Dieng & Serge Senghor, pour l’équipe DevTeranga — Sénégal. Contact : contact@jokkodev.com.

**Statut : décision adoptée ; application technique et procédures à préparer.** L’accord porte sur les durées proposées, pas sur une exécution immédiate de suppressions en production. Cette décision ne vaut pas attestation de conformité juridique. Elle remplace la mention de durées « non décidées » dans le guide des pages publiques ; l’absence actuelle de purge reste décrite honnêtement dans la notice.

## Politique retenue

| Catégorie | Départ du délai et durée | Traitement retenu |
|---|---|---|
| Compte non vérifié | 30 jours après inscription | Suppression si l’email n’a jamais été vérifié ; vérifier les contributions et dépendances avant de concevoir l’opération. |
| Compte actif et profil | Pendant l’utilisation du compte | Modification du profil et traitement des demandes de clôture. |
| Compte inactif | 24 mois sans connexion, préavis de 30 jours avant échéance | Prévenir, puis clôturer et supprimer ou anonymiser les données personnelles ; toute reconnexion annule le processus d’inactivité engagé. |
| Contributions publiques | Tant qu’elles sont publiées et utiles | Réexamen à la suppression d’une publication ou à la clôture du compte ; préserver les droits des autres contributeurs. |
| Question ou projet supprimé | Retrait public immédiat ; traitement sous 30 jours | Effacer ou anonymiser ce qui n’est plus nécessaire, sans casser les réponses, participations, décisions ni calculs de réputation. |
| Message de candidature | 6 mois après acceptation, refus ou retrait | Supprimer le message privé ; conserver l’adhésion tant que la personne est membre. Aucune échéance n’a été décidée pour une candidature encore en attente. |
| Signalement clôturé et décision | 12 mois après clôture | Supprimer ou anonymiser les éléments devenus inutiles ; réexaminer séparément les sanctions encore actives. |
| Email de contact | 6 mois après clôture de la demande | Supprimer les échanges et pièces jointes devenus inutiles. |
| Journaux techniques ordinaires | 30 jours après l’événement | Rotation et suppression. |
| Enregistrement de session | 30 jours après expiration effective ou révocation | Suppression en base. La validité fonctionnelle reste de 7 jours maximum / 24 h d’inactivité. |
| Enregistrement de lien de compte | 7 jours après utilisation ou expiration | Suppression en base. La validité reste de 24 h pour vérification / 30 min pour réinitialisation. |
| Sauvegarde locale | Environ 7 jours après création | Rotation déjà configurée, déclenchée après une sauvegarde réussie ; `find -mtime +7` ne constitue pas une garantie d’effacement à exactement 168 h. |
| Copie hors serveur | 30 jours maximum après création de la sauvegarde | Renouveler et supprimer les anciennes copies, y compris sur Windows. Ne pas changer artificiellement la date de départ à chaque copie du même fichier. |
| Journal Teranga Points | Pendant la vie du compte | Préserver le calcul du score et préparer une anonymisation cohérente à la clôture, sans fausser les scores des autres membres. |

Une conservation exceptionnelle doit être justifiée par un incident ou une contestation, limitée aux données nécessaires, avec responsable et date de réexamen. Ne pas ajouter une exception générale et illimitée. La clé de chiffrement doit rester disponible tant qu’une sauvegarde conservée en dépend ; ce n’est pas une donnée à supprimer à la même échéance que chaque copie.

## État réel au moment de l’accord

- Expiration fonctionnelle des sessions et liens implémentée ; aucune purge générale de leurs enregistrements.
- Suppression logique des questions/projets et compensations Teranga Points implémentées ; aucun effacement général des contenus après 30 jours.
- Sauvegardes locales chiffrées quotidiennes, rétention environ 7 jours, restauration PostgreSQL dédiée et copies initiales sur Windows vérifiées dans la recette d’Ousmane.
- Copie hors serveur encore manuelle. Pas de règle de suppression des copies Windows mise en place par cette décision.
- Autres durées retenues non appliquées automatiquement. Les emails reçus chez LWS et journaux du VPS demandent des procédures d’exploitation distinctes du backend.

## Plan de mise en œuvre à coordonner avec Serge

1. **Inventaire et simulation seule.** Par catégorie : compter les éléments concernés sans afficher de contenu privé. Pas de tâche de suppression activée par défaut. Vérifier serveur, base et environnement de destination avant toute opération.
2. **Définir les horodatages fiables.** Le schéma actuel ne permet pas de déduire à lui seul 24 mois depuis la dernière connexion après purge des sessions. Prévoir une date de dernière connexion et une date de préavis, avec traitement explicite des comptes existants. Ne pas assimiler toute visite ou toute modification du profil à une nouvelle connexion.
3. **Purger les éléments techniques expirés.** Distinguer date d’expiration absolue, fin par inactivité, révocation et consommation ; arrêter les traitements concurrents si leur atomicité n’est pas garantie. Tests aux bornes exactes, en UTC, et réexécution idempotente.
4. **Nettoyer les messages et historiques.** Le texte d’une candidature est actuellement obligatoire : prévoir une représentation d’un message effacé sans casser les écrans ni conserver son contenu dans un autre champ. Coordonner schéma, contrat Nest/OpenAPI, client et affichage. Préserver adhésions et références nécessaires aux décisions.
5. **Préparer la clôture et l’anonymisation.** Examiner les contraintes `Restrict`, les auteurs, propriétaires de projets, candidatures, signalements et références de réputation. Ne pas lancer un `DELETE User` en cascade ni supprimer les événements du journal append-only. Une substitution de pseudonyme ou le maintien d’un identifiant stable ne prouvent pas, seuls, une anonymisation irréversible ; traiter aussi les textes et liens identifiants, ou nommer honnêtement la pseudonymisation.
6. **Gérer préavis et demandes.** Une seule notification d’inactivité, annulation en cas de reconnexion, contrôle final avant clôture et procédure pour les projets avec collaborateurs. Définir le traitement manuel des demandes, sans promettre une fonctionnalité inexistante de suppression automatique de compte.
7. **Exploitation hors base.** Vérifier rotation nginx/systemd, traitement LWS des demandes closes, copies Windows et destination externe future. Conserver les dates, propriétaires et preuves d’exécution sans corps de message ni secret. Prévoir comment éviter de réintroduire des données effacées après restauration d’une ancienne sauvegarde.
8. **Vérifier puis publier.** Tests sur une base dédiée et des fichiers jetables, contrôle de restauration, revue de Serge et Ousmane, PR séparée des changements frontend si modification transverse. Activation du nettoyage en production seulement après revue du périmètre, de la simulation et de la procédure de retour arrière. Aucun test destructif sur la base de production.

## Critères de recette

- Date de référence UTC fixable pour tests ; mois/années définis comme délais calendaires, sans approximation silencieuse par un nombre arbitraire de jours.
- Simulation sans mutation ni email ; exécution bornée, idempotente et résistante aux transitions concurrentes (vérification d’email, reconnexion, décision de candidature, modération).
- Enregistrements avant échéance inchangés ; sessions valides et jetons utilisables jamais supprimés par erreur.
- Compte de test après préavis puis reconnecté préservé ; absence de doublons de notification.
- Messages échus non consultables après nettoyage ; adhésions et score des tiers corrects ; procédures de clôture/effacement testées avec toutes les dépendances.
- Exceptions justifiées et datées, sans conservation infinie implicite ; journaux d’exécution limités aux catégories, compteurs et résultats nécessaires.
- Documentation publique mise à jour selon les traitements réellement activés. Ne pas annoncer toutes les durées comme effectives tant que seules des règles frontend ou cette décision ont changé.

Source de principe consultée : [CDP Sénégal — obligations de conservation et d’information](https://www.cdp.sn/obligations-entreprises). Les nombres ci-dessus sont une décision de l’équipe, pas des délais légaux génériques attestés.
