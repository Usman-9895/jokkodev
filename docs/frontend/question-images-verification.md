# Captures JokkoHelp — résultats locaux

Lot local préparé le 13 novembre 2026. Branche `feature/jokkohelp-question-images`, worktree `D:\DEV\JokkoDev\.cache\question-images\worktree`, depuis `origin/develop` à jour au SHA `860dc55185568b811dc93828f637e28189b76a91`. Aucun commit, push, PR, migration de production ou déploiement de ce lot. Les consignes AGENTS, README, décisions avatars/F2 et le skill `jokkodev-ui-fidelity` ont été appliqués. Le contrat NestJS puis OpenAPI/client ont été régénérés par `pnpm api:generate`.

## Environnement vérifié

Node 24.15.0, pnpm 10.34.6, Windows ; dépendances installées avec `--frozen-lockfile`. PostgreSQL 17.11 dans le conteneur dédié `jokkodev-question-images-postgres`, adresse **127.0.0.1:5474**, base **jokkodev_question_images**. Destination et schéma public vide contrôlés avant les douze migrations versionnées, dont `20261114090000_question_images`. Les intégrations utilisent des schémas temporaires distincts, supprimés par le harnais. Le catalogue seul a été chargé pour l’aperçu ; comptes, images et emails de recette sont synthétiques et restent hors du lot, dans le runtime privé local. Aucun envoi SMTP.

L’API et le frontend de l’aperçu écoutent respectivement sur 3081 et 3080. Aucun fournisseur OAuth réel ni ressource de production utilisé. Les aperçus des autres worktrees n’ont pas été arrêtés.

## Contrôles exécutés

| Contrôle | Résultat observé |
|---|---|
| Installation figée, génération Prisma et `pnpm api:generate` | Réussies ; aucun ajout de dépendance ni changement de lockfile |
| `pnpm lint` | Réussi |
| `pnpm typecheck` | Backend, client et Next.js réussis |
| `pnpm build` | Backend, client et frontend réussis |
| `pnpm test` | Backend : 50 réussis ; scripts/frontend/HTTP : 149 réussis, un scénario existant ignoré car la création de symlink est indisponible pour ce compte Windows |
| Intégrations ciblées PostgreSQL | 87 réussies, zéro échec : captures, publications idempotentes, questions, avatars/contact, conservation, contraintes DB et modération |
| Reprise ciblée captures après ajout d’un scénario de conservation | Cinq réussies, dont le scénario supplémentaire vérifiant le retrait physique seulement après `retentionErasedAt` ; 88 scénarios d’intégration distincts couverts au total |
| `pnpm test:smoke` après build | Réussi sur 3084/3085 ; pages, relais, santé, absence de session, CSRF et validation, aperçus/Swagger interdits en production. Serveurs de smoke arrêtés |
| Sauvegarde fichiers sous Linux jetable | Création chiffrée, SHA-256, déchiffrement/extraction, comparaison avatars/captures, exclusion `.env` et refus d’un symlink réussis, sur fixtures et clé jetables. OpenSSL 3.5.9 dans ce conteneur de test |
| `pnpm licenses:inventory` | 470 dépendances et 604 notices ; aucun nouveau paquet ni licence GPL/LGPL/AGPL signalée. L’alternative existante `type-fest` MIT/CC0 reste identifiée dans l’inventaire ; les notices des codecs du lot avatars restent conservées |
| Recette Chromium sur le code final | 30 contrôles réussis ; aucune erreur JavaScript non interceptée observée |
| `git diff --check` | Réussi ; index laissé vide |

Le scénario Windows ignoré concerne le refus de symlink de la rétention des copies hors serveur, pas la lecture des captures. Le nouveau script de sauvegarde a bien été testé avec un symlink dans le conteneur Linux. Aucun résultat de recette n’est présenté comme un contrôle GitHub Actions : cette branche n’est pas publiée.

## Cas réellement vérifiés

Les vrais endpoints et PostgreSQL ont vérifié la préparation privée et le refus pour un tiers/anonyme ; la lecture publique après publication ; la création avec trois PNG/JPEG/WebP ; le refus de quatre captures, doublons, fichier > cinq Mio, faux PNG, contenu corrompu, dimensions excessives et images animées ; le réencodage JPEG et le cadrage conservé ; CSRF, propriété et suspension ; modification, ajout, ordre et retrait sans altération du texte ; impossibilité de réutiliser une capture publiée sur une autre question ; URL directe refusée après retrait, masquage et suppression, y compris pour l’auteur. La contrainte SQL de position est vérifiée. Les avatars ont passé leur recette de régression sur les trois formats.

La publication concurrente avec une même clé retourne un seul identifiant. Le changement des identifiants de captures provoque un conflit d’empreinte ; l’empreinte historique texte est inchangée en l’absence du nouveau champ. Un reçu rejoué ne rétablit pas une capture ou une question retirée. Le nettoyage a été simulé sans modification, puis exécuté sur des fichiers et lignes de test : expirées/orphelins retirés, fichier récent et question simplement supprimée conservés, puis capture éligible retirée après traitement de conservation. Une préparation privée constitue bien une dépendance empêchant l’effacement automatique de son compte.

Dans Chromium, un compte synthétique s’est connecté par mot de passe, a rempli le formulaire, préparé une capture puis enregistré un brouillon contenant uniquement du texte. La coupure réseau conserve l’éditeur et empêche import/mise en attente avec capture. Le retrait volontaire au clavier débloque la mise en attente texte ; IndexedDB a été inspecté pour vérifier l’absence de fichiers, URL et `imageIds`. Le retour réseau ne publie rien. L’attente a été retirée explicitement, puis une publication avec capture a été envoyée : la réponse a été volontairement perdue **après le commit**, le formulaire est resté figé, et le clic de reprise a envoyé exactement la même clé et le même payload, sans doublon. La galerie, l’agrandissement par Entrée, l’ajout/retrait en modification et le refus de l’ancienne URL ont été vérifiés. Tab atteint le retrait et son focus visible d’au moins deux pixels a été contrôlé.

## Visuel et aperçu laissé disponible

Référence consultée : maquette 04 « Poser une question » et notes série 01. Structure, composants et tokens existants conservés ; le nouveau champ demandé est une extension de cette référence, sans revendication de fidélité pixel parfaite. Captures réelles examinées : formulaire clair/sombre **1440×1000**, clair/sombre **390×1000**, intermédiaire clair **768×1000**, et détail complet ordinateur. Polices chargées avant capture, absence de débordement horizontal contrôlée aux trois largeurs. L’aide technique détaillée est repliable pour conserver la lisibilité mobile ; la confidentialité et le retrait nécessaire avant attente restent affichés.

- Aperçu public laissé disponible : **http://localhost:3080/questions/01a1d6ef-09f1-760c-892a-d4be9a331d58**.
- Éditeur : **http://localhost:3080/questions/poser** (session locale requise).
- Pour ouvrir un navigateur de recette isolé déjà connecté au compte synthétique local, sans afficher d’identifiants : `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\DEV\JokkoDev\.cache\question-images\ouvrir-apercu.ps1"`. Ce lanceur local utilise Chromium/Playwright déjà présents sur le poste ; il reste hors du lot et n’utilise pas le profil personnel du navigateur.
- Artéfacts locaux non committés dans le dépôt racine : `.cache/question-images/screenshots/`, `browser-report.json`, `unit.log`, `integration.log`, `images-final.log`, `smoke.log`, `build.log`, `code-evidence.json`. Le fichier privé de runtime n’est ni livré ni affiché.

L’empreinte SHA-256 du manifeste des 32 fichiers fonctionnels/configurations concernés est `4e98e2c92b9f209137b28fec47ef0865a5e08ae025db62884cb92e5c226e4142` ; elle est conservée localement pour comparer le code aux preuves. Elle n’est pas un SHA de commit.

## Limites et revue restante

La copie en ligne avec captures est figée en mémoire pour la reprise dans l’onglet ; elle ne devient pas une attente persistante avec images. Après fermeture ou crash, vérifier Mes questions avant une nouvelle demande. Les brouillons et attentes F1/F2 restent strictement texte.

Recette faite sur Chromium Windows, avec images synthétiques. Aucun téléphone physique, Safari/Firefox, test de charge, audit d’accessibilité exhaustif, nginx/systemd réel ou sauvegarde de production n’a été utilisé. Les modèles d’exploitation restent à adapter et autoriser séparément : dossier durable, rôle migrateur/droits applicatifs, droits de lecture des nouveaux fichiers 0600 par la sauvegarde, frontière DB/fichiers sans écriture, copie hors serveur et planification du nettoyage. Aucun secret, compte de recette ou capture locale n’appartient au diff proposé.

Les [étapes de recette manuelle et d’exploitation](../operations/question-images.md#recette-manuelle) sont fournies pour la revue Ousmane/Serge. Après cette recette locale, Ousmane a validé la publication du commit et d’une PR hors brouillon vers develop. Les états « aucun commit/PR » ci-dessus décrivent la préparation de recette ; fusion et déploiement restent distincts et ne sont pas exécutés ici.
