# Lot 21 — corrections prioritaires et preuves locales

## État et périmètre

Base : **`d300b0ba17fbf8d0665c26f6cad52c17ac0011a2`**, identique à `origin/develop` après fetch au début de la mission. Aucune conclusion de l’audit réutilisée sur une base différente. Branche `fix/security-audit-remediation`, worktree `D:\DEV\JokkoDev\.cache\lot21\worktree`. Dossier principal et worktree d’audit du lot 20 préservés ; manifeste de celui-ci vérifié sans modification de ses résultats historiques. Aucun commit, push, PR, commentaire, réglage GitHub, déploiement ou migration sur une base d’équipe.

Le lot corrige la frontière IP et les dépendances ciblées. Il n’ajoute ni MFA, messagerie, rôle, sanction ou fonctionnalité métier. Aucun endpoint Nest ni migration changé ; OpenAPI/types régénérés sans différence. Le nouveau 502 de relais est une erreur de transport documentée, pas une nouvelle décision métier.

## SEC20-01 : avant et après

**Avant, reproduit sur le code initial** : [before-proof.json](before-proof.json), cinq échecs 401, sixième 429, puis changement de XFF → 401. Script ciblé adapté du lot 20 uniquement pour les nouvelles destinations. Il ne faut pas le lancer comme test de réussite sur le code corrigé : il attend précisément l’ancien défaut.

**Correction** : [décision 006](../../decisions/006-proxy-ip-trust.md). Suppression du rewrite Next ; `frontend/server.mjs` traite `/api/v1` via `server/api-relay.mjs` avant de confier les autres pages à Next. Source : adresse TCP réelle, aucune adresse reçue en header n’est crue. En-têtes de relais retirés/recréés ; upstream privé fixe ; corps en flux une fois, cookies/CSRF/statuts/Retry-After conservés. Nginx garde le remplacement par `$remote_addr` et son routage API direct. Nest accepte seulement false ou IP exactes de pairs vérifiés, plus de compte de sauts ou CIDR.

| Topologie / essai | Résultat | Preuve |
|---|---|---|
| Nest direct, `TRUST_PROXY=false` | Cinq 401 puis 429 ; XFF/Forwarded forgés ne recréent pas le quota | ip-regression.json |
| Relais Node → Nest, pair exact | Même résultat pour XFF simple, valeurs multiples, chaînes et headers concurrents | ip-regression.json ; tests api-relay |
| Vrai serveur Next/Node | Même client limité, second socket 127.0.0.2 indépendant | web-ip-evidence.json |
| Nginx HTTP local → Nest | Deux vrais clients réseau Docker distincts ; chacun cinq 401 puis 429 ; variantes forgées toujours 429 | nginx-evidence.json |
| Perte de réponse upstream | Une requête, 502 générique, aucun rejeu ; signalement maintenu incertain | api-relay.test + security-proxy-outcome.test |

Les deux sources 127.0.0.1/127.0.0.2 sont des `localAddress` de connexions TCP, **pas** des identités simulées par header. Le frontal nginx 1.31.3 et ses clients Node Linux ont utilisé un réseau jetable, adresses réellement vérifiées 172.24.0.10 et .11 lors du passage final. La liaison Docker Desktop → API a été mesurée séparément : pair loopback 127.0.0.1. Aucun réseau CIDR supposé pour Nest. Images et valeurs exactes dans les preuves ; les adresses d’un rejeu peuvent différer.

Le test nginx porte sur la frontière d’en-têtes API en HTTP avec configuration dédiée représentative. Il ne valide pas le fichier TLS complet, les certificats, firewall, CDN, logs ou service SystaLink. Les conteneurs/processus du même système pouvant joindre le loopback sont dans la frontière locale de confiance ; l’isolation des ports sur cible reste impérative. **Le regroupement sous l’IP du proxy n’est pas retenu comme solution** ; les topologies avec un relais supplémentaire non identifié sont exclues jusqu’à revue.

## Conservation des parcours

Le 502 conserve le statut d’erreur sans divulguer URL d’upstream, corps ou secrets. Si une mutation a été appliquée avant la perte de sa réponse, le proxy ne peut pas l’exclure. Le message indique donc un résultat non confirmé ; le formulaire de signalement garde son état d’incertitude et son motif, sans faux reçu ni renvoi automatique. La relecture d’un signalement reste limitée par le contrat actuel. Le client conserve les statuts/erreurs déjà disponibles ; aucun jeton déplacé vers localStorage ou URL.

Corps JSON et multipart/boundary, cookies multiples, CSRF et origine interdite, redirections non suivies, Retry-After et panne upstream sont couverts par tests utiles. La configuration production exige toujours HTTPS/SMTP/Secure ; les smoke n’ont pas désactivé ces validations.

## Dépendances

[Analyse et suivi](dependances.md) : Next/plugin **16.4.0 → 16.4.2** ; famille Prisma **7.10.0 → 7.10.1**, donc deepmerge-ts **7.1.5 → 8.0.2** et mysql2 **3.15.3 → 3.24.4** via leurs parents. Aucun override, mise à jour globale, audit fix ou Prisma 8 RC. Images unoptimized et exclusion sharp/libvips conservées.

Nouvel audit : **7 → 1 avis**, résiduel high braces 3.0.3, non masqué et sans version corrigée publiée au contrôle. Audit code 1 conservé. Notices/inventaire Windows mis à jour, 469 → 467 entrées ; différences de plateforme non effacées sous couvert d’un inventaire Linux inexistant. Les réserves natives/WASM et licences système restent ouvertes.

## Environnement et contrôles exécutés

Windows, Node 24.15.0, pnpm 10.34.6, PostgreSQL 17.11 sur 127.0.0.1:55475. Deux **nouvelles** bases : `jokkodev_security21` et `jokkodev_security21_it` ; noms effectifs et zéro objet applicatif vérifiés avant migration. Aucun reset d’une recette. Stockage `%TEMP%/jokkodev-security21-avatars`, email fichier privé, comptes fictifs du seul lot 21. Le provisionnement ADMIN de test utilise la commande prévue et ce seul environnement.

| Contrôle après mise à jour | Résultat exécuté |
|---|---|
| Installation `--frozen-lockfile` | Réussie ; verrou ciblé et graphe avant/après conservés |
| Prisma validate/generate | Réussis |
| Migrations et rejeu, catalogue et rejeu | Réussis sur bases dédiées, sans migration nouvelle |
| OpenAPI/types | Réussis, aucune différence |
| Lint, TypeScript, builds backend/frontend | Réussis après changements finaux |
| Tests backend | **14 réussis** |
| Frontend/client/outillage | **99 réussis**, dont nouveaux tests proxy et incertitude |
| PostgreSQL | **123 réussis** |
| Régression IP directe/relayée | Réussie, réexécutée avec backend réel et clients TCP distincts |
| Deux modes smoke après Next 16.4.2 | Réussis : DB indisponible puis dédiée, neuf previews 404, cookies/CSRF/429/CORS/Swagger |
| Régression API dédiée | **83 assertions réussies**, dont SEC21.proxy-ip exige désormais 429 |
| Chrome 155 headless | Marqueurs échappés, connexion, retour externe refusé, HttpOnly, profil privé et effacement après logout ; pas recette manuelle intégrale de tous formulaires |
| Linux limité | **5 tests du relais réussis** dans Node 24.19.0/alpine, réseau désactivé ; nginx et clients conteneurisés réellement exécutés |

Un corps JSON incomplet a aussi été annulé sur son propre socket après un seul octet : le même relais/API reste ready 200 (`abort-evidence.json`). La limite HTML 200/API 404 est reproduite avec Next 16.4.2 sur questions et projets inconnus (`not-found-evidence.json`), pas simplement reprise de l’ancien audit.

Les 123 tests PostgreSQL couvrent les scénarios comptes, questions/réponses/solutions, projets/candidatures, modération, suppressions, photos/contacts et réputation, y compris concurrence et rollback. La passe API supplémentaire confirme droits, confidentialité, adhésion, visibilité, décodage/réencodage photo et attribution/compensation des points. Les marqueurs Chrome sont inoffensifs ; toute tentative réseau hors instance locale est bloquée. Les requêtes de l’antivirus du poste ne sont pas attribuées à JokkoDev et n’ont pas servi à tester un tiers.

Les détails et dates des commandes sont dans `checks-evidence.json`, les JSON ciblés et les logs ignorés `.cache/verification/logs`. Aucun build ou smoke antérieur à la mise à jour Next n’est utilisé comme résultat final. Les cinq tests Linux du relais ne sont ni un build Linux complet ni une validation CI.

## Incidents conservés

- Préparation initiale du harnais : remplacement trop large du chemin d’entrée privé, fichier absent ; aucune base ou migration touchée avant correction du chemin.
- Première reproduction sur Next 16.4.0 : arrêt sur avertissement `SecurityFatalError`, frontend indisponible ; seconde exécution identique reproduit SEC20-01. Logs de cette version conservés. Aucune commande de mise à jour suggérée par le message exécutée automatiquement.
- Inventaire licences : magasin par défaut différent du magasin installé ; premier échec conservé, reprise avec `npm_config_store_dir` explicite réussie, sans réinstallation ni suppression de données.
- Sonde Docker : import fs manquant dans le harnais après lecture TCP, serveur fermé en finally ; reprise corrigée établit le pair réel.
- Premier nginx : client A réussit, première tentative B reçoit 429 ; le harnais ne garantissait/enregistrait pas deux IP distinctes. Preuve initiale conservée, cause exacte de ce passage non établie par ses traces. Correction du **harnais** : deux adresses réseau distinctes explicitement allouées et vérifiées, puis nouveau passage réussi. Cela n’est pas présenté comme un défaut produit corrigé ni comme un test initial réussi.
- Lint final des scripts : règle `preserve-caught-error` signalant une cause non attachée dans le harnais nginx ; cause conservée dans l’exception, sortie publique toujours générique, puis lint et suite concernés relancés. Aucun contrôle désactivé.

## CI, limites et conclusion séparée

Lecture GitHub actualisée : quatre runs `startup_failure`, zéro job/check-run disponible ; détails et suites confirment ce statut, route de logs 404, aucune annotation de job disponible et cause non démontrée. Protections de branche : API 403, état effectif inconnu. Workflow local étendu par la régression IP sur PostgreSQL éphémère ; `contents: read`, pas de secret production, service payant ou déploiement. Aucune exécution distante déclenchée, aucun paramètre changé.

1. **SEC20-01 local** : corrigé et couvert dans les topologies prises en charge, avec séparation de vrais clients réseau. Pas de simple regroupement sous le proxy.
2. **Dépendances** : six avis retirés du graphe par mises à jour parentes ; un high braces demeure avec suivi daté. Pas de prétention à l’absence de failles embarquées.
3. **Topologie cible** : non validée. Voir [SystaLink](systalink.md) : frontal/CDN, IP réelles, ports, TLS, stockage, permissions et logs à confirmer réellement.
4. **Exposition publique** : non approuvée par ce lot. CI distante et environnement cible, contenus définitifs, licences et exploitation restent des préalables. HTML initial parfois 200 malgré API 404 conservé, sans conséquence de sécurité nouvelle démontrée. Lecteur d’écran, appareil physique, zoom réel 200 % et application complète Linux non validés.

Les changements sont laissés pour revue sans publication. L’audit historique reste dans son worktree non commité ; ce dossier contient uniquement les preuves utiles et expurgées de la correction.
