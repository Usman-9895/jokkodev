# Connexion GitHub — recette locale du 12 novembre 2026

Lot `feature/auth-github`, worktree isolé `.cache/auth-github/worktree`, créé depuis `origin/develop` actualisé au SHA `7becbcd84df4c968be7e182be91ebe291bae8e9d`. Aucun commit, push, PR ou déploiement. [Décision](../decisions/012-github-auth.md), [configuration, callbacks et recette reproductible](../operations/github-auth.md).

## Livraison

Les boutons « GitHub » et « Google » apparaissent sur Connexion **et** Inscription lorsque leurs fournisseurs sont activés/configurés. À la demande de l'utilisateur, ils partagent une seule ligne : GitHub à gauche, Google à droite, icônes officielles, fond clair et bordure dans le thème Clair, adaptation Sombre. Leurs noms accessibles restent « Continuer avec GitHub » et « Continuer avec Google ». Google reste disponible indépendamment. Les formulaires habituels, la vérification d'adresse, le choix du pseudo et le mot de passe JokkoDev sont conservés. La finalisation des deux fournisseurs et les transactions de compte/session partagent le même mécanisme ; leurs protocoles, tables, cookies et clés dérivées restent distincts.

La liaison exige une session du compte concerné, son adresse vérifiée et une confirmation explicite du mot de passe JokkoDev. Même adresse seule : aucune liaison ni session. Un identifiant GitHub numérique stable reconnecte le même compte malgré un changement d'adresse/pseudo GitHub. Le refus des comptes suspendus est vérifié, ainsi que l'absence de session après consentement refusé ou retour invalide/rejoué. Le manque d'adresse GitHub vérifiée donne un message dédié et permet de revenir à la connexion.

## Périmètre réellement essayé

Base PostgreSQL **17.11** dédiée, `127.0.0.1:5471/jokkodev_github_recipe`, conteneur propre `jokkodev-github-postgres`, distinct des bases précédentes et de toute production. Les onze migrations ont été appliquées avec `prisma migrate deploy`, dont la migration additive `20261112090000_github_auth`. Les tests d'intégration créent leurs schémas temporaires et les retirent. Aucun db push.

**GitHub simulé uniquement**, avec échange HTTP de code, vérification PKCE, token de fixture et endpoints identité/adresses. Les appels API sont redirigés vers le simulateur par le lanceur de test, hors du produit ; aucun endpoint arbitraire configurable dans le socle. **Google simulé** avec le fournisseur OIDC signé existant pour vérifier ses régressions. Aucun vrai compte GitHub/Google utilisé dans ce lot, aucune autorisation GitHub réelle, aucun SMTP : vérifications d'adresse par transport fichier local uniquement. La confirmation Google de production du lot précédent ne constitue pas une recette GitHub réelle.

## Résultats

| Contrôle | Résultat observé |
|---|---|
| Installation | `pnpm install --frozen-lockfile` réussie ; aucune nouvelle dépendance ni modification du lockfile |
| Prisma | Génération réussie, onze migrations appliquées sur la base locale dédiée |
| Contrat/client | `pnpm api:generate` exécuté depuis NestJS, client généré ; aucune recopie manuelle des types |
| Lint | Réussi sur le code final |
| TypeScript | Réussi backend, client et frontend sur le code final |
| Build | Backend/client/frontend réussis ; frontend reconstruit après ajustement de l'espacement des boutons |
| Tests unitaires backend | **20 réussis**, dont transport GitHub à origine fixe, authentification par header, redirections interdites et réponse bornée |
| Intégration PostgreSQL | **199 réussis**, dont **11 GitHub** et **17 Google** ; suites existantes comptes/sessions/modération/notifications également exécutées |
| Tests socle/client/frontend | **149 réussis, 1 ignoré** pour une limite Windows existante ; aucun échec |
| Navigateur principal | **157 assertions réussies**, sans exception JavaScript ; voir conditions ci-dessous |
| Indépendance des boutons | **6 contrôles navigateur supplémentaires réussis**, réponses de statut contrôlées : GitHub désactivé, Google désactivé, statut GitHub indisponible, sur les deux écrans |
| Maintenance GitHub | **7 contrôles réussis** avec CLI réelle : simulation, exécution explicite, expiration, conservation du flux actif, refus batch1001, identités GitHub/Google préservées |

Les tests GitHub couvrent le scope exact `user:email`, PKCE/state/CSRF, callback précis, création normale et vérification JokkoDev, id stable, mot de passe et déconnexion/session révoquée, absence de liaison automatique, confirmation de mot de passe et rotation de session, suspension, absence d'adresse vérifiée, adresse vérifiée secondaire, refus de scopes trop larges (dont repo), consentement refusé, mauvais navigateur/state, rejeu, concurrence sur le callback et annulation des capacités. Ils vérifient aussi qu'une liaison Google déjà présente reste intacte après liaison GitHub.

Les premiers incidents de recette ont été corrigés : format trop restrictif du client fictif, puis scénarios réutilisant un CSRF après déconnexion ou un cookie de callback invalidé ; aucun assouplissement des protections pour faire passer les tests. Le sélecteur navigateur ne tenait pas compte de l'indication accessible « obligatoire » : le test a été corrigé. Après l'ajustement demandé des boutons sur une ligne, lint, TypeScript et build frontend ont été relancés, puis les seize vues et les parcours complets vérifiés de nouveau : 128 assertions de présentation et 29 de parcours, aucun échec. Les résultats backend/PostgreSQL antérieurs restent valides sur le même code backend.

## Interface et preuves visuelles

Chromium headless sur ce poste, émulation de largeur **1440, 768, 390 et 320 px**, hauteur de capture1000, thèmes Clair/Sombre, réduction des animations. Deux routes et deux thèmes à chaque largeur : **16 captures**. Huit assertions par vue : thème appliqué, absence de débordement horizontal, Google visible avec GitHub, cible GitHub d'au moins44px, même ligne avec GitHub à gauche et largeurs égales, logo GitHub officiel chargé, formulaire e-mail conservé, accès clavier GitHub et contour de focus visible. Les parcours d'inscription/liaison sont exercés en viewport390px avec l'API réelle locale.

L'examen visuel final a porté sur Connexion1440Clair, Inscription390Sombre et Connexion320Clair, ainsi que sur la liaison GitHub390 avant cet ajustement ; les vues sont comparées aux maquettes Connexion05/Inscription07, à l'interface Google validée et à la nouvelle référence de boutons fournie par l'utilisateur. Les assertions de rendu couvrent les seize vues ; toutes les captures n'ont pas fait l'objet d'un examen manuel individuel. Le bloc des fournisseurs allonge volontairement la carte ; les dispositions, tokens, logo JokkoDev et formulaires existants sont conservés. Les deux boutons sont bordés sur une ligne, avec libellé court, nom accessible complet et focus visible. Deux variantes officielles du logo GitHub sont ajoutées sans modification ; [provenance et conditions d'usage](../licenses/github/README.md). Pas de promesse de pixel-perfect, de contrôle sur appareil physique, Safari ou Firefox.

Artefacts locaux ignorés par Git : `.cache/auth-github/captures/` (16 vues, liaison et absence d'adresse vérifiée), `results.json` pour les157 assertions et `visibility-results.json` pour les six cas de statut contrôlé, `maintenance-results.json`, journaux `providers-focused.log`, `unit-tests.log`, `integration-tests.log`, `root-tests.log`, `build.log`, `frontend-final-build.log`, `final-lint.log`, `final-typecheck.log`, puis `row-lint.log`, `row-typecheck.log`, `row-build.log` après ajustement. Les comptes, messages de vérification, secrets de recette et captures restent hors du lot à publier.

## Aperçu et contrôles encore ouverts

L'aperçu livré : **http://localhost:3070/connexion** et **http://localhost:3070/inscription** ; API3071 et fournisseurs de recette3072/3073. `backend/.env` garde les flags à0 ; le lanceur `--simulated` les active seulement dans son processus de recette. Procédure d'arrêt/redémarrage et passage éventuel au vrai fournisseur dans le guide.

Restent ouverts : création/configuration d'un vrai client GitHub, consentement et aller-retour réels avec un compte autorisé, éventuelles restrictions de l'organisation GitHub et réception réelle des mails. Aucune visibilité de dépôt, autorisation réelle, migration de production ou activation n'a été modifiée. Revue indépendante backend/sécurité et frontend attendue avant toute publication.
