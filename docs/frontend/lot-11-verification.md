# Vérification du lot 11 — intégration JokkoHelp

18 octobre 2026. Branche `feature/frontend-jokkohelp-integration`. Rapport des contrôles locaux avant publication. Base **381d98f430b3e9acb18fba4da9cd84b93fa7948f**.

## Préparation et préservation

Instructions AGENTS, README, décisions, guides des lots3/5/10 et guide API lus. Le skill jokkodev-ui-fidelity, sa charte, ses ressources, notes et matrice ont été consultés ; les PNG02/03/04/19 et26/27/28/29/32 ont été réellement ouverts. La présentation existante est réutilisée, pas redessinée.

`git fetch origin` a trouvé la fusion de #21 dans develop au commit de base ci-dessus ; API GitHub `merged: true`, tête d35717e ancêtre de develop. Le commit propre à #19 (75c34d36422b9c2077c72c747c6bda8f63fe6916) n’est pas ancêtre. Le dossier était propre sur feature/frontend-auth-integration. Passage sur develop, avance rapide seulement, puis nouvelle branche. Aucun changement backend, migration, schéma, dépendance ou verrouillage. L’état corrigé des contrats est réutilisé ; `pnpm api:generate` ne produit pas de diff OpenAPI/types.

Environnement : Windows, Node24.15.0, pnpm10.34.6, Chrome headless installé ; PostgreSQL17.11-alpine Docker Linux. Nouvelle base jetable **127.0.0.1:55473/jokkodev_lot11**, base d’intégration jokkodev_lot11_it, conteneur jokkodev-lot11-20261018, label jokkodev.lot=11, PGDATA tmpfs, aucun montage des données de l’équipe. Nom réel et zéro objet vérifiés avant migration. Les migrations/catalogue et leur rejeu ne visent que ces destinations. Les intégrations utilisent leurs schémas temporaires.

Les ressources du lot10 ont été inventoriées et conservées : frontend33020 PID41680, backend33021 PID20364, PostgreSQL55472. Les constructions du lot11 se font dans un snapshot de sources sous `.cache/lot11/runtime`, avec dépendances installées réutilisées ; elles n’écrasent pas le .next servi par l’ancienne recette. Frontend lot11 **33030**, backend **33031**. Seuls leurs PID vérifiés par port et enregistrement local ont été arrêtés/recréés pour smoke, build et panne. Les navigateurs temporaires sont fermés ; les serveurs et la base du lot11 restent disponibles pour la recette.

Les comptes sont exclusivement fictifs, transport email fichier local vers example.test. Aucun SMTP tiers ni base de l’équipe utilisé. Les secrets et fichiers mail restent dans le cache ignoré. Backend local HTTP en développement, cookies HttpOnly sans Secure sur cette recette ; le smoke vérifie séparément les attributs Secure de la configuration production, sans prétendre valider HTTPS complet.

## Contrôles exécutés

| Contrôle | Résultat |
| --- | --- |
| Installation | Dépendances figées installées au lot10 réutilisées ; verrou inchangé, aucune nouvelle dépendance |
| Prisma validate/generate | Réussis |
| Migrations/rejeu | Réussis sur base vide dédiée, puis aucune migration en attente |
| Catalogue/rejeu | Réussis ; catalogue réel utilisé par les formulaires/filtres |
| OpenAPI/types | Régénérés avec succès, sans différence |
| Lint / TypeScript | Réussis sur l’état final |
| Tests backend | **10 réussis** |
| Tests frontend/client/outillage | **61 réussis**, dont neuf nouveaux tests d’adaptation/validation/PATCH/session/navigation |
| Intégration PostgreSQL | **85 réussis**, aucun échec/skip ; résultat réutilisé après les seuls changements frontend ultérieurs |
| Builds | Frontend et backend réussis dans le snapshot isolé de sources |
| Smoke | Deux modes réussis : indisponible503 et base dédiée200 ; ports33030/33031, aucun email émis |
| HTTP applicatif réel | **14 groupes réussis** via AccountClient, cookies/CSRF et PostgreSQL réels |
| Chrome fonctionnel | **16 groupes réussis**, aucune exception ; mutations, rechargements et permissions réels |
| Chrome complémentaire | **8 groupes réussis**, aucune exception ; réponse tardive, longs contenus, pannes, CSRF et expiration réels |
| Revue finale | Cinq interfaces à1440/768/390/320, profil personnel320, copie native, états vide et introuvable ; captures examinées |
| Production | Neuf aperçus `/dev/*` en404, même avec paramètres de simulation |

Preuves locales ignorées : `.cache/lot11/baseline-checks.json`, `final-checks.json`, `integration-checks.json`, `build-check.json`, `smoke-checks.json`, `real-http-checks.json`, `browser-checks.json`, `browser-extra-checks.json`, `final-visual-checks.json`, journaux dans logs/. Les commandes exécutées sont consignées par les runners. Les contrôles backend85 ne sont pas annoncés comme rejoués après chaque correction CSS ; leurs fichiers/contrats sont inchangés. Les derniers contrôles frontend et builds portent sur les corrections finales. Le warning Node MODULE_TYPELESS_PACKAGE_JSON subsiste lors des imports TS directs en test, sans échec ; aucun changement de package.json pour le faire disparaître.

Les deux smoke ont été rejoués après la correction de concurrence. Leurs résultats sont réutilisés après le seul dernier ajustement de gouttière/classe de Mes questions ; build, lint, types, tests et captures ont été repris sur cet ajustement. Le snapshot final est comparé fichier par fichier aux sources frontend livrées, sans différence. Le patch complet et le manifeste sans secrets sont conservés localement dans `.cache/lot11/lot11.patch` et `final-evidence.json`, sans indexation.

## Résultats métier réellement vérifiés

- Deux comptes indépendants créés dans la base dédiée, auteur et autre membre. Création par l’adaptateur frontend puis création par le formulaire Chrome ; un seul POST malgré deux submit synchrones. L’id reçu mène au vrai détail, présent dans la liste et Mes questions.
- Modification de question préremplie, quatre rubriques et code ; valeurs confirmées côté API et après rechargement. PATCH absence/conservation, null pour effacer code/langage, refus400 des null interdits et technologies vides.
- Publication et modification de réponses du second compte, relues anonymement. Texte contenant des balises affiché sans exécution ; indentation et langage de code conservés. Copie via Clipboard API réellement confirmée.
- Acceptation, changement puis retrait de solution par l’auteur, confirmés après rechargement dans détail, réponses et filtre résolu/non résolu. Refus403 NOT_AUTHOR des modifications/décisions d’un autre membre, sans fausse déconnexion. Réponse d’une autre question refusée400 ANSWER_NOT_ELIGIBLE.
- Recherche de plusieurs mots répartis entre auteur/technologie/texte, casse et accents ; `%` et `_` littéraux, technologie inconnue donnant zéro résultat, filtres combinés, pages disjointes et total global serveur. Critères conservés liste→détail→retour, pas de second filtrage navigateur.
- Une réponse réelle à une ancienne recherche est retenue au stade réseau, puis libérée après une nouvelle recherche : elle ne remplace pas les nouveaux résultats.
- Question masquée injectée comme fixture uniquement dans la base dédiée : endpoint personnel la renvoie HIDDEN, carte explicative sans lien public/modification. Masquée et UUID inconnu reçoivent tous deux404 QUESTION_NOT_FOUND côté API et le même état visuel public.
- Panne réelle du seul backend33031 : liste en erreur sans fixtures, réessai de lecture réussi après relance ; formulaire conservé, résultat d’envoi ambigu annoncé, répétition bloquée jusqu’à vérification explicite. Aucune publication en base lors de la panne ; exactement une après la nouvelle soumission, vérifiée par SQL.
- Cookie CSRF altéré seulement dans le navigateur de test : une mutation403, acquisition d’un nouveau token sans rejeu, saisie conservée, nouvelle soumission explicite réussie. Session réellement expirée par fixture en base : liste privée démontée et consultation publique maintenue sans boutons d’auteur.
- Clavier et focus : résumé d’erreurs, champs associés, annulation, Échap, focus sûr/retour des dialogues, menu mobile ; mouvement réduit actif. Pas de débordement aux quatre largeurs, y compris titre sans espaces, texte5000 caractères et code1800 caractères limité à son propre défilement.

Les tests Node utilisent des données/transports contrôlés pour les garanties de mapping, validation et session ; ils ne sont pas confondus avec les parcours PostgreSQL. Les manipulations SQL de visibilité/expiration sont des fixtures de recette dédiées, pas une intégration frontend de modération.

### Concurrence et corrections issues de la recette

Un test supplémentaire masque une réponse entre ouverture du dialogue et confirmation. Le serveur refuse400 sans annoncer de succès ; la première interface perdait toutefois son message d’erreur lorsque la réponse disparaissait de la liste actualisée. Le retour d’erreur est maintenant conservé au niveau du détail, avec fermeture du dialogue et focus sur ce message. Le résultat du rejeu est consigné dans la preuve de concurrence finale.

Rejeu final réussi : HTTP400, message toujours visible après disparition de la réponse, aucun faux succès et focus préservé (`.cache/lot11/concurrency-final.json`). La fixture est restaurée dans un finally. Un premier rejeu du helper attendait trop avant le clic et la relecture avait déjà supprimé le bouton ; la confirmation a ensuite été déclenchée immédiatement après changement de la fixture pour atteindre réellement le refus serveur, sans modifier la protection. Des captures supplémentaires montrent une solution réellement acceptée à1440/390, relue après navigation, puis retirée (`accepted-checks.json`).

Autres défauts confirmés puis corrigés : les revalidations au focus remplaçaient les cartes par le chargement et pouvaient perdre un clic accueil→question ; la révision d’une session déjà anonyme et les résultats de même identité/critères restent désormais stables pendant l’actualisation. Le vrai clic est réussi après correction. Les titres très longs sans espaces débordaient ; repli ciblé ajouté aux titres/extraits, puis quatre largeurs recontrôlées. La double bordure de pagination et les libellés personnels trop coupés à320 ont été corrigés après examen des captures.

La dernière revue a aussi rétabli la gouttière entre navigation et contenu de Mes questions sur ordinateur et l’espace sous sa navigation mobile. Les cinq interfaces ont été recapturées après ce dernier ajustement de présentation. Le lien d’évitement atteint réellement `main#contenu` au clavier ; aucune animation CSS en cours n’est observée avec le mouvement réduit activé. La pagination peut passer sur deux lignes à320 lorsque sa fenêtre dépasse l’espace disponible, avec toutes les cibles conservées et sans débordement.

Les helpers de recette ont également nécessité des corrections : attente du catalogue avant sélection, lien desktop testé dans un viewport où il était caché, prise en compte des fixtures conservées entre essais, prédicat assert.rejects booléen et recherche `_` correspondant aussi aux pseudonymes. Un premier appel HTTP précédait la readiness du serveur et une première panne échouait dès l’acquisition CSRF avant tout POST ; les parcours complets ont été rejoués après disponibilité et avec CSRF acquis via navigation SPA. Ces essais ne sont pas comptés comme réussites produit. Les données fictives antérieures sont conservées dans la base jetable ; aucun nettoyage des données de l’équipe.

## Captures et accès de recette

Adresses de départ : http://127.0.0.1:33030/questions, `/questions/poser`, `/espace/questions`, `/connexion`. Ouvrir localement `.cache/lot11/test-accounts.json`, clés owner/second, pour les identifiants fictifs ; ne pas les recopier dans le chat/rapport. questionId, browserQuestionId, answerIds et hiddenId désignent les scénarios réels. Les mots de passe ne sont jamais dans les captures ou commandes de lancement.

Captures finales sous `.cache/lot11/screenshots/` :

- `lot11-list-1440.png`, `lot11-list-390.png` et variantes768/320.
- `lot11-detail-1440.png`, `lot11-detail-390.png` et variantes768/320.
- `lot11-create-1440.png`, `lot11-create-390.png` ; `lot11-edit-*`.
- `lot11-mine-1440.png`, `lot11-mine-390.png` et variantes768/320.
- `lot11-long-*`, `lot11-submit-outage-1440.png`, `lot11-list-outage-390.png`, `lot11-session-expired-390.png`, `lot11-empty-390.png`, `lot11-not-found-390.png`.
- `lot11-accepted-1440.png`, `lot11-accepted-390.png` : état réellement résolu avant retrait de l’acceptation.

Les captures sont hors Git et ne prétendent pas être une mesure pixel à pixel. La composition, tokens, polices et composants validés sont conservés. Adaptations contractuelles et écarts : [guide lot11](jokkohelp-integration.md).

## Limites

La consultation nécessite JavaScript et charge les données côté navigateur selon les conventions du lot10. Une ressource inconnue/masquée affiche un HTML initial **200**, puis l’état introuvable après l’API404 ; cela n’est pas un404 HTTP de page, avec ou sans streaming. Le panneau latéral sélectionne des questions par technologie, sans recommandation métier nouvelle. Les totaux personnels des onglets non chargés ne sont pas inventés.

Pas de nouveau défaut backend confirmé nécessitant une modification dans cette mission. Les autorisations serveur sont vérifiées mais ne constituent pas une validation globale de sécurité ou de conformité CADEV. Les contrôles de permissions navigateur n’accordent aucun droit par eux-mêmes.

Projets, candidatures, tableau de bord général et modération restent non raccordés ; leurs bannières/aperçus sont conservés. SMTP réel, HTTPS complet, systemd, Datacloud, licences, textes éditoriaux/confidentialité, coordonnées et assets définitifs restent ouverts. Lecteurs d’écran, appareils physiques, Safari/Firefox, zoom réel200% et exploitation frontend sur hôte Linux non validés. PostgreSQL/tests tournent réellement dans Docker Linux, ce qui ne vaut pas recette d’un déploiement Linux complet. **Application non déclarée prête à la production.** Recette fonctionnelle du lot 11 validée par Ousmane. Commit, publication de la branche et PR vers develop autorisés ; aucune fusion autorisée. Les contrôles réussis sont réutilisés après comparaison exacte des 32 fichiers au manifeste testé ; seule cette mise à jour du rapport est postérieure aux contrôles.
