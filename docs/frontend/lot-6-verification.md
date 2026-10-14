# Vérifications du lot 6 — JokkoProjects

Le 14 octobre 2026, sous Windows, Node 24.15.0, pnpm 10.34.6 et Chrome 155.0.8059.40. Branche `feature/frontend-jokkoprojects`, base `develop` à `9e63322` après fusion confirmée du lot 5 (PR #5). Rapport établi avant publication ; validation visuelle et autorisation explicite du commit, du push et de la PR reçues ensuite. Aucune fusion ni fusion automatique autorisée.

## Contrôles exécutés

| Contrôle | Résultat |
| --- | --- |
| `pnpm lint` | Réussi à la racine sur le code et les scripts. |
| `pnpm --filter @jokkodev/frontend typecheck` | Réussi, routes Next et TypeScript strict. |
| `node --test tests/*.test.mjs` | 17 tests réussis : quatre nouveaux tests projets et treize tests existants. |
| `pnpm --filter @jokkodev/frontend build` | Build optimisé réussi. |
| `PROJECTS_REVIEW_REUSE=1 node scripts/review-projects.mjs` | Revue Chrome réelle, assertions et captures aux quatre largeurs. |
| `JOKKOHELP_REVIEW_REUSE=1 node scripts/review-jokkohelp.mjs` | Non-régression réelle de la consultation, recherche, pagination, détail, code, retour et lien accueil, dont la carte commune extraite. |
| Contrôles navigateur ciblés des autres lots | Connexion et visibilité du mot de passe, profil fictif et validation de contribution JokkoHelp ; aucune suite exhaustive sur tous les anciens états. |
| `node scripts/check-projects-production.mjs` | Routes publiques en 200 ; aperçus projets et variantes en 404 ; aperçus comptes/contribution précédents en 404. Serveur temporaire arrêté. |
| `git diff --check` | Réussi. |
| Backend, API générée, dépendances, verrouillage | Aucun changement. Aucun endpoint métier intégré ou inventé. |

L’avertissement Node connu `MODULE_TYPELESS_PACKAGE_JSON` apparaît lors des imports TypeScript directs, sans échec final. L’import du normaliseur de recherche a d’abord échoué dans Node faute d’extension explicite ; l’import `.ts` et l’option frontend `allowImportingTsExtensions` compatible avec `noEmit` corrigent ce point. Build et typage ont été exécutés avec cette configuration. Aucun mode expérimental ou paquet supplémentaire requis.

La revue a repéré un débordement de fil d’Ariane sur une longue chaîne sans espaces : largeur minimale et coupure des mots corrigées, puis contrôle rejoué aux quatre largeurs. Un sélecteur de test mal échappé et une attente de navigation trop courte ont été corrigés ; les transitions sont désormais attendues selon le DOM/URL avec une borne temporelle. L’assertion de profil du contrôle ciblé a été alignée sur son pseudonyme fictif existant `awa_demo`, sans modification de cet ancien écran. Ces premiers essais ne sont pas présentés comme réussis. Lint, types et build ont été relancés après les corrections visibles et la prévention de sérialisation du titre du brouillon dans une soumission native.

## Références réellement ouvertes

- `JokkoDev_11_Liste_projets_v1.png`, `JokkoDev_12_Detail_projet_v1.png` : `D:/BUSINESS/CADEV/Maquettes/JokkoDev_6_maquettes_serie_02_v1/`.
- `JokkoDev_15_Formulaire_projet_v1.png`, `JokkoDev_16_Mes_projets_v1.png` : `D:/BUSINESS/CADEV/Maquettes/JokkoDev_6_maquettes_serie_03_v1/`.
- `JokkoDev_26_Chargement_et_vide_v1.png`, `27_Erreurs_et_acces`, `28_Validation_et_envoi`, `30_Projets_et_permissions`, `32_Focus_et_mobile`, fichiers `JokkoDev_…_v1.png` : `D:/BUSINESS/CADEV/Maquettes/JokkoDev_etats_complementaires_v1/`.
- Skill `jokkodev-ui-fidelity`, charte opérationnelle, ressources, procédure de vérification visuelle, notes des séries 02/03/05 et matrice d’états.

Aucune référence demandée introuvable. Les PNG définissent la composition ; les contrats examinés ne définissent encore aucune opération de projet. Les limites proposées dans les notes ne sont pas annoncées comme des contraintes backend opérationnelles.

## Conditions de revue visuelle

| Fenêtre CSS | Écrans |
| --- | --- |
| 1440 × 1000 | Liste publique, détail public, création et modification fictives, Mes projets fictifs. |
| 768 × 1024 | Les mêmes cinq vues. |
| 390 × 844 | Les mêmes cinq vues, filtres et états complémentaires. |
| 320 × 800 | Les mêmes cinq vues, détails absents/introuvables et responsive étroit. |

Profil Chrome isolé sur **localhost:3000**, images visibles et polices Inter/Source Serif 4 chargées avant capture. Les fenêtres sont des dimensions CSS émulées, pas des appareils physiques. Réduction des mouvements activée pour la comparaison ; une vue avec mouvements normaux et une consultation sans JavaScript ont également été contrôlées. Aucune police distante, aucune nouvelle dépendance.

Captures réellement ouvertes et comparées aux références : colonnes et ordre des sections, titres, formulaire, badges, cartes, catégories personnelles, panel de candidature désactivé et dialogues. Retours à la ligne du hero mobile ajustés, titres des cartes mobiles élargis et badges déplacés sous le titre pour éviter une colonne de texte trop étroite. Icônes cible/horloge/livre ajoutées au composant SVG existant. Objectifs, titres et compétences sans espaces contrôlés aux quatre largeurs sans débordement de page. Espacement du message d’erreur corrigé ; compteurs personnels à zéro dans l’état vide et retirés des états où la lecture est indisponible. Les champs texte natifs restent défilables et redimensionnables ; aucun contenu long tronqué par une hauteur de carte figée.

## Comportements vérifiés

- Recherche globale et combinaison compétence/recrutement, remise à zéro de la page, réinitialisation des filtres, pagination, page trop grande et paramètres invalides.
- Accès direct au détail, retour conservant l’URL filtrée, projets fermés encore consultables et rendu introuvable pour un identifiant inconnu.
- Liste initialement vide distincte d’une recherche sans résultat, chargement et erreur injectés en développement ; filtres conservés et nouvelle tentative locale gardant le critère.
- Création/modification préremplies, validation locale de trois champs, aides/erreurs associées, résumé focalisé, retrait/ajout d’une compétence avec retour du focus et radio de recrutement native.
- Annulation d’un brouillon modifié : focus initial sur Annuler, Tab/Shift+Tab contenus, Échap, focus restitué et valeurs initiales restaurées. Envoi injecté : champs/action désactivés et événement répété de soumission sans seconde validation.
- Mes projets : trois exemples, deux créés et un rejoint ; catégories dans l’URL, modification seulement pour une carte créée en perspective responsable. Membre et administrateur sans modification automatique ; visiteur/suspendu sans données personnelles affichées.
- États de gestion vide/chargement/erreur/session indisponible, détail avec membres/disponibilité/compétences absents, variante indisponible exclusivement injectée.
- Routes publiques de création/modification et Mes projets : aucun champ privé ou formulaire fonctionnel. Paramètres publics `state=success&perspective=owner` sans effet sur les permissions ; aucune candidature envoyable.
- Menu mobile avec Échap, labels permanents, focus clavier pétrole de 2 px, liens de l’accueil vers `/projets`, absence d’erreur JavaScript ou requête `/api/v1` dans la revue des projets.
- Consultation filtrée sans JavaScript ; brouillon de formulaire sans sérialisation du titre, objectif ou disponibilité via `FormData` natif. Les radio de recrutement n’exposent que le choix fictif, aucun contenu personnel.

**Toutes ces vérifications concernent des données et états de démonstration, jamais une API de projets réelle.** Le code de modification/réponse des anciens lots n’a pas été transformé en opération serveur par cette extension.

## Résultat HTTP de production

Les routes `/projets`, `/projets/demo-associations`, `/projets/proposer`, `/projets/demo-associations/modifier` et `/espace/projets` répondent 200 avec leur consultation fictive ou indisponibilité explicite.

`/dev/jokkoprojects`, variantes `view=mine`, `view=edit&state=success&perspective=owner`, `view=detail&state=unavailable`, ainsi que `/dev/jokkohelp-contributions` et `/dev/comptes` répondent **404**. Aucune présentation de liste personnelle dans ces réponses de production.

**Limite constatée : `/projets/inconnu` affiche « Ce projet est introuvable », mais son statut HTTP observé est 200 dans le rendu streamé.** Next.js conserve le statut après le début du flux, malgré l’appel à `notFound()` ; le framework prévoit un rendu introuvable et une directive noindex dans ce cas. Ce comportement est décrit dans la [documentation officielle Next.js](https://nextjs.org/docs/app/api-reference/file-conventions/not-found). Aucun vrai 404 HTTP n’est donc revendiqué pour cette URL publique dans cette vérification. Le statut de l’adaptateur API et la stratégie de réponse avant streaming seront à examiner lors de l’intégration ; aucun mécanisme expérimental ajouté pour contourner ce point.

## Artefacts et commandes

Tout reste dans **`.cache/design-system/lot-6/`**, ignoré par Git :

- `list`, `detail`, `create`, `edit`, `mine` suivis de `-{1440,768,390,320}.png`.
- `list-filtered-390.png`, `list-no-results-390.png`, `list-{loading,empty,error}-390.png`, `search-focus-390.png`.
- `detail-closed-390.png`, `detail-not-found-390.png`, `detail-{missing,not-found,unavailable}-320.png`, `detail-long-{1440,768,390,320}.png`.
- `form-validation-390.png`, `form-focus-390.png`, `form-cancel-dialog-390.png`, `form-long-{1440,768,390,320}.png`.
- `create` et `edit` suivis de `-{sending,error,success}-390.png` ; `mine-{loading,empty,error,unavailable}-390.png`.
- Routes publiques d’attente : `create-unavailable-390.png`, `edit-unavailable-390.png`, `mine-unavailable-390.png` ; `list-normal-motion-390.png`.
- `checks.json`, `production-checks.json` : navigateur, dimensions, assertions et statuts réels.

Depuis la racine, avec un Chrome/Chromium installé :

```powershell
pnpm dev:frontend
# Dans un second terminal, successivement :
$env:PROJECTS_REVIEW_REUSE='1'
node scripts/review-projects.mjs
$env:JOKKOHELP_REVIEW_REUSE='1'
node scripts/review-jokkohelp.mjs
```

Sans serveur actif, lancer la revue sans `…_REUSE` pour qu’elle démarre puis arrête ses propres processus. `PROJECTS_REVIEW_PORT` choisit le port frontend ; `CHROME_PATH` permet un navigateur installé. Port de diagnostic 9223 réservé à une revue à la fois. Le script ne stoppe pas les serveurs réutilisés appartenant à l’utilisateur.

```powershell
pnpm lint
pnpm --filter @jokkodev/frontend typecheck
node --test tests/*.test.mjs
pnpm --filter @jokkodev/frontend build
node scripts/check-projects-production.mjs
```

Le dernier script nécessite 3100 libre, sert le build existant et arrête son serveur temporaire. Aucun accès PostgreSQL requis pour ces contrôles d’interface.

## Limites et état final

Aucune création/sauvegarde, lecture privée, authentification, permission NestJS ou protection CSRF vérifiée contre le backend. Candidatures, messages privés, traitement des demandes et adhésions restent au lot 7. Les contrats attendus de Serge, routes, sources, choix de présentation et écarts figurent dans [le guide](jokkoprojects.md).

Bannières explicatives, données fictives, filtres supplémentaires demandés, carte simplifiée, header visiteur, footer et signature DevTeranga provisoires restent des différences. Champs obligatoires/limites définitives et visibilité des membres attendent les contrats. La bibliothèque est volontairement harmonisée en recrutement ouvert entre les vues, malgré la contradiction des PNG 11/16. Modification : adaptation documentée de la création. Le rendu HTTP introuvable streamé est détaillé ci-dessus.

Appareils physiques, lecteurs d’écran, Linux, autres navigateurs et zoom réel à 200 % non testés. Pas de validation exhaustive d’accessibilité, sécurité ou fidélité parfaite annoncée. L’annulation explicite est testée ; le blocage global de navigation n’est pas implémenté.

Chrome de revue et serveur temporaire de production arrêtés. Le frontend préexistant reste actif sur **http://localhost:3000** ; les serveurs préexistants ont été préservés. Environnements, caches, builds et captures restent exclus du versionnement. Validation visuelle reçue : publication de la branche et PR vers develop explicitement autorisées par l’équipe. Aucune fusion ni fusion automatique autorisée.
