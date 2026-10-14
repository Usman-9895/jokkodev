# Vérifications du lot 5 — contributions JokkoHelp

Le 14 octobre 2026, sous Windows, Node 24.15.0, pnpm 10.34.6 et Chrome 155.0.8059.40. Branche `feature/frontend-jokkohelp-contributions`, base `develop` à `dceab34` après fusion confirmée du lot 4. Rapport établi avant publication. Après validation visuelle, l’équipe a explicitement autorisé le commit, le push de cette branche et une PR vers `develop` ; aucune fusion ni fusion automatique autorisée.

## Contrôles exécutés

| Contrôle | Résultat |
| --- | --- |
| `pnpm lint` | Réussi à la racine ; également lint ciblé frontend, tests et scripts de revue pendant les corrections. |
| `pnpm --filter @jokkodev/frontend typecheck` | Réussi : génération des types de routes Next et TypeScript strict. |
| `node --test tests/*.test.mjs` | 13 tests réussis : quatre nouveaux tests de contribution et neuf tests existants. |
| `pnpm --filter @jokkodev/frontend build` | Build optimisé réussi. |
| `CONTRIBUTIONS_REVIEW_REUSE=1 node scripts/review-contributions.mjs` | Revue réelle Chrome, assertions et captures aux quatre largeurs réussies. |
| `JOKKOHELP_REVIEW_REUSE=1 node scripts/review-jokkohelp.mjs` | Non-régression réelle de la consultation réussie : liste, recherche, filtres, pagination, détail, copie de code, retour et liens de l’accueil. |
| Dialogue et validation, contrôle ciblé supplémentaire | Tabulation contenue, focus initial sur Annuler, Échap, retour au déclencheur et captures du viewport réel examinés après correction. |
| `node scripts/check-contributions-production.mjs` | Build servi temporairement sur 3100 ; routes publiques d’indisponibilité en 200, aperçus en 404. Serveur temporaire arrêté. |
| `git diff --check` | Réussi. |
| Backend, types générés, dépendances, verrouillage | Aucun changement. Aucun endpoint métier intégré ou inventé. |

Les tests Node vérifient notamment qu’une rubrique facultative ou du code seul ne remplace pas la description, que la normalisation et le préremplissage ne modifient pas les fixtures publiques, que seul l’auteur examine modification/solutions et que les filtres personnels partitionnent toute la collection. L’avertissement Node connu `MODULE_TYPELESS_PACKAGE_JSON` reste présent lors des imports TypeScript directs ; aucun échec de test. Pas de changement du mode de modules pour masquer cet avertissement.

Un contrôle de revue a initialement utilisé un mauvais sélecteur de message ; il a été corrigé et rejoué. Le contrôle supplémentaire de Tab en fin de dialogue a révélé une sortie de focus dans Chrome : une boucle explicite a été ajoutée, puis le contrôle a été rejoué avec succès. Les dernières modifications applicatives sont une correction de focus, une espace insécable avant le point d’interrogation des titres de dialogue et le maintien des champs facultatifs communs pour modifier une question initialement sans code ; lint, types, tests et build ont été relancés. La correction typographique a également été capturée et examinée. La modification d’une question sans code initial a été contrôlée à 390 et 320 px : rubriques et code vides saisissables, détail public inchangé. Les autres interactions vérifiées sur le même code de formulaire restent inchangées.

## Références effectivement examinées

- `JokkoDev_04_Poser_question_v1.png` et `JokkoDev_03_Detail_question_v1.png` dans `D:/BUSINESS/CADEV/Maquettes/JokkoDev_6_maquettes_v1/`.
- `JokkoDev_19_Mes_questions_v1.png` dans `D:/BUSINESS/CADEV/Maquettes/JokkoDev_7_maquettes_serie_04_v1/`.
- Planches `27_Erreurs_et_acces`, `28_Validation_et_envoi`, `29_Confirmations_et_succes` et `32_Focus_et_mobile`, fichiers `JokkoDev_…_v1.png` dans `D:/BUSINESS/CADEV/Maquettes/JokkoDev_etats_complementaires_v1/`.
- Skill `jokkodev-ui-fidelity`, charte opérationnelle, ressources, procédure de comparaison, notes des séries concernées et matrice d’états disponibles localement.

Aucun de ces fichiers n’était manquant. La limite de technologies dessinée et mentionnée dans les références reste à confirmer dans le contrat backend ; elle n’est pas annoncée comme une validation métier opérationnelle. La variante modification adapte le formulaire commun.

## Conditions de revue

| Fenêtre CSS | Écrans capturés et contrôlés |
| --- | --- |
| 1440 × 1000 | Création publique indisponible, création/modification fictives, Mes questions, détail avec solutions fictives, réponse fictive. |
| 768 × 1024 | Les mêmes six vues. |
| 390 × 844 | Les mêmes six vues et états complémentaires. |
| 320 × 800 | Les mêmes six vues ; contenu long également contrôlé. |

Chrome headless dans un profil isolé, sur **localhost:3000** ; dimensions CSS émulées, pas des appareils physiques. Chargement des polices Inter et Source Serif 4 et des images visibles attendu avant capture. Chargement de JetBrains Mono confirmé dans le contrôle ciblé de code. Réduction des mouvements activée pour la comparaison ; une vue sans réduction et une vue publique sans JavaScript ont aussi été examinées. Pas de téléchargement de police distant ni de nouvelle dépendance.

Les captures ordinateur, tablette et mobile ont réellement été ouvertes et comparées : ordre des champs, titres, cartes, bloc conseil, actions, liste et variantes de réponses. Corrections des libellés trop techniques, de l’alignement des actions, de l’espace entre les liens de retour et du titre de dialogue. Aucun débordement de page détecté aux quatre largeurs, y compris avec titres, paragraphes sans espaces et code longs. Le code conserve un défilement horizontal propre à son bloc.

Les captures complètes d’états focalisés peuvent déplacer visuellement des éléments fixes lors de la capture Chrome ; des captures **du viewport réel** de validation et de dialogues ont donc été conservées. Dans la vérification ciblée, le focus de validation est bien sur le résumé et le lien d’évitement n’est pas focalisé. Ces captures rapprochées sont les preuves retenues pour les confirmations et erreurs.

## Comportements effectivement vérifiés

- Création vide : trois erreurs locales liées aux champs et résumé focalisé. Création remplie et modification préremplie : vérification locale explicitement sans publication ni enregistrement.
- Technologies : retrait, retour du focus au sélecteur et ajout. Annulation : contenu modifié identifié, dialogue, action sûre initiale, Tab/Shift+Tab contenus, Échap, focus restitué et réinitialisation.
- Envoi injecté de création/modification/réponse : champs et action désactivés ; un événement de soumission répété n’exécute pas la validation. Erreurs injectées gardant la saisie et confirmations explicitement simulées.
- Mes questions : cinq exemples, filtres résolues/non résolues (une/quatre), critères dans l’URL, liens de détail et modification ; états chargement, vide, erreur avec réessai local et session indisponible.
- Réponse : erreur sur texte vide, saisie conservée, HTML affiché comme texte, code long sans débordement, aperçu et annulation. Pas d’édition de réponse ajoutée faute de périmètre confirmé.
- Perspectives fictives : visiteur/suspendu sans réponse ; membre/administrateur sans acceptation, retrait ou modification de question ; auteur avec variantes de solution. Aucun rôle ni session persistants créés.
- Confirmation de solution : dialogue, annulation, message fictif après confirmation, aucune modification du nombre ou du statut des solutions dans les données de consultation.
- Route publique de détail : réponse désactivée et aucune action de solution. Routes personnelles/modification : aucune saisie ni donnée privée. Paramètres publics d’aperçu ignorés. Menu mobile au clavier avec Échap et focus visible de 2 px.
- Aucune erreur JavaScript ni requête `/api/v1` dans la revue de contribution. Aucun parcours métier réel vérifié : ces interfaces ne contactent pas le backend.

## Production et artefacts

Les routes `/questions/poser`, `/espace/questions`, `/questions/demo-session-nestjs` et `/questions/demo-session-nestjs/modifier` répondent 200 avec leur consultation ou indisponibilité explicite. `/dev/jokkohelp-contributions`, variantes `view=mine`, `view=detail&perspective=author`, `view=edit&state=success`, ainsi que les aperçus existants `/dev/comptes` et `/dev/jokkohelp`, répondent **404** dans le build de production.

Artefacts ignorés par Git dans **`.cache/design-system/lot-5/`** :

- `public-create`, `create`, `edit`, `mine`, `detail`, `reply` suivis de `-{1440,768,390,320}.png`.
- `create-validation-390.png` (page complète) et `create-validation-viewport-390.png` (viewport), `reply-validation-390.png`, `create-focus-390.png`.
- `create`, `edit`, `reply` suivis de `-{sending,error,success}-390.png`.
- `mine-{loading,empty,error,unavailable}-390.png` ; routes produit indisponibles `mine-unavailable-390.png` et `edit-unavailable-390.png`.
- `create-long-{1440,768,390,320}.png`, `reply-text-preview-390.png`, `solution-confirmation-390.png`.
- `edit-without-original-code-{390,320}.png` : modification avec champs facultatifs initialement absents.
- `question-cancel-dialog-390.png`, `solution-dialog-390.png` : captures rapprochées finales ; `create-normal-motion-390.png`.
- `checks.json`, `dialog-checks.json`, `production-checks.json` : assertions, navigateur, dimensions et statuts HTTP.

Rejouer depuis la racine, avec un Chrome/Chromium déjà installé :

```powershell
pnpm dev:frontend
# Dans un second terminal :
$env:CONTRIBUTIONS_REVIEW_REUSE='1'
node scripts/review-contributions.mjs
$env:JOKKOHELP_REVIEW_REUSE='1'
node scripts/review-jokkohelp.mjs
```

Les deux revues doivent être lancées successivement : elles utilisent le port de diagnostic 9223. Sans serveur actif, lancer une revue sans sa variable `…_REUSE` : elle démarre et arrête ses propres processus. `CHROME_PATH` permet de choisir un navigateur installé, `CONTRIBUTIONS_REVIEW_PORT` un port frontend différent. La revue n’arrête pas un serveur réutilisé appartenant à l’utilisateur.

```powershell
pnpm lint
pnpm --filter @jokkodev/frontend typecheck
node --test tests/*.test.mjs
pnpm --filter @jokkodev/frontend build
node scripts/check-contributions-production.mjs
```

Le dernier script nécessite 3100 libre et arrête son propre serveur. Aucune connexion PostgreSQL nécessaire à ces tests d’interface.

## Limites et livraison

**Toutes les contributions examinées sont locales ou simulées.** Pas de création/modification de question, publication/modification de réponse, acceptation/retrait, session, lecture personnelle, autorisation serveur ou CSRF vérifiés contre une API. Les erreurs serveur de contribution n’ont pas de contrat à intégrer. Les contrats attendus de Serge et les écarts de maquette sont détaillés dans [le guide](jokkohelp-contributions.md).

Bannières explicatives, contenu fictif, cinq questions au lieu des trois de la maquette, rubriques facultatives, absence du champ « Résultat obtenu » non confirmé et absence d’éditeur riche restent des différences documentées. Header visiteur maintenu, navigation personnelle mobile non simulée comme une session réelle. Signature DevTeranga et illustrations simplifiées existantes restent provisoires. Appareils physiques, lecteurs d’écran, Linux, autres navigateurs et zoom réel à 200 % non testés. Le `beforeunload` n’est pas un blocage global des navigations internes Next.js ; seules l’annulation explicite et ses confirmations ont été testées. Aucune conformité exhaustive d’accessibilité ou de sécurité annoncée.

Navigateur de revue et serveur temporaire 3100 arrêtés après les contrôles. Le frontend de développement préexistant reste actif sur **http://localhost:3000** pour la revue de l’équipe ; les serveurs existants ont été préservés. Captures et environnements locaux restent exclus du versionnement. La revue visuelle est validée ; la publication de cette branche et une PR vers `develop` sont explicitement autorisées. Les contrôles réussis sont réutilisés : aucun code applicatif modifié pour la publication, seules les mentions documentaires d’autorisation sont actualisées.
