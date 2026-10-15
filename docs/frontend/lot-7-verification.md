# Vérification du lot 7 — tableau de bord et candidatures

Travail et contrôles des 14–15 octobre 2026 sous Windows, Node 24.15.0, pnpm 10.34.6 et Chrome 155.0.8059.40. Branche `feature/frontend-dashboard-applications`, créée depuis `develop` à `8615a98` après vérification de la fusion du lot 6 (PR #6). Dossier initial propre, origin conservé. Rapport établi avant publication. Validation visuelle reçue ensuite et commit, push de la branche et PR vers develop explicitement autorisés par l’équipe. Aucune fusion ni fusion automatique autorisée.

## Contrôles exécutés

| Contrôle | Résultat |
| --- | --- |
| `pnpm lint` | Réussi à la racine. |
| `pnpm --filter @jokkodev/frontend typecheck` | Réussi. |
| `node --test tests/*.test.mjs` | **21 tests réussis**, dont quatre nouveaux tests candidatures. |
| `pnpm --filter @jokkodev/frontend build` | Build optimisé réussi, 29 pages statiques générées et routes dynamiques. |
| `APPLICATIONS_REVIEW_REUSE=1 node scripts/review-applications.mjs` | Revue Chrome réelle : six vues aux quatre largeurs, puis comportements/états et non-régression ciblée. Aucun appel `/api/v1` ni erreur JavaScript dans ce parcours. |
| `node scripts/check-applications-production.mjs` | Routes produit en 200 avec indisponibilité explicite, aperçu et variantes en **404**, anciens aperçus comptes/contribution/projets en 404. |
| `git diff --check` | Réussi. |
| Backend, types OpenAPI, dépendances et lockfile | Inchangés ; aucune opération métier intégrée. |

L’avertissement Node préexistant `MODULE_TYPELESS_PACKAGE_JSON` reste présent, sans échec des tests. Les premiers passages ne sont pas présentés comme réussis : une comparaison de perspective dupliquée et deux défauts de lint du script ont été corrigés avant de rejouer les contrôles. Une assertion utilisait un état « sans résultat » non défini pour le dashboard ; le script couvre désormais les états propres à chaque vue. Le serveur préexistant conservait un échec d’import CSS lu avant création du fichier ; recompilation déclenchée sans arrêter le serveur utilisateur. Des attentes de `Page.navigate` se bloquaient dans Chrome : navigation de contrôle remplacée par une affectation différée de location, avec délais bornés et profil Chrome unique. Aucun comportement produit modifié pour contourner ce blocage. La fermeture du navigateur de revue est explicite ; le script tolère un processus déjà terminé.

## Références examinées

Images réellement ouvertes avec leurs vues ordinateur et mobile :

- `JokkoDev_06_Tableau_de_bord_v1.png`, série 01 dans `D:/BUSINESS/CADEV/Maquettes/JokkoDev_6_maquettes_v1/`.
- `JokkoDev_17_Mes_candidatures_v1.png` et `JokkoDev_18_Demandes_recues_v1.png`, série 03.
- `JokkoDev_30_Projets_et_permissions_v1.png`, quatrième référence principale.
- Planches complémentaires 26, 27, 28, 29, 31 et 32 dans `JokkoDev_etats_complementaires_v1/`.
- Détail projet 12 de la série 02, pour l’adaptation du panel de candidature.

Skill, charte opérationnelle, ressources, procédure visuelle, notes des séries 01/03/05 et matrice des états lus. Aucun fichier demandé introuvable. Les notes précisent les variantes de conception ; elles ne remplacent pas le contrat API absent.

## Conditions et captures

| Fenêtre CSS | Vues principales capturées et examinées |
| --- | --- |
| 1440 × 1000 | Dashboard, candidatures envoyées, demandes reçues, formulaire sur détail, Mes questions et Mes projets réutilisés. |
| 768 × 1024 | Mêmes six vues. |
| 390 × 844 | Mêmes six vues, puis états, permissions et dialogues. |
| 320 × 800 | Mêmes six vues, contenu étroit et retours à la ligne. |

Polices locales Inter et Source Serif 4 chargées, images de marque visibles. Fenêtres émulées dans Chrome, pas d’appareils physiques. Réduction des mouvements utilisée pour comparaison ; vue avec mouvements normaux également contrôlée. Les animations communes restent discrètes, sans animation retardant les formulaires.

Corrections après examen réel : titre de candidat trop comprimé à 320 px, badge mobile étiré sur toute la ligne, accord des compteurs, point d’interrogation isolé à 768 px. La dernière correction typographique a été recapturée aux quatre largeurs. Les captures pleine page sont prises après retour en haut pour éviter les artefacts de positionnement des éléments fixes ; le dialogue est capturé dans sa fenêtre réelle.

Artefacts **locaux et ignorés par Git** dans `.cache/design-system/lot-7/` :

- `dashboard`, `sent`, `received`, `apply`, `questions`, `projects` suivis de `-{1440,768,390,320}.png`.
- `sent-filter-390.png`, `apply-validation-390.png`, `apply-{visitor,pending,member,owner,closed,administrator,expired,sending,error,success}-390.png`.
- `decision-{dialog,sending,success,error,conflict,expired}-390.png`, `received-{visitor,member,administrator,expired}-390.png`.
- États dashboard/sent/received : `loading`, `empty`, `error`, `expired` ; sans résultat pour candidatures et demandes.
- `received-long-{1440,768,390,320}.png` et `sent-long-{1440,768,390,320}.png` : textes longs injectés dans le DOM pour solliciter le wrapping, défilement vertical conservé et aucun débordement horizontal. Captures bornées à la fenêtre pour ces contenus volontairement longs.
- `navigation-focus-390.png`, `dashboard-normal-motion-390.png`, `checks.json`, `production-checks.json`. Pas de vidéo produite.
- `sent-error-filtered-390.png`, `received-error-filtered-390.png` : vérification ciblée finale de conservation des critères lors d’une nouvelle tentative.

## Comportements contrôlés

- Une navigation développeur partagée, page courante indiquée, six destinations et accès au profil existant. Filtres GET, URL et catégories de Mes projets conservés ; aucun doublon de liste personnelle.
- Message de candidature vide : résumé focalisé, erreur associée, texte long admis sans limite métier inventée ; vérification locale explicite après saisie. Pendant l’envoi injecté, champ et soumission désactivés.
- Visiteur, demande déjà envoyée, membre, propriétaire, recrutement fermé, administrateur et expiration : pas de formulaire admissible. Ces variantes ne créent aucun utilisateur ni rôle persistant.
- Décisions réservées à la perspective responsable, seulement en attente. Dialogue avec focus sûr sur Annuler, confinement Tab/Shift+Tab, Échap et restitution au déclencheur. Après disparition de la carte, focus sur le résultat annoncé.
- Pendant la décision fictive, toutes les actions sont désactivées ; verrou immédiat supplémentaire. Acceptation/refus locaux actualisent les onglets du seul aperçu. Carte traitée en lecture seule, sans ajout aux membres publics.
- Résultat erreur ou conflit : pas de succès affiché, données initiales conservées et relecture clairement locale. Expiration : disparition des messages de candidature. Un membre ordinaire ou un administrateur ne voit pas ces demandes privées fictives.
- Nouvelle tentative après erreur conservant le filtre dans l’URL ; après refus d’accès, lien vers les projets publics sans bascule automatique vers une perspective responsable.
- Chargement distinct des listes vides/erreurs, sans résultat distinct d’absence d’activité. Contenus longs, clavier, focus pétrole de 2 px et menu mobile avec Échap.
- Non-régression ciblée : `/projets/demo-associations`, `/questions/demo-session-nestjs`, `/connexion`, profil de développement et anciens aperçus Mes questions/Mes projets ; routes personnelles honnêtes. **Aucune suite exhaustive de tous les états des six lots précédents revendiquée.**

Toutes ces vérifications concernent les **interfaces et données de démonstration**. Aucun compte de test, vraie session, mutation serveur, CSRF ou transaction d’adhésion n’a pu être testé.

## Production, limites et intégration

`/dev/espace` et variantes `view=received&perspective=owner&outcome=success`, `view=sent`, `view=apply&state=success` : **404**. `/espace`, `/espace/candidatures` et `/espace/projets/demo-associations/demandes` : 200 sans candidat ni message privé ; indisponibilité explicitement expliquée. Aucun succès fictif activé sur le détail public.

Les préalables de Serge sont détaillés dans [le guide](dashboard-applications.md) : session et permissions, résumé, candidature, lectures privées, transitions/concurrence et effet transactionnel sur l’adhésion. Aucun chemin d’endpoint ni code de statut API deviné. Le constat de statut HTTP 200 après streaming pour un projet inconnu du lot 6 est conservé dans son rapport et sa référence technique ; il n’a pas été corrigé ni présenté comme 404 par ce lot.

Bannières, header visiteur, navigation mobile sur deux lignes, icônes réutilisées, profils de candidats non reliés, données harmonisées et footer provisoire restent des écarts documentés. Aucun retrait ajouté, aucune notification, messagerie ou Teranga Points. Les décisions locales ne synchronisent pas tous les aperçus et disparaissent au rechargement ; elles n’affectent aucune donnée publique.

Appareils physiques, lecteurs d’écran, Linux, autres navigateurs et zoom réel à 200 % non testés. Pas de certification d’accessibilité ou de fidélité parfaite.

## Reproduire

```powershell
pnpm dev:frontend
# Dans un autre terminal, avec Chrome installé :
$env:APPLICATIONS_REVIEW_REUSE='1'
node scripts/review-applications.mjs
```

Sans `…_REUSE`, le script démarre puis arrête son propre frontend ; le port choisi doit être libre. `APPLICATIONS_REVIEW_PORT` change le port, `CHROME_PATH` choisit un navigateur déjà installé et `APPLICATIONS_REVIEW_DEBUG_PORT` change le diagnostic (9227 par défaut). Les processus utilisateur réutilisés ne sont pas arrêtés.

```powershell
pnpm lint
pnpm --filter @jokkodev/frontend typecheck
node --test tests/*.test.mjs
pnpm --filter @jokkodev/frontend build
node scripts/check-applications-production.mjs
```

Le dernier script utilise temporairement 3100, nécessite le build existant et arrête son serveur. Aucun accès PostgreSQL requis pour ces interfaces. Le frontend préexistant reste accessible sur **http://localhost:3000/dev/espace**. Captures, caches, builds et environnements restent locaux et exclus ; publication autorisée après validation visuelle, sans fusion ni fusion automatique.
