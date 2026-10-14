# Lot 4 — interfaces de comptes et profils

Branche `feature/frontend-accounts-profiles`, créée depuis `develop` à `d956c0f` après récupération des références et vérification de la fusion de la PR #3. Le dossier de travail était propre. Après validation visuelle, l’équipe a explicitement autorisé le commit, le push de cette branche et une PR vers `develop`. Aucune fusion ni fusion automatique autorisée.

## Contrats réellement disponibles

Inspection de `packages/api-client/src/schema.d.ts`, du contrat OpenAPI, des clients HTTP serveur/navigateur et des décisions de sécurité. Seules les routes `/api/v1/health/live` et `/api/v1/health/ready` sont définies. Le format d’erreur généré prévoit `code`, `message`, `fieldErrors` et `requestId`, mais aucun DTO de compte ou profil n’existe.

**Aucune opération de compte ou profil n’est intégrée au backend dans ce lot.** Le backend, le contrat, les types générés, les dépendances et le verrouillage pnpm restent inchangés.

| Opération | État du contrat et de l’interface |
|---|---|
| Inscription / connexion | Endpoints absents ; interfaces publiques, actions désactivées |
| Session courante / déconnexion | Absentes ; header visiteur conservé, aucune session fictive |
| Cookies, CSRF, expiration, suspension | Orientations documentées seulement ; aucun cookie/session de compte créé |
| Vérification email / renvoi | Absents ; attente publique honnête, variantes de résultat en développement |
| Récupération / renouvellement du mot de passe | Absents ; aucun email envoyé, aucun paramètre de jeton interprété |
| Profil public | Absent ; route publique sans recherche de compte ni données personnelles |
| Modification du profil | Absente ; formulaire exclusivement dans l’aperçu de développement |

Le transport partagé prépare `credentials: include`, `cache: no-store` et un futur jeton CSRF fourni explicitement par l’appelant. Cela ne rend ni les sessions ni CSRF opérationnels. Aucune nouvelle variable d’environnement ou adresse API ajoutée.

## Routes

| Adresse locale | Usage |
|---|---|
| http://localhost:3000/connexion | Connexion, champs et visibilité du mot de passe ; opération indisponible |
| http://localhost:3000/inscription | Pseudonyme, email, mot de passe et confirmation ; création indisponible |
| http://localhost:3000/mot-de-passe-oublie | Récupération, aucun envoi |
| http://localhost:3000/nouveau-mot-de-passe | Nouveau mot de passe, aucun lien interprété ni sauvegarde |
| http://localhost:3000/verification-email | Attente, aucun email vérifié ou renvoyé |
| http://localhost:3000/profils/exemple | Information d’indisponibilité de la consultation publique |
| http://localhost:3000/espace/profil | Information d’indisponibilité sans formulaire privé ni fausse autorisation |
| http://localhost:3000/dev/comptes?view=profile | Profil public fictif complet, onglets de contributions |
| http://localhost:3000/dev/comptes?view=edit | Formulaire de profil fictif, validation locale et annulation |
| http://localhost:3000/dev/comptes?view=register | Formulaire et validation locale d’inscription |

`/inscription` est déplacée du groupe `(public)` vers `(auth)` pour partager le layout des comptes ; l’URL ne change pas et aucun deuxième écran parallèle n’est créé. La navigation et les destinations existantes sont conservées. Les autres espaces restent distincts.

## Aperçu et états isolés

`/dev/comptes` vérifie `NODE_ENV === 'development'` côté serveur, ne figure pas dans la navigation publique et porte `noindex`. Il renvoie 404 en production. Les options sont repliées par défaut pour examiner la composition ; le contrôle natif permet de choisir écran et état au clavier.

Paramètres d’aperçu uniquement, **pas un contrat API** :

- `view` : `login`, `register`, `forgot`, `reset`, `verify`, `profile`, `edit`.
- `state` : options pertinentes selon l’écran, parmi `initial`, `sending`, `error`, `pending`, `success`, `missing`, `invalid`, `expired`, `used`, `session-expired`, `limited`, `loading`, `long`, `not-found`.
- `tab` du profil : `questions`, `answers`, `projects`.

Valeurs absentes, inconnues, multiples ou inadaptées à un écran : repli sur l’état initial. Les mots de passe, emails saisis et liens de compte ne sont jamais des paramètres d’aperçu. La route publique ne lit aucun paramètre de jeton, de statut ou de retour ; `?state=success` ne permet pas d’afficher une fausse réussite.

Exemples : `/dev/comptes?view=verify&state=success`, `/dev/comptes?view=reset&state=expired`, `/dev/comptes?view=login&state=session-expired`, `/dev/comptes?view=edit&state=error`, `/dev/comptes?view=profile&state=missing`.

Les confirmations, délais et erreurs sont injectés manuellement par la route. Pas de faux appel HTTP, de compteur 60 secondes inventé, de connexion automatique, de token, de rôle administrateur ou de session persistante. La validation locale ne bascule jamais vers une réussite métier : le message dit explicitement que rien n’a été créé, envoyé ou enregistré.

## Composants et règles de présentation

`AccountFrame` partage le panneau de marque, les orbites SVG statiques, la carte et le retour. `AccountFooter` ne présente pas les textes juridiques comme finalisés. `AccountForm`, `PasswordField`, `AccountState` et `ProfilePreview` réutilisent les primitives des lots précédents, les polices locales et la palette. Styles limités à `accounts.css`. Aucune bibliothèque nouvelle.

Les champs publics n’appartiennent pas à un formulaire soumis : les actions sont désactivées et Entrée ne transmet pas un mot de passe via GET ou POST, même sans JavaScript. La visibilité du mot de passe est accessible, avec nom, `aria-pressed` et `aria-controls`. Autocomplétion : `email`, `username`, `current-password`, `new-password`, `nickname`. Aucun blocage du collage ou des gestionnaires de mots de passe.

Les mots de passe restent dans les champs DOM, sans état React persistant, URL, logs, stockage local ou cookies. La vérification de démonstration emploie temporairement FormData, sans transmission ni conservation. Les erreurs sont associées aux champs et annoncées dans un résumé focalisé. Les saisies restent présentes après erreur locale. Pendant l’état d’envoi injecté, fieldset et bouton sont désactivés.

La validation de démonstration couvre les champs vides, le format natif HTML de l’email et l’égalité des deux mots de passe. **Aucune longueur minimale, complexité, normalisation ou unicité n’est inventée.** Le seuil de 15 caractères de la maquette et les propositions de 500 caractères de biographie, 15 technologies et 3 liens restent à confirmer. Les pays et technologies du sélecteur sont des exemples locaux, pas un catalogue contractuel.

`lib/accounts/profile-demo.ts` contient les valeurs publiques fictives. L’identité et l’avatar sont dérivés du pseudonyme `awa_demo`, sans champ de nom distinct inventé. Les cinq questions viennent des exemples JokkoHelp dont l’auteur est Awa ; compteurs dérivés du jeu affiché, zéro réponse et zéro projet pour ce profil local. Les liens vont vers `example.com`, jamais vers un compte personnel. Les champs facultatifs absents, le contenu long, l’erreur, le chargement et l’introuvable sont préparés en développement.

Les liens publics n’acceptent que des URL HTTP(S) absolues sans identifiants ni caractères de contrôle ; protocoles actifs, `file:`, chemins relatifs et antislashs rejetés. La modification ne rend pas une URL saisie cliquable avant validation. L’email, les sessions, les rôles et candidatures ne sont ni affichés ni éditables.

Les modifications de profil restent locales et non enregistrées. Annuler ou quitter vers le profil de démonstration demande confirmation si la saisie diffère : dialogue HTML natif, focus initial sur « Continuer », Échap et retour au déclencheur. Avant fermeture/rechargement, `beforeunload` sollicite la protection native du navigateur quand applicable. Aucun blocage global du routeur n’est revendiqué : la navigation via les options de l’aperçu peut réinitialiser le jeu local.

`allowedReturnPath` est une primitive testée pour une future intégration : destinations internes connues seulement, aucun paramètre ni fragment, aucune redirection exécutée. Le nom du paramètre et le parcours réel restent à décider avec Serge. Le contrôle frontend ne remplace aucune permission backend.

## Références examinées et écarts

Les cinq images jointes sont les références principales. Toutes retrouvées localement et ouvertes : 05 Connexion, 07 Inscription, 09 Nouveau mot de passe, 13 Profil public, 14 Modifier profil. Les compléments 08 Mot de passe oublié, 10 Vérification email, 28 Validation et envoi, 31 Comptes et expiration, 32 Focus et mobile ont également été ouverts. Notes des séries 01/02/03 et états complémentaires, matrice, charte et procédure du skill lus. Aucun fichier demandé manquant.

Sources : `D:/BUSINESS/CADEV/Maquettes/JokkoDev_6_maquettes_v1/`, `JokkoDev_6_maquettes_serie_02_v1/`, `JokkoDev_6_maquettes_serie_03_v1/`, `JokkoDev_etats_complementaires_v1/` ; notes complémentaires dans les livrables locaux indiqués par `references/ressources.md`.

Différences matérielles : bannières d’indisponibilité et de démonstration augmentant la hauteur ; header anonyme ; cibles et labels accessibles ; identité/compteurs harmonisés avec le jeu local. Le logo original approuvé est réutilisé intact sur une surface blanche et conserve son lettrage, au lieu du logo 3D reconstitué des PNG. Réseau géométrique statique et silhouette Natural Earth réutilisée du lot 2, sans nouvelle illustration autonome. Illustrations d’état simplifiées, aucune donnée réelle, aucun consentement juridique ni texte de confidentialité final inventé. Pas de fidélité au pixel près annoncée.

## Préalables attendus de Serge

Fournir et implémenter les contrats d’inscription/connexion/session/déconnexion, les cookies et la fourniture/rotation du jeton CSRF, les codes d’erreur et délais Retry-After, la politique de mot de passe et du pseudonyme, les paramètres des liens expirants/à usage unique et les règles de vérification d’email. Définir le schéma public du profil, les limites de champs, le catalogue pays/technologies, les contributions publiques, les permissions propriétaire et suspension.

Modifier le contrat dans NestJS, exécuter `pnpm api:generate`, puis intégrer avec des comptes de test dédiés. Tester vrais cookies/proxy, renvoi neutre, limitations, expiration/révocation, nettoyage des caches privés à la déconnexion et permissions serveur avant d’activer les actions. Aucun parcours backend réel n’a été validé dans ce lot.

Voir [le rapport de vérification](lot-4-verification.md). Lancer `pnpm dev:frontend` et examiner les adresses ci-dessus. Attendre la validation visuelle avant toute publication.
