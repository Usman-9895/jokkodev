# Connexion Google — rapport de recette locale

Branche `feature/auth-google`, worktree `.cache/auth-google/worktree`, créée depuis `origin/develop` à jour `a3a166ead1de5a97ea2bc90a98b58b827a3ae747`. Aucune publication, commit, PR ou opération de production. Skill jokkodev-ui-fidelity utilisé : charte, procédure de comparaison et planche `JokkoDev_05_Connexion_v1.png` examinées. Composition du formulaire et composants existants conservés, avec bouton Google avant le formulaire e-mail. Inter reste la police du produit ; Google Sans 500 localisée au bouton officiel.

## Périmètre livré

Bouton sur `/connexion` et `/inscription` uniquement si l’API annonce le fournisseur activé et complètement configuré. Les deux entrées utilisent le même parcours. Retour sur `/connexion/google`, création explicite du compte avec les règles actuelles et vérification JokkoDev, reconnexion par sub, connexion préalable et confirmation de liaison pour une adresse existante. Pas de liaison automatique par adresse. Suspension, sessions opaques et CSRF restent ceux du socle. [Décision 011](../decisions/011-google-auth.md), [configuration et recette](../operations/google-auth.md), [contrat généré](../api/openapi.json).

Les comptes Google sans mot de passe JokkoDev ne sont pas introduits dans ce premier lot : la création conserve pseudo, mot de passe réel et vérification par e-mail, comme le parcours existant. Une reconnexion Google à une identité liée ne redemande pas ce mot de passe. Cette portée conserve un fallback réellement utilisable et la compatibilité de l’ancienne API.

## PostgreSQL et protocole

Nouvelle base isolée `127.0.0.1:5470/jokkodev_google_recipe`, jamais une production ni une ancienne base métier réutilisée. Dix migrations appliquées par `prisma migrate deploy`, dont **20261110090000_google_auth**. Schémas temporaires pour les tests d’intégration ; aucun db push.

**188 tests PostgreSQL passent**, dont **17 tests Google**. Le fournisseur de test est un serveur HTTP local avec codes à usage unique, PKCE vérifié, JWT RSA signés et JWKS : seule l’identité externe est simulée ; API NestJS, cookies, transactions et PostgreSQL sont réels.

Couverture Google :

- activation/configuration/callback exact, scopes minimaux, CSRF au départ et à la liaison ; fournisseur désactivé réellement testé par HTTP, mot de passe encore utilisable ;
- premier accès sans session implicite avant création, pseudo/mot de passe invalides refusés, vérification JokkoDev normale, une identité créée ;
- même sub avec adresse Google changée : même compte, adresse JokkoDev inchangée ; déconnexion et ancienne session invalides ;
- adresse existante : aucune liaison/session automatique, connexion et mot de passe erroné, confirmation explicite, ancienne session remplacée ; autre compte et adresse non vérifiée refusés ;
- compte suspendu refusé via Google et mot de passe ;
- refus de consentement, mauvais navigateur/state, expiration, callback rejoué ;
- mauvaise signature RSA, issuer, audience, nonce, expiration et adresse non vérifiée/invalide refusés ;
- retours OAuth concurrents : une seule consommation/échange ; inscriptions concurrentes : un seul compte et une seule identité ;
- identité liée entre deux finalisations avec adresses Google différentes : conflit explicite 409, aucun deuxième compte ;
- annulation et déconnexion effacent la capacité temporaire du navigateur.

La suite existante complète couvre notamment réactivation, modération, sessions/CSRF, notifications et F2. **12 vérifications locales supplémentaires** passent pour la maintenance et le rollback : simulation sans suppression, suppression explicite d’une demande expirée, demande active conservée, destination mal confirmée refusée ; ancienne API disponible sur schéma migré, routes Google absentes/404, connexion par vrai mot de passe d’un compte créé par Google, session/déconnexion habituelles et identités conservées.

## Navigateur et fidélité

**58 contrôles de parcours passent** sur Chromium ordinateur avec émulation mobile : bouton atteignable au clavier et contour visible, création complète, vérification par lien du transport fichier, reconnexion par sub, compte inchangé malgré l’adresse Google différente, liaison volontaire sur compte existant, conflit sur seconde identité, annulation/refus et retour invalide nettoyé. Les champs ont labels permanents, aide et erreurs associées ; les adresses ne sont ni des paramètres d’URL ni des valeurs de stockage persistant.

**28 contrôles complémentaires** sur le dernier build : rendu connexion et création en Clair/Sombre à **1440, 768, 390 et 320 px**, absence de débordement horizontal, police du bouton servie localement, absence de pages/codes OAuth et sessions dans CacheStorage, aucun SDK/police Google distant. État frontend « fournisseur désactivé » vérifié avec réponse status simulée ; le refus API réel est aussi couvert par le test PostgreSQL correspondant. Le navigateur du poste a également émis une requête vers un domaine Kaspersky ; ce domaine est absent des sources du produit et n’est pas présenté comme une requête applicative Google.

Captures sous `.cache/auth-google/captures/`, hors du commit :

- `connexion-{1440,768,390,320}-{light,dark}.png` ;
- `creation-google-{1440,768,390,320}-{light,dark}.png` ;
- `liaison-google-390-light.png`, avant confirmation ;
- `results.json` (parcours) et `final-visual-results.json` (rendu final/cachage).

Les vues finales ordinateur/mobile ont été réellement ouvertes et relues. Pas d’écart majeur de mise en page relevé ; la hauteur augmente pour expliquer la liaison et les règles de création, avec défilement normal. La maquette initiale ne comportait pas Google ; le bouton et le parcours supplémentaire sont des adaptations du lot, sans affirmation de fidélité pixel parfaite. Aucun appareil physique, Safari/Firefox, lecteur d’écran ou vrai consentement Google n’est revendiqué.

## Contrôles du dépôt et reproduction

Lint, TypeScript et builds backend/client/frontend **passent**. Tests unitaires backend : **19 passent**. Suite Node frontend/scripts : **149 passent, un ignoré sous Windows** (150 cas). Client généré via **pnpm api:generate**, sans copie manuelle des types. Inventaire de licences régénéré : 470 dépendances et 604 notices, les deux nouveaux paquets OIDC sous MIT ; aucune nouvelle licence GNU exclue déclarée détectée. Assets et police : [provenance](../licenses/google/README.md).

Commandes du dépôt : `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:integration`, avec TEST_DATABASE_URL explicitement fixé à la base isolée. Harnais locaux depuis `D:\DEV\JokkoDev` :

```powershell
node .cache/auth-google/check.cjs focused
node .cache/auth-google/check.cjs all
node .cache/auth-google/check.cjs quality
node .cache/auth-google/check-maintenance.cjs
node .cache/auth-google/browser-recipe.cjs
node .cache/auth-google/final-visual.cjs
```

Les harnais vérifient la destination locale et lisent les secrets fictifs depuis `.cache/auth-google/runtime/private.json`, ignoré par Git. Le magasin pnpm a été indiqué explicitement pour régénérer les licences ; aucun changement des dépendances existantes. Des créations de fichiers du compilateur/générateur ont nécessité une exécution hors du bac à sable Windows. Les premiers sélecteurs navigateur ont été corrigés pour tenir compte de la mention accessible « obligatoire » et pour attendre le message précis ; pas de défaut métier masqué par ces corrections. Une capture lancée avant la disponibilité de l’API a été relancée après son contrôle de readiness. Les captures finales utilisent l’API officielle du thème pour synchroniser le libellé du sélecteur et les couleurs.

Les résultats correspondent au code applicatif final. Après les ajustements visuels/police/confidentialité, un complément de contrôle HTTP fournisseur désactivé et la gestion explicite du conflit d’identité à la finalisation ont été vérifiés ; la suite PostgreSQL complète a été rejouée et les 188 tests passent. Le contrat et le client ont ensuite été régénérés avec les erreurs et la redirection documentées ; lint et TypeScript revérifiés. Pas de nouvelle exécution GitHub Actions pour une branche non publiée. L’API GitHub confirme que develop reste sur la base annoncée et `protected=false` : les règles de revue décrites par AGENTS.md ne sont pas une protection de branche effective.

## Inscription et confirmation utilisateur

Complément demandé après première livraison : même bouton ajouté sur `/inscription`, avec la même condition d’activation et le même parcours serveur. Lint, TypeScript et build frontend rejoués et réussis. **29 contrôles navigateur supplémentaires** passent : inscription à quatre largeurs dans les deux thèmes, absence de débordement, formulaire classique conservé, départ Google au clavier, annulation du consentement et bouton absent lorsque le statut du fournisseur est désactivé (réponse simulée pour cet état UI). Captures `inscription-{1440,768,390,320}-{light,dark}.png` et `registration-results.json` dans le même dossier local. Vues ordinateur Clair et mobile Sombre ouvertes et relues. Aucun changement backend, migration ou contrat ; les preuves PostgreSQL du lot restent applicables.

Lors de sa validation pour publication, **l’utilisateur indique avoir confirmé le parcours Google réel**. Cette confirmation utilisateur est distincte des essais automatisés avec fournisseur simulé : aucun détail supplémentaire sur le compte, l’environnement, les étapes ou les cookies n’est attesté ici et aucun identifiant de recette n’est publié. L’agent n’a pas observé directement cette authentification réelle. Les consultations de métadonnées et les téléchargements d’assets ne sont pas comptés comme une connexion Google.

Avant activation en production restent à vérifier dans cet environnement : client Cloud et secrets de production, callback HTTPS, liens d’accueil/confidentialité et exigences éventuelles de Google, cookies/protections derrière le proxy et nettoyage programmé. Aucune recette Google de production ni réception SMTP réelle de ce lot n’est revendiquée par l’agent. Les tests automatisés qui créent/modifient des comptes sont locaux. Publication de branche/PR autorisée ; déploiement et activation de production séparés.
