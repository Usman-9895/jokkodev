# Lot 10 — intégration comptes et profils

## Base et périmètre

Branche locale `feature/frontend-auth-integration`, créée depuis `develop` avancé par fast-forward à **1ddc6cb5bd31cd00ca531ae4371dec5d87a970af**. Les commits #10 à #18 et #20 sont ancêtres de cette base ; le commit propre à #19 (75c34d36422b9c2077c72c747c6bda8f63fe6916) ne l’est pas. Comparaison complète des arbres : aucune différence entre cette base fusionnée et le correctif testé a818043925ada0a5a046b334e8a9e4d6a8d73685, notamment restauration, validation null, smoke, recherche et transport. Les badges GitHub ne sont pas la preuve utilisée.

Les écrans validés et leurs composants/styles sont conservés. Les comptes/profils sont raccordés ; questions/projets publics restent sur fixtures identifiées et leurs mutations, candidatures et modération ne sont pas activées. Aucun backend ni migration partagé modifié.

## Routes et opérations

| Interface | Contrat utilisé |
| --- | --- |
| `/connexion` | GET auth/csrf, POST auth/login ; remplacement du jeton et retour interne autorisé |
| `/inscription` | POST auth/register : vraie session immédiate puis écran de vérification |
| Header | GET auth/me, POST auth/logout ; identité réelle, chargement sans données privées |
| `/verification-email?token=…` | POST auth/verify-email après action explicite ; POST auth/resend-verification réservé à une session |
| `/mot-de-passe-oublie` | POST auth/forgot-password, confirmation neutre après 202 |
| `/nouveau-mot-de-passe?token=…` | POST auth/reset-password ; sessions invalidées après 204 et retour à la connexion |
| `/profils/[pseudonyme]` | GET users/:reference ; seuls les champs publics, onglets users/:id/questions, answers, projects avec pagination serveur |
| `/espace/profil` | GET users/me, GET technologies, PATCH users/me ; valeurs initiales, erreurs serveur, sauvegarde confirmée et annulation |
| `/espace/*` | SessionGate réel ; autres pages personnelles encore en attente de raccordement métier |

Préfixe de tous les endpoints : `/api/v1`. Sources contractuelles uniques : [guide API](../api/frontend-integration.md), [décision 003](../decisions/003-sessions-csrf.md), types générés. `CurrentUser`, profils, technologies et payload PATCH sont typés depuis les schémas générés ; aucun DTO copié ni runtime Nest/Prisma importé dans le navigateur.

## Composants et état

- `lib/accounts/session.ts` : AccountClient réutilise le transport partagé, un état par SessionProvider monté, aucun singleton serveur contenant une identité. CSRF en mémoire uniquement, acquisition dédupliquée, remplacement login/register, renouvellement après logout et CSRF invalide, jamais de rejeu automatique d’une mutation.
- `SessionProvider` : identité initialement inconnue, relecture à l’initialisation, au retour de focus/visibilité et périodiquement (60 s). Le serveur reste seul compétent pour expiration et permissions ; le frontend ne prétend pas connaître instantanément une révocation distante sans requête.
- `SessionGate` : pas de rendu de formulaire/données privés avant session confirmée, démontage/invalidation sur logout/401/403 d’accès ou session indisponible. Les réponses privées en vol d’une ancienne révision de session sont rejetées. Pas de cache applicatif persistant de profils privés ; requêtes `no-store` et cookies `credentials: include`.
- `LiveAccountForm` : validation réelle, autocomplétion, collage, affichage/masquage accessible, verrou de soumission impératif et état d’attente. Les contraintes 12–128 caractères comptent les caractères Unicode comme le validateur livré ; pas de maxlength susceptible de tronquer les mots de passe. Confirmation côté frontend uniquement.
- `ProfileEditor` : payload whitelist username/bio/countryCode/skillIds/links, ISO alpha-2 et catalogue réel, null explicite pour effacer bio/pays, limite 500/15/3 et URLs HTTPS. Les vérifications serveur restent déterminantes. Annulation et navigation interne après modification ouvrent un dialogue natif avec focus sûr, Échap et retour au déclencheur ; avant déchargement, avertissement natif.
- `PublicProfilePage` : pseudonyme en identité affichée, initiales, pays localisé via Intl, aucun email/rôle/session. Texte et liens rendus sans HTML non fiable. Les compteurs viennent du serveur ; « Projets publics » inclut créés/rejoints selon le contrat, pas seulement créés.
- `DeveloperNavigation` réutilisé en mode produit ou aperçu ; aucun lien `/dev/*` ajouté à la navigation publique.

## Transport et erreurs

`HttpError.retryAfterSeconds` est affiché seulement quand le serveur fournit un délai valide ; aucun compteur inventé ni relance automatique. Les erreurs par champ sont associées aux contrôles, les résumés reçoivent le focus et les résultats sont annoncés. Les données saisies restent en place après erreur quand le lien reste utilisable ; les mots de passe sont effacés après réussite/navigation, jamais enregistrés dans stockage, URL ou logs.

Défaut du transport observé pendant le raccordement : les endpoints email renvoient 202 sans corps, alors que le décodeur attendait du JSON. Correction minimale dans `packages/api-client/src/http.ts` : accepter le corps réellement vide pour 202, conserver l’erreur de protocole pour un corps JSON malformé. Tests dédiés et parcours réels forgot/resend réussis. Aucun changement de contrat ou de backend pour contourner ce point.

Les liens absents/malformés sont présentés sans prétendre avoir interrogé le serveur. Les réponses TOKEN_INVALID regroupent lien inconnu, expiré et consommé, sans inventer une distinction non fournie. La vérification par action explicite évite de consommer un jeton lors d’un simple préchargement/GET du lien.

## Recette et environnement local

Les preuves de cette mission sont dans `.cache/lot10/`, hors Git : vérification des fusions, journaux des contrôles baseline/final, tests HTTP réels et captures Chrome. Consulter le rapport `lot-10-verification.md` pour résultats finaux et limites.

Recette isolée : frontend http://127.0.0.1:33020, backend http://127.0.0.1:33021, PostgreSQL 17.11 jetable à 127.0.0.1:55472, bases `jokkodev_lot10` et `jokkodev_lot10_it`. Docker label `jokkodev.lot=10`, PGDATA tmpfs sans montage des données de l’équipe ; noms et zéro objet vérifiés avant migration. Aucun recours aux bases existantes de l’équipe. Emails via transport `file`, exclusivement vers `example.test`, aucune réception SMTP externe.

Les identifiants de recette sont générés et conservés seulement dans `.cache/lot10/test-accounts.json`, à ouvrir localement ; ne pas copier ses mots de passe dans la documentation, le chat ou une capture. `owner` permet la recette profil/session ; `second` est un autre titulaire. Les messages contenant les liens de test sont dans le dossier mail ignoré indiqué par `.cache/lot10/env.json`, jamais dans les rapports. Les comptes sont fictifs et la base jetable.

### Ouvrir correctement un email local

Le transport `file` écrit un **document JSON**, pas un email affiché. Les `\n`, guillemets et échappements visibles dans le fichier brut sont sa représentation ; ils ne font pas partie de l’URL. Choisir le message correspondant à la demande (destinataire fictif et date postérieure à l’action), puis décoder le JSON et ouvrir la ligne URL complète du champ `text`. Ne pas publier ce champ, son token ou l’URL dans un rapport/capture. Ne pas reconstituer un lien avec un token extrait d’un autre message.

Sur l’environnement de recette dédié de ce lot, cette commande PowerShell ouvre le lien sans l’écrire dans la console :

```powershell
$fichier = Read-Host 'Chemin complet du message JSON correspondant à la demande'
$message = Get-Content -LiteralPath $fichier -Raw -Encoding UTF8 | ConvertFrom-Json
$liens = @($message.text -split '\r?\n' | Where-Object {
  $_ -cmatch '^http://127\.0\.0\.1:33020/(verification-email|nouveau-mot-de-passe)\?token=[A-Za-z0-9_-]{43}$'
})
if ($liens.Count -ne 1) { throw 'Aucun lien unique conforme à cet environnement de recette.' }
Start-Process -FilePath $liens[0]
Remove-Variable message, liens
```

Ce contrôle est volontairement limité à l’origine locale 33020, pas une procédure de production. Utiliser le même profil de navigateur séparé que pour la recette. La vérification d’email exige ensuite un clic explicite sur « Vérifier mon adresse email » ; le renouvellement exige la saisie et la soumission du formulaire. Ouvrir la page ne consomme aucun token. Seul le dernier message émis pour le même usage reste valable ; un renvoi remplace le précédent, et un lien utilisé ne peut pas être rejoué. Validités livrées : 24 heures pour l’email, 30 minutes pour le mot de passe. Ne pas demander plusieurs messages pendant la vérification d’un lien donné.

Le [complément de recette](lot-10-verification.md#diagnostic-des-liens-email-après-recette-utilisateur) distingue le rejet local d’un lien malformé du refus `400 TOKEN_INVALID` réellement renvoyé par l’API. Aucune correction de parsing produit n’a été nécessaire lors de cette reprise ; la cause exacte des deux URL initialement ouvertes n’est pas établie, car elles n’ont pas été conservées dans les preuves disponibles.

Pour relancer sur ces ports, conserver APP_ORIGIN=http://127.0.0.1:33020 et API_INTERNAL_ORIGIN=http://127.0.0.1:33021 au build du frontend, avec variables backend dédiées. Les helpers locaux dans le cache ne remplacent pas une procédure de déploiement et ne doivent pas être publiés avec leurs environnements.

## Limites et suites

Les détails publics questions/projets n’étant pas raccordés, les contributions du profil sont lisibles mais n’offrent pas de liens trompeurs vers un détail fixture inexistant ; une information indique cette limite. Le profil public inconnu affiche l’état introuvable après lecture API404 ; la page HTML initiale reste200 car le profil est chargé côté client. Ne pas présenter cela comme un 404 HTTP de la page.

Les aperçus existants restent isolés et doivent répondre404 en production. Les rapports des lots précédents sont historiques, pas des affirmations sur l’état courant. Les textes juridiques/confidentialité, coordonnées, signature/assets définitifs, licences, SMTP réel, HTTPS complet, systemd et Datacloud restent à valider séparément. Aucun statut prêt pour la production n’est annoncé.
