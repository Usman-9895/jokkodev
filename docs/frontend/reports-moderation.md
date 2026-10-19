# Lot 8 — signalements et administration minimale

État historique du lot 8 : le [lot 14](moderation-integration.md) raccorde maintenant les routes produit au backend réel. Les absences de contrat et effets indépendants de cet aperçu ci-dessous ne décrivent pas le parcours intégré.

## État réel et séparation des espaces

Base `develop` à `e008dea`, après fusion confirmée du lot 7 (PR #7). Branche `feature/frontend-reports-moderation`. Aucun backend, modèle Prisma, type généré, dépendance ou licence modifié.

Le contrat `packages/api-client/src/schema.d.ts` ne propose que les routes de santé et le format d’erreur général. Les dossiers NestJS reports/moderation/auth restent réservés. **Aucune opération de signalement, lecture administrateur, décision ou authentification n’est intégrée.** Le client HTTP prévoit cookies/no-store et CSRF futur, sans rendre ces mécanismes opérationnels.

L’administration est distincte de l’espace développeur. Sa navigation ne contient que Signalements et le retour au site. Aucun tableau statistique, paramètre, gestion générale des comptes ou accès aux candidatures privées ajouté.

## Routes produit

| Route | Comportement actuel |
| --- | --- |
| `/signalements?type=question|answer|project&target=...` | Page d’indisponibilité explicite, cible publique fictive reconnue si disponible et retour vers son contenu. Aucun formulaire d’envoi public. |
| `/admin` | Administration indisponible, aucune identité ou donnée privée. |
| `/admin/signalements` | Liste indisponible, aucune donnée administrateur. |
| `/admin/signalements/[id]` | Traitement indisponible, aucun détail ou historique privé. Les paramètres ne donnent aucun droit. |

Une entrée discrète « Signaler » est présente sur chaque question, réponse et détail de projet. Ses liens transportent uniquement le type et l’identifiant du contexte, jamais le motif ou l’identité du déclarant. Le retour est construit depuis les exemples reconnus, sans destination externe libre. Les réponses possèdent maintenant une ancre `reponse-[id]`. Un contenu non reconnu n’est pas distingué artificiellement entre masqué, supprimé ou interdit.

Les routes produit restent publiques et sans données privées : leur layout ne constitue **aucun contrôle d’accès réel**. Leur activation exige la session et les autorisations serveur, y compris sur les lectures et sur chaque décision.

## Aperçus de développement

`/dev/signalements` : déclencheur ouvrant le dialogue sur un extrait public fictif. `type` et `target` sélectionnent une cible reconnue. `perspective=visitor` présente la connexion nécessaire ; défaut : développeur fictif. `state=initial|already|unavailable|expired|sending|error|success` injecte les variantes, sans prédire les restrictions ou erreurs API. Une cible indisponible ne montre plus d’extrait de contenu dans ce scénario.

La maquette 20 utilise un **motif libre**. Aucun catalogue de motifs ni champ complémentaire inventé : les catégories et limites ne sont pas publiées par le contrat. Validation locale du motif non vide, sans appliquer les 10–1 000 caractères seulement proposés dans les notes. Le formulaire et sa confirmation affichent explicitement « simulation ». Signaler ne masque rien. Annuler ferme le dialogue ; le brouillon reste en mémoire de cette page jusqu’au rechargement, sans stockage persistant ni sérialisation du texte dans une soumission native.

`/dev/moderation` : liste et détail dans la structure minimale d’administration fictive, sans compte administrateur créé. Paramètres :

- `view=detail&id=demo-report-answer` pour un détail ; défaut : liste.
- `status=all|open|closed`, `page` entier positif. Filtres sur toute la collection avant pagination ; quatre lignes par page, critères bornés et URL canonique si la page dépasse le résultat. Changer d’état ramène à la première page. Sélecteur et onglets pilotent le même critère, et le retour du détail conserve les critères.
- `role=administrator|developer|visitor|expired` : **perspectives fictives uniquement**, sans cookie ou rôle persistant. Défaut administrateur pour examiner cet aperçu ; une valeur fournie invalide refuse l’accès à la démonstration privée.
- `state=loading|empty|no-results|error|paginated|long|sending`. Le scénario paginated utilise huit exemples pour contrôler deux pages ; le défaut reproduit quatre lignes, trois ouvertes et une clôturée. Le scénario long inclut texte ressemblant à du HTML et code long, échappés par React.
- `outcome=success|error|conflict|expired|denied` : résultat local après confirmation d’une décision, sans requête métier.

Les vues refusées/expirées ne montrent ni déclarant, ni motif privé, ni contexte du signalement. Une erreur de lecture conserve les critères lors de la nouvelle tentative. Réessayer/relire signifie recharger les exemples, jamais consulter un serveur réel. Un conflit bloque les nouvelles décisions jusqu’à cette relecture fictive, sans annoncer un état serveur inventé.

**Les deux routes d’aperçu et leurs variantes renvoient 404 en production.** Aucune session, token, permission persistante, email ou sanction externe n’est créé. Les candidatures privées des projets ne sont jamais importées dans ces interfaces.

## Composants et données

- `ReportEntry` : entrée publique contextuelle avec nom accessible.
- `AdminShell` : marque existante, administration minimale, Signalements et retour au site ; navigation responsive au clavier. Aucun menu général des utilisateurs.
- `DemoReportDialog` : dialogue natif, motif associé à son erreur, résumé focalisé, annulation, attente et confirmation fictive.
- `ModerationWorkspace` : liste, filtres/pagination, détail, historique et effets locaux. Les collections sont clonées, sans mutation des questions/projets publics.
- `DemoDecisionForm` : choix explicite d’action, motif obligatoire, cible et conséquence avant confirmation. Aucune action présélectionnée. Le motif déjà saisi est repris dans la confirmation ; aucun second motif divergent.
- `LocalDialogAction`, champs, messages, badges, avatars et rendu `QuestionContent` réutilisés. Le HTML utilisateur n’est jamais injecté : texte JSX et blocs de code avec défilement horizontal propre. Les liens vers le contenu proviennent du contexte public reconnu.

`lib/reports/targets.ts` lit uniquement les contenus publics fictifs déjà disponibles. `demo.ts` contient séparément les signalements et historiques fictifs ; il est utilisé par l’aperçu, pas par les routes produit. `presentation.ts` définit des modèles de présentation locale, pas des DTO remplaçant des types générés. Les futurs adaptateurs API resteront distincts et devront déléguer filtrage/pagination au serveur selon son contrat.

## Effets indépendants et confirmations

Les maquettes et notes annoncent les trois orientations, mais ne fixent pas un contrat transactionnel. Dans l’aperçu :

| Action simulée | Effet local | Aucun effet implicite |
| --- | --- | --- |
| Clôturer sans action | Le signalement devient clôturé, en lecture seule. | Pas de masquage ni suspension. |
| Masquer | Marque ce contenu comme masqué dans l’aperçu. | Ni suppression, ni clôture, ni mutation publique. |
| Suspendre | Marque cet auteur fictif comme suspendu dans l’aperçu. | Pas de durée, réactivation, masquage global ou clôture. Aucune révocation réelle de session. |

Ce découpage est une adaptation explicite du bouton « Appliquer et clôturer » de la maquette 22 : **le frontend n’infère aucune clôture automatique**. Les transitions réelles attendent Serge. L’effet sur une solution acceptée doit lui aussi être confirmé dans la réponse serveur, sans modifier les exemples publics.

Pendant l’attente locale, champs/actions sont désactivés et un verrou immédiat bloque les doubles décisions. Une action déjà simulée n’est pas reproposée ; le formulaire repart sans action après réussite. Après erreur, le motif reste saisi. Après conflit ou perte d’accès, aucun faux succès. Les messages résultants sont annoncés et reçoivent le focus si le formulaire disparaît.

Les dialogues ont un nom accessible, un focus initial sur Annuler, confinement Tab/Shift+Tab, fermeture Échap et retour au déclencheur. Les contenus longs restent défilables et les cibles principales conservent 44 px. Animations communes discrètes, suppression des mouvements selon la préférence système.

## Contrats attendus de Serge

Sans inventer de chemin d’endpoint ou de code métier, il faut publier puis régénérer les contrats de :

1. Session courante, statut suspendu, rôle administrateur et autorisations effectives ; différences entre absence de session, refus et expiration. Aucun droit automatique sur les candidatures privées.
2. Création de signalement : une cible parmi question/réponse/projet, contenu accessible, motif libre ou catégories réellement définies, précisions éventuelles, longueurs, validation, restrictions et unicité d’un signalement ouvert par déclarant/cible.
3. État déjà signalé, traitement d’un doublon et limitation de tentative si prévue, résultat ambigu et stratégie de relecture/idempotence.
4. Liste administrateur : champs strictement nécessaires, identifiants opaques, états réels, filtres, tri, pagination globale et compteurs. Pas de coordonnées privées inutiles.
5. Détail : contexte autorisé, auteur/déclarant autorisés, statut actuel et historique réel (acteur, date UTC, action, motif). Politique de visibilité des contenus indisponibles, sans déduire une suppression d’une absence.
6. Clôture, masquage et suspension : actions permises, cible exacte, motif requis, transitions autorisées, effets atomiques et éventuelle clôture explicite. Définir le sort d’une solution acceptée masquée ; aucune durée ou restauration présumée.
7. Révocation des sessions après suspension, contrôle des droits à chaque opération, CSRF, erreurs uniformes et concurrence. Réponse lorsque la décision est déjà traitée ou les permissions changées, puis état autorisé à relire et mises à jour des listes/détails après réussite réelle.

Ces règles devront être vérifiées contre une API avec comptes dédiés ; aucune n’est annoncée opérationnelle ici.

## Écarts et limites

Bannières et libellés de démonstration, header sans identité authentifiée, pied de page minimal provisoire, arrière-plan du dialogue simplifié en extrait au lieu du détail complet. Noms, contenus, dates, motifs et historiques sont fictifs et cohérents avec les sources existantes, sans accusation réelle. Motif libre sans limites serveur, bouton « Préparer la décision », actions indépendantes et historique explicitement fictif diffèrent de la composition illustrée. Aucun texte juridique/contact définitif inventé.

Les preuves et limites des contrôles figurent dans [le rapport](lot-8-verification.md). Appareils physiques, lecteurs d’écran, Linux et zoom réel 200 % restent hors de cette revue.
