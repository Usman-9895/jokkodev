# Vérification du lot 8 — signalements et administration minimale

Le 15 octobre 2026 sous Windows, Node 24.15.0, pnpm 10.34.6 et Chrome 155.0.8059.40. Branche `feature/frontend-reports-moderation`, créée depuis `develop` à `e008dea` après vérification de la fusion du lot 7 (PR #7). Dossier initial propre, origin conservé. Rapport établi avant publication. Validation visuelle reçue ensuite et commit, push de feature/frontend-reports-moderation et PR vers develop explicitement autorisés par l’équipe. Aucune fusion ni fusion automatique autorisée.

## Contrôles exécutés

| Contrôle | Résultat |
| --- | --- |
| `pnpm lint` | Réussi à la racine. |
| `pnpm --filter @jokkodev/frontend typecheck` | Réussi, TypeScript strict et routes App Router. |
| `node --test tests/*.test.mjs` | **26 tests réussis**, dont cinq nouveaux tests signalements/modération. |
| `pnpm --filter @jokkodev/frontend build` | Réussi, 33 pages statiques générées et routes dynamiques. |
| `REPORTS_REVIEW_REUSE=1 node scripts/review-reports.mjs` | Revue Chrome réelle réussie aux quatre largeurs ; états, permissions, décisions, contenu sûr, clavier et non-régression ciblée. Aucune erreur JavaScript ni requête `/api/v1` relevée. |
| `node scripts/check-reports-production.mjs` | Routes produit en 200 avec indisponibilité explicite ; deux aperçus et variantes en **404** ; aperçu du lot 7 en 404. Aucun motif privé ou historique fictif dans ces réponses. |
| `git diff --check` | Réussi. |
| Backend, types générés, dépendances et verrouillage | Inchangés. Aucun endpoint métier intégré ou inventé. |

Les tests Node couvrent critères/pagination sur toute la collection, encodage des cibles et retour, validation locale sans limites inventées, restrictions de présentation et indépendance des effets. L’avertissement connu `MODULE_TYPELESS_PACKAGE_JSON` reste présent, sans échec.

Le premier démarrage de revue a rencontré un import CSS conservé en erreur par le serveur préexistant, lu avant création du fichier ; recompilation déclenchée sans arrêter ce serveur. Un script local de préparation de données longues a eu une erreur d’échappement, corrigée avant exécution ; cet essai n’est pas compté comme réussi. Les scripts versionnés et contrôles finaux passent.

## Références réellement examinées

- Images 20 Signaler contenu, 21 Admin signalements et 22 Admin décision, vues ordinateur et mobile, dans `D:/BUSINESS/CADEV/Maquettes/JokkoDev_7_maquettes_serie_04_v1/`.
- Planches 26 Chargement/vide, 27 Erreurs/accès, 28 Validation/envoi, 29 Confirmations/succès, 31 Comptes/expiration et 32 Focus/mobile, dans `JokkoDev_etats_complementaires_v1/`.
- Skill `jokkodev-ui-fidelity`, charte opérationnelle, ressources, procédure visuelle, notes série 04 et notes/matrice des états complémentaires.

Aucune référence demandée introuvable. Les maquettes fixent la composition et les variantes de conception ; aucun contrat de session ou de sanction n’en est déduit. `AppModule` importe seulement `HealthModule`, les domaines reports/moderation sont réservés et le contrat généré ne fournit que la santé.

## Conditions de revue et captures

| Fenêtre CSS | Interfaces |
| --- | --- |
| 1440 × 1000 | Dialogue de signalement, liste administrateur et détail/décision. |
| 768 × 1024 | Les mêmes trois interfaces, listes adaptées à l’espace disponible. |
| 390 × 844 | Les mêmes trois interfaces, puis états et confirmations. |
| 320 × 800 | Les mêmes trois interfaces, texte étroit, boutons et dialogues défilables. |

Captures après chargement des polices locales et images visibles, avec mouvements réduits pour comparaison. Fenêtres émulées, pas d’appareils physiques. Une ouverture du dialogue avec mouvements normaux a aussi été contrôlée. Les captures modales couvrent la fenêtre réelle ; les pages sont capturées entièrement après retour en haut. Les captures de code/contenu long cadrent les zones concernées, avec défilement vertical normal.

Captures principales réellement ouvertes et comparées pour les trois vues et quatre largeurs. Ajustements après observation : style principal de l’action de décision, lien du contenu mieux identifiable, espacement de l’état de conflit, effacement des erreurs devenues obsolètes pendant la correction, maintien des filtres dans les états complémentaires et compteurs à zéro dans l’état vide. Les modifications ont été recontrôlées. Les proportions sont estimées depuis les PNG, pas extraites de sources Figma.

Les artefacts restent **locaux et ignorés par Git** dans `.cache/design-system/lot-8/` :

- `report`, `list`, `detail` suivis de `-{1440,768,390,320}.png`.
- `report-validation-390.png`, `report-confirmation-390.png`, `report-{already,unavailable,expired,sending,error,success,visitor,answer,project}-390.png`.
- `list-page2-390.png`, `list-{loading,empty,no-results,error}-390.png`.
- `decision-validation-390.png`, `decision-dialog-390.png`, `decision-hidden-open-390.png`, `decision-suspended-open-390.png`, `decision-closed-390.png`.
- `decision-{error,conflict,expired,denied}-390.png`, `admin-{developer,visitor,expired,invalide}-390.png`, `detail-not-found-390.png`, `detail-closed-history-390.png`.
- `detail-long-{1440,768,390,320}.png`, `detail-code-{1440,768,390,320}.png` : contenu texte et code réels du scénario React de démonstration, pas HTML injecté.
- `public-question` et `public-project` suivis de `-{1440,768,390,320}.png`, `public-unavailable-390.png`, `report-normal-motion-390.png`.
- `checks.json`, `production-checks.json` : assertions et résultats réels. Pas de vidéo produite.

## Comportements vérifiés

- Motif de signalement vide : erreur associée, résumé focalisé. Collage/saisie natifs, conservation après erreur simulée, champ désactivé pendant envoi et soumission répétée bloquée. Confirmation explicitement simulée, contenu inchangé.
- Dialogue nommé : focus initial sur Annuler, Tab/Shift+Tab contenus, fermeture Échap et retour au déclencheur. Cibles question, réponse et projet ; variantes visiteur, déjà signalé, indisponible, expiration, attente, erreur et confirmation.
- Filtres ouverts/clôturés, remise à la première page, pagination réelle sur huit exemples, retour du détail conservant page/filtre et page excessive ramenée dans l’URL. Les flèches sans page suivante/précédente sont désactivées. Un seul critère pilote les deux contrôles d’état.
- Chargement, vide et absence de résultat distincts de l’erreur. Filtres visibles pendant la lecture simulée/erreur et sélection conservée. Aucun compteur inconnu annoncé pendant ces états ; zéro dans l’état vide.
- Choix de décision et motif obligatoires avant confirmation. Motif et cible repris dans la confirmation, sans second champ divergent. Annuler ne déclenche pas de décision.
- Attente désactivant les champs/actions et verrou immédiat supplémentaire. Masquer laisse le signalement ouvert ; suspendre ne masque pas et laisse ouvert ; clôturer ne masque ni suspend. Historique et compteurs du seul aperçu actualisés, clôture en lecture seule. Aucun effet sur les contenus publics.
- Erreur conservant la saisie, conflit bloquant les nouvelles décisions jusqu’à relecture locale. Refus/expiration retirant les détails privés fictifs, sans annoncer de succès. Rôle développeur, visiteur, expiré ou valeur inconnue sans détails de signalement.
- Texte ressemblant à `<img ... onerror=...>` affiché littéralement par React : aucune image injectée dans le contexte et aucun marqueur d’exécution. Code long défilant dans son propre bloc, aucune largeur de page excessive aux quatre tailles.
- Entrées publiques Signaler sur question et chaque réponse, ancre de réponse cohérente, lien projet ; page produit sans formulaire et sans faux envoi. Questions et projets publics vérifiés aux quatre largeurs après ajout des entrées.
- Menu mobile public avec Échap, focus visible pétrole de 2 px, navigation clavier et réduction des mouvements.
- Non-régression ciblée de la consultation questions/projets, connexion, dashboard du lot 7 et ancien aperçu Mes questions. Pas de suite exhaustive de tous les états des sept lots précédents revendiquée.

**Tous les contrôles de signalements, permissions et sanctions portent sur des démonstrations. Aucun parcours de modération contre une API réelle n’a été testé.** Aucune vraie session, révocation, protection CSRF, transaction ou émission d’email vérifiée.

## Production et limites

`/dev/moderation`, variante détail avec `role=administrator&outcome=success`, pagination, `/dev/signalements`, variantes succès et réponse : **404**. `/dev/espace` du lot précédent : 404.

`/admin`, `/admin/signalements`, `/admin/signalements/demo-report-answer?role=administrator` et `/signalements` pour les trois types : **200 avec indisponibilité explicite**, sans identité du déclarant, motif de signalement privé ou historique. Ce sont des pages d’attente publiques, pas une administration authentifiée ou un refus serveur simulé.

Les écarts sont détaillés dans [le guide](reports-moderation.md) : bannières, extrait d’arrière-plan simplifié, header sans session, footer provisoire, motif libre sans règle de longueur API et actions indépendantes remplaçant « Appliquer et clôturer ». Le badge Ouvert est harmonisé en attention ; les PNG 21/22 ne montrent pas la même teinte. Les contraintes réelles, catégories, transitions, éventuelle clôture atomique et effet sur les solutions acceptées attendent Serge. Les historiques/compteurs simulés sont réinitialisés au rechargement.

Appareils physiques, lecteurs d’écran, Linux, autres navigateurs et zoom réel à 200 % non testés. Aucun audit complet de sécurité/accessibilité, fidélité parfaite ou modération fonctionnelle revendiqué.

## Reproduire

```powershell
pnpm dev:frontend
# Second terminal, Chrome déjà installé :
$env:REPORTS_REVIEW_REUSE='1'
node scripts/review-reports.mjs
```

Sans `…_REUSE`, le script démarre puis arrête son propre frontend ; le port doit être libre. Variables : `REPORTS_REVIEW_PORT`, `REPORTS_REVIEW_DEBUG_PORT` (9228 par défaut) et `CHROME_PATH`. Profil Chrome isolé par processus, fermé après revue. Les serveurs utilisateur réutilisés ne sont pas arrêtés.

```powershell
pnpm lint
pnpm --filter @jokkodev/frontend typecheck
node --test tests/*.test.mjs
pnpm --filter @jokkodev/frontend build
node scripts/check-reports-production.mjs
```

Le contrôle de production sert le build sur 3100 puis arrête son processus temporaire. Aucun accès PostgreSQL requis. Le frontend préexistant reste disponible sur **http://localhost:3000/dev/signalements** et **http://localhost:3000/dev/moderation**. Environnements, caches, builds et captures restent exclus ; publication autorisée après validation visuelle, sans fusion ni fusion automatique.
