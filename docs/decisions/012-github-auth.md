# Décision 012 — connexion et liaison GitHub

Lot local `feature/auth-github`, créé depuis `origin/develop` vérifié au SHA `7becbcd84df4c968be7e182be91ebe291bae8e9d`. Intervention transverse explicitement demandée ; revue backend/sécurité Serge et frontend/intégration Ousmane avant publication. Aucun commit, push, migration de production ou déploiement dans ce lot.

## Compte et session partagés

Le parcours du lot Google est extrait dans `ExternalAuthService` : demande temporaire chiffrée, consommation atomique, contrôle du compte existant, création via `AuthService.register`, session opaque via `SessionsService`, verrou de compte, révocation de la session précédente, limitation de débit et retour interne autorisé. Google conserve ses routes, tables, cookies, clé dérivée, règles de pseudo/mot de passe et vérification d'adresse. Les composants de finalisation et le client de session sont partagés. Le protocole Google OIDC reste inchangé dans `GoogleOidc` ; GitHub utilise son propre adaptateur OAuth.

GitHub n'est pas un fournisseur OpenID Connect pour ce parcours. Le serveur échange un code avec PKCE S256 et vérifie state et cookie navigateur, puis appelle uniquement les endpoints GitHub `/user` et `/user/emails`. L'identité persistante est la valeur décimale de l'`id` GitHub numérique positif sûr, stockée dans `GitHubIdentity.sub` ; ni login ni adresse ne servent d'identifiant stable. Un compte a au plus une liaison par fournisseur, et peut posséder une liaison Google et une liaison GitHub distinctes.

Même adresse : aucune connexion ou liaison automatique. Il faut ouvrir une session du compte JokkoDev correspondant, disposer de son adresse vérifiée, puis confirmer explicitement son mot de passe JokkoDev. Le serveur relit sous verrou compte, mot de passe, adresse, statut et session avant consommation de la demande, liaison et rotation de session dans la même transaction. Les contraintes uniques arbitrent les demandes concurrentes. Un compte suspendu reste bloqué via chaque fournisseur et mot de passe.

Nouveau membre : choix d'un pseudo et d'un vrai mot de passe JokkoDev, rôle MEMBER, vérification d'adresse JokkoDev habituelle. Une preuve d'adresse vérifiée GitHub ne dispense pas de cette vérification. Sans adresse GitHub vérifiée et valide, la demande est consommée et un message propose de vérifier une adresse chez GitHub ou d'utiliser la connexion e-mail de JokkoDev. Parmi les adresses vérifiées, priorité à la principale, sinon choix déterministe ; lecture bornée à cinq pages de cent adresses.

## Permissions et protections

Seul le scope `user:email` est demandé. L'identité publique du compte authentifié ne nécessite pas `read:user`. Aucun scope `repo`, `public_repo`, `user`, organisation, contacts ou accès hors ligne n'est demandé ; aucun endpoint de dépôt n'est appelé. Un jeton reçu avec des scopes absents ou plus larges est refusé avant lecture de l'identité, y compris après une ancienne autorisation plus large du même client. Utiliser un client OAuth dédié.

`openid-client` déjà verrouillé dans le dépôt assure les échanges Authorization Code et PKCE ; aucune nouvelle dépendance n'est ajoutée. La licence du code original n'est pas modifiée ; les marques GitHub du bouton disposent de leur [notice de provenance et d'usage](../licenses/github/README.md). Les endpoints GitHub HTTPS sont fixes dans le code. Les appels API ont une limite de huit secondes et 64 Kio, et ne suivent pas les redirections avec un jeton. Les réponses de GitHub et erreurs internes ne sont jamais journalisées. Jetons/codes, secrets et adresses ne vont ni dans les journaux ni dans la redirection finale.

Le départ est un POST protégé par Origin/CSRF. Le callback exige state, cookie de navigateur opaque, PKCE et session de départ inchangée ; il consomme l'autorisation avant échange du code. GitHub OAuth n'utilise pas de nonce d'ID token : les validations OIDC Google restent propres à Google. Le retour redirige en 303 vers une URL JokkoDev propre, no-store/no-referrer. Une erreur ou un retour rejoué impose un nouveau départ volontaire.

`GitHubFlow` et `GitHubIdentity` sont séparées des tables Google. Cookie `__Host-jokkodev_github` en HTTPS, HttpOnly/Secure/SameSite=Lax/Path=/ ; capacité distincte de la session. La clé AES-GCM du payload est dérivée avec un domaine propre à GitHub ; la dérivation Google existante est conservée. Chaque phase vaut dix minutes ; l'effacement physique relève du nettoyage borné et de son exploitation. Les jetons GitHub ne sont jamais persistés ; seule l'identité stable et la date de liaison suivent la vie du compte. Les autorisations restent gérables dans GitHub ; pas de dissociation automatique dans ce lot.

## Déploiement ultérieur

Flag indépendant `GITHUB_AUTH_ENABLED=0` par défaut. Migration additive `20261112090000_github_auth`, sans changement des colonnes User/sessions ou des tables Google. CLI et modèles de nettoyage GitHub indépendants ; aucune unité installée par ce lot local. Désactivation GitHub et restauration de release préserveront les nouvelles tables/liaisons, les comptes, Google et la file mail, sans retour arrière SQL. Voir le [guide](../operations/github-auth.md) et les [preuves locales](../frontend/github-auth-verification.md).

Sources primaires consultées : [flux OAuth GitHub et PKCE](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps), [scope user:email](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps), [lecture des adresses vérifiées](https://docs.github.com/en/rest/users/emails#list-email-addresses-for-the-authenticated-user).
