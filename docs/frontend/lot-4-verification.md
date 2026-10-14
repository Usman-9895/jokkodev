# Vérifications du lot 4 — comptes et profils

Le 14 octobre 2026, sous Windows, Node 24.15.0, pnpm 10.34.6 et Chrome 155.0.8059.40. Branche `feature/frontend-accounts-profiles`, base `develop` à `d956c0f` après fusion confirmée du lot 3. Rapport établi avant publication. La revue visuelle a ensuite été validée et le commit, le push de cette branche et une PR vers `develop` autorisés ; aucune fusion autorisée.

## Contrôles exécutés

| Contrôle | Résultat |
|---|---|
| `pnpm exec eslint frontend tests/accounts-presentation.test.mjs scripts/review-accounts.mjs` | Réussi |
| `pnpm --filter @jokkodev/frontend typecheck` | Réussi, routes Next et TypeScript strict |
| `node --test tests/*.test.mjs` | 9 tests réussis : 3 nouveaux comptes/liens et 6 existants |
| `pnpm --filter @jokkodev/frontend build` | Réussi, 22 routes générées |
| `ACCOUNTS_REVIEW_REUSE=1 node scripts/review-accounts.mjs` | Revue Chrome réelle réussie, assertions et captures |
| Build servi temporairement sur 3100 | Les cinq écrans de compte, `/profils/exemple` et `/espace/profil` répondent 200 avec leur indisponibilité explicite |
| `/dev/comptes`, `?view=edit`, `?view=verify&state=success` en production | 404 vérifiées |
| `git diff --check` | Réussi |
| Périmètre backend, API et verrouillage | Aucun changement |

Les vérifications ont été relancées après les corrections de rendu. Les tests Node émettent l’avertissement connu `MODULE_TYPELESS_PACKAGE_JSON` lors de l’import direct du TypeScript ; tous passent. Pas de changement de mode de modules uniquement pour masquer cet avertissement. Aucun test backend supplémentaire : aucun code backend changé.

## Conditions de revue visuelle

| Fenêtre CSS | Écrans |
|---|---|
| 1440 × 1000 | Connexion, inscription, récupération, nouveau mot de passe, vérification email, profil fictif, modification fictive |
| 768 × 1024 | Les mêmes sept écrans |
| 390 × 844 | Les mêmes sept écrans |
| 320 × 800 | Les mêmes sept écrans |

Captures de pages complètes dans un profil Chrome isolé sur **localhost:3000**, après chargement des polices Inter et Source Serif 4 et des images visibles. Les illustrations desktop masquées sur mobile ne sont pas considérées comme un échec de chargement. Captures réellement ouvertes et examinées, comparées aux dix références demandées. Aucune image demandée inaccessible ou introuvable.

Corrections observées puis recontrôlées : identité/avatar côte à côte sur mobile, initiales issues du pseudonyme, retour à la ligne de la connexion, contrôles d’aperçu repliés, message d’erreur utilisant le token `danger`, couleur des liens expirés, destination de vérification d’email, séparation des liens de retour et espacement des squelettes. Pas de débordement de page détecté aux quatre largeurs ; la biographie longue sans espaces reste contenue à 320 px.

Les proportions sont estimées à partir des PNG, pas extraites de Figma. Bannières d’indisponibilité, labels permanents, cibles de 44 px et contraintes encore inconnues augmentent la hauteur. Le logo original approuvé est conservé intact, sur une surface blanche ; réseau SVG et carte réutilisée simplifiés. Identité et compteurs du profil correspondent aux exemples disponibles et diffèrent de ceux du PNG. Navigation visiteur ; aucune barre privée de compte connecté dans le profil public. Textes juridiques et contact restent différés. Ces différences sont documentées, sans revendication de fidélité au pixel près.

## Interactions réellement contrôlées

- Afficher/masquer le mot de passe avec nom accessible et `aria-pressed`, puis remasquer ; autocomplétion `current-password` et `new-password`.
- Labels, Tab et retour arrière, contour visible de 2 px ; menu mobile ouvert au clavier, fermé avec Échap.
- Validation locale d’inscription : quatre champs vides, résumé focalisé, erreurs associées, confirmation différente et saisie conservée. Une saisie cohérente affiche uniquement l’indisponibilité de l’opération, sans redirection ni réussite métier.
- États d’envoi injectés : commandes désactivées et chargement annoncé, y compris vérification d’email. Ce contrôle concerne la prévention d’une action dans l’aperçu, pas une mutation backend réelle.
- Variantes absent, invalide, expiré et déjà utilisé ; confirmation neutre de récupération, attente/succès de vérification, expiration de session et limitation sans compteur inventé. Tous marqués comme simulés.
- Profil : champs facultatifs absents, contenu long, introuvable, chargement, erreur et onglets sans contributions. Liens de questions cohérents avec les exemples JokkoHelp ; compteurs issus du jeu local.
- Formulaire de profil : valeur modifiée, annulation, dialogue natif avec focus sûr, Échap et retour au déclencheur ; réinitialisation locale. Ajout/retrait d’une compétence et d’un lien. URL `javascript:` rejetée et conservée en erreur, puis URL HTTP(S) valide acceptée localement sans sauvegarde.
- Navigation inscription depuis connexion ; routes publiques de profils sans input privé. Paramètres publics de jeton/statut non interprétés, impossibilité d’afficher un succès par `?state=success`.
- Mouvement réduit émulé pendant la revue ; contrôle complémentaire en mouvement normal. Aucun effet d’entrée retardant les formulaires.
- Page de connexion serveur avec JavaScript désactivé : aucune balise form susceptible de transmettre les champs. Aucune exception JavaScript captée et aucun appel `/api/v1` pendant le harnais.

## Preuves locales et reproduction

Tout reste dans **`.cache/design-system/lot-4/`**, ignoré par Git :

- `login`, `register`, `forgot`, `reset`, `verify`, `profile`, `edit` suivis de `-{1440,768,390,320}.png`.
- `login-focus-390.png`, `register-validation-390.png`, `edit-validation-390.png`.
- Variantes de compte : `register-sending`, `verify-sending`, `login-error`, `forgot-success`, `reset-success`, `reset-missing`, `reset-invalid`, `reset-expired`, `reset-used`, `verify-success`, `verify-pending`, `verify-expired`, `login-session-expired`, `login-limited`, suivies de `-390.png`.
- Profil : `profile-{missing,long,not-found}-320.png`, `profile-{loading,error,answers}-390.png` ; informations publiques et propriétaire indisponibles sur leurs routes, capturées à 390 px.
- `checks.json` : navigateur, dimensions, polices, images et contrôles ; `production-checks.json` : statuts HTTP réels du build.

Lancer `pnpm dev:frontend`, puis :

```powershell
$env:ACCOUNTS_REVIEW_REUSE='1'
node scripts/review-accounts.mjs
```

Sans serveur actif, lancer directement le script avec ports 3000 et 9223 libres : il démarre et arrête ses propres processus. `CHROME_PATH` permet un navigateur installé ; `ACCOUNTS_REVIEW_PORT` choisit le port frontend. Sous Linux, l’équivalent est `ACCOUNTS_REVIEW_REUSE=1 node scripts/review-accounts.mjs`, mais son exécution n’a pas été vérifiée. Pour examiner le build : `pnpm --filter @jokkodev/frontend exec next start --port 3100`, puis contrôler les URL et arrêter ce serveur.

## Limites et état final

**Aucun parcours de compte ou profil réel testé : aucun endpoint correspondant n’existe.** Pas de comptes de test créés, emails envoyés, profil enregistré, session établie ou permissions serveur vérifiées. Validation locale et données fictives uniquement. Politique de mot de passe, format des jetons, paramètres de retour, contraintes du profil, cookies/CSRF, délais et permissions attendent Serge. Aucun traitement de token dans localStorage, aucune règle backend déduite des images.

Appareils physiques, lecteurs d’écran, Linux, autres navigateurs et zoom réel à 200 % non testés. Le comportement `beforeunload` reste soumis aux restrictions du navigateur ; le dialogue d’annulation est testé, pas une protection globale de toute navigation. Aucune conformité exhaustive d’accessibilité annoncée.

À la livraison visuelle, navigateur de revue et serveur de production temporaire arrêtés ; frontend de développement laissé actif sur **http://localhost:3000**. Aucun commit, push, création de PR ou fusion n’avait alors été effectué. Pour la publication autorisée, les contrôles sont réutilisés : le code n’a pas changé depuis leur exécution ; seules les mentions documentaires d’autorisation ont été actualisées. Le [guide](accounts-profiles.md) répertorie les routes, données, conventions et préalables backend.
