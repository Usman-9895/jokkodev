# Lot 18 — photos et contact de collaboration

Base develop **4929bd8c8707c4d7f05ac1927bf623b47ab12459**, après fusion Git de #28, ancien dossier propre. Branche `feature/profile-photo-collaboration-contact`. #19 (`75c34d36422b9c2077c72c747c6bda8f63fe6916`) n’est pas ancêtre. Aucun commit, push, PR, fusion, déploiement ou migration sur une base de l’équipe. Validation fonctionnelle d’Ousmane attendue.

## Modèle et contrat

Voir la [décision 005](../decisions/005-profile-photo-collaboration-contact.md). Migration additive `20261022050000_profile_photo_contact` : `User.avatarKey` nullable unique, `Profile.collaborationContact` nullable et `collaborationContactEnabled=false`. Aucune migration partagée réécrite, aucune donnée supprimée. Pas de photo de compte tiers par mutation : l’identité vient exclusivement de la session.

| Opération sous /api/v1 | Résultat |
| --- | --- |
| POST /users/me/photo, multipart `file` | 200 `{photoUrl}`, session et CSRF, un fichier ≤2 Mio |
| DELETE /users/me/photo | 200 `{photoUrl:null}`, session/CSRF, retrait idempotent |
| GET /users/photos/:key | JPEG réencodé uniquement, clé encore référencée ; sinon 404, ou503 si stockage non configuré |
| GET /users/me | Réglages privés du contact, en plus du profil propriétaire |
| PATCH /users/me | Champs de contact absents : conservés ; null : effacement et désactivation ; partage activé : contact valide requis |
| GET /projects/:id/members/:userId/contact | Lecture privée conditionnelle, `{contact:null}` si absent/désactivé ; 404 si projet/participation indisponible |

NestJS est la source des changements OpenAPI ; types régénérés par `pnpm api:generate`. Le multipart réutilise le client partagé et le CSRF en mémoire, sans Content-Type imposé : le navigateur produit la boundary. JSON, erreurs structurées et Retry-After sont conservés. Aucun rejeu de mutation. Le proxy Next.js existant transmet le multipart ; seule la route photo a une limite nginx élargie à 2112 Kio. Les parseurs JSON restent à 64 Kio.

## Images et stockage

Décodage réel JPEG, PNG et WebP, indépendamment du nom/MIME client. SVG, GIF, documents et images animées refusés. Taille 2 Mio, dimensions ≤4096 px et ≤4 millions de pixels avant décodage. Worker jetable, un traitement par processus, heap V8 borné, délai 8 secondes ; la mémoire linéaire WASM possède sa propre borne128 Mio. Le descripteur de mémoire du module chargé est borné avant instanciation, sans modifier les fichiers installés ; un test tente réellement un dépassement. Les dimensions sont aussi contrôlées avant et après décodage. Orientation EXIF, recadrage central et rééchantillonnage bilinéaire, alpha composé sur blanc, JPEG 256×256 réencodé sans métadonnées. Original non conservé ou servi.

`jpeg-js@0.4.4`, `pngjs@7.0.0`, `wasm-webp@0.1.0`, types pngjs : [notices et provenance](../licenses/profile-photos/README.md). libwebp 1.3.2 de l’archive vérifié à l’exécution, aucune dépendance native ajoutée, sharp/libvips toujours exclus. Deux alternatives écartées sont documentées. L’inventaire Windows passe de 465 à469 entrées et de599 à603 notices : toutes les599 anciennes sections restent présentes. Les changements de fins de ligne du collecteur expliquent une partie du diff de notices. Cela ne tranche pas la conformité CADEV ni les composants système.

`AVATAR_STORAGE_DIR` est absolu, facultatif : absent, l’import est indisponible. En production il doit être hors du répertoire courant de livraison. Utiliser un répertoire durable dédié, par exemple `/var/lib/jokkodev/avatars`, propriétaire du compte API, droits0700, fichiers0600 ; pas de root HTTP public, pas de nom fourni par le client, pas d’URL distante téléchargée. Le modèle systemd prépare StateDirectory/ReadWritePaths correspondant ; adapter ce chemin et le montage à l’environnement cible, sans assouplir ProtectSystem. Un répertoire sur volume persistant doit rester accessible après changement du lien `current`.

Nouvelle clé `jd-<32hex>.jpg` écrite exclusivement avant la transaction DB. Le remplacement prend un verrou User, puis l’ancien fichier est retiré après confirmation DB ; une erreur avant commit conserve l’ancien réglage. Échec de nettoyage : événement technique sans chemin, identité ni contenu privé, fichier orphelin éventuel. Lecture no-store et clés nouvelles à chaque remplacement : ancien cache non réutilisé durablement ; anciennes clés non référencées refusées. Avatar partagé avec dimensions réservées, cadrage carré et initiales si absent ou si chargement échoue.

Nettoyage manuel : depuis backend, `pnpm photos:cleanup --confirm-dir <répertoire absolu configuré>`. Il ne parcourt aucun sous-dossier, ignore symlinks, noms étrangers et fichiers de moins de24h ; il vérifie chaque clé non référencée avant retrait. Répertoire exclusivement réservé aux avatars gérés. Aucune exécution de nettoyage contre un stockage de l’équipe pendant ce lot.

Sauvegarder **PostgreSQL et ce répertoire** : la sauvegarde DB seule n’inclut pas les photos. Organiser un point cohérent en maintenance des écritures, conserver les deux ensembles et tester une restauration sur destinations jetables. Ne pas exécuter de rétention sur les sauvegardes existantes. Le choix de volume, quotas, sauvegarde atomique/cohérente, restauration et droits effectifs systemd/nginx restent à valider sur Linux et l’environnement cible. Aucun service payant ajouté.

## Confidentialité du contact

Email de collaboration ou URL HTTPS sans identifiants, longueur2048 au plus (email254), sans caractères de contrôle, backslash, javascript: ou data:. URL normalisée ; aucun téléchargement ni aperçu externe. Le contact ne reprend jamais l’email de connexion et reste séparé des liens professionnels publics.

Le titulaire active explicitement : « Ce contact sera accessible aux responsables et membres des projets auxquels tu participes. » Il peut modifier, désactiver ou effacer. Le serveur vérifie à chaque lecture, dans un même snapshot SQL, que demandeur et titulaire sont responsable/membres effectifs d’un projet visible non supprimé ; le titulaire doit être actif. Un candidat PENDING/REJECTED/WITHDRAWN sans adhésion n’a aucun accès. ADMIN n’obtient aucun droit général. Projet fermé au recrutement mais actif : les collaborateurs restent autorisés.

Les coordonnées ne sont ni dans les profils/projections publics, ni dans les erreurs ou journaux. Pas de cache partagé, lecture privée sensible à la révision de session, données du dialogue effacées à sa fermeture ou au masquage d’onglet, composants démontés après déconnexion. Une coordonnée déjà lue par une personne ne peut matériellement pas être effacée de sa mémoire ; la désactivation révoque les lectures ultérieures, sans mécanisme temps réel prétendu.

## Interface et recette

Maquettes13/14/12/18 examinées en ordinateur/mobile, charte et composants existants conservés. Ajouts adaptés au besoin produit, sans nouvelle maquette dédiée : commandes photo dans la carte de profil ; contact privé dans une section distincte ; bouton Contacter dans les membres et candidatures acceptées ; dialogue accessible avec focus initial Fermer, Tab/Échap et retour au déclencheur. Pas de messagerie ni email automatique. Photos synthétiques uniquement, aucun portrait personnel de l’équipe.

Environnement Windows, Node24.15, pnpm10.34.6, PostgreSQL17.11 sur127.0.0.1:55475. Bases **jokkodev_lot18** et **jokkodev_lot18_it** neuves et vérifiées zéro objet avant migration. Comptes fictifs owner/member/other/admin, administrateur provisionné par la CLI existante dans cette base uniquement. Stockage jetable dédié dans le répertoire temporaire de la machine, distinct du dépôt ; ne pas employer ce chemin de recette pour la production.

| Vérification exécutée | Résultat |
| --- | --- |
| Installation figée, Prisma validation/génération | Réussis |
| Migrations/rejeu, catalogue/rejeu | Réussis sur bases dédiées |
| Génération, lint, TypeScript | Réussis |
| Tests backend |13 réussis |
| Frontend/client/outillage |93 réussis |
| Intégration PostgreSQL |102 réussis |
| Builds frontend/backend isolés | Réussis |
| Deux modes smoke | Réussis, neuf aperçus404 |
| Recette API via proxy réel | Trois formats, session, acceptation réelle, contact, refus tiers/ADMIN, révocation et absence de fuite publique réussis |

Les tests Node à transport simulé sont distingués des vrais HTTP/PostgreSQL et de Chrome. Premiers incidents conservés : typages de fixtures image et globals lint corrigés ; un ancien test exact de CurrentUser devait inclure photoUrl=null (101/102 au premier passage, puis102/102) ; premier appel du pilote avant readiness refusé par le proxy, aucun compte créé ; reprise après readiness ; pilote de connexion ADMIN envoyant des champs non autorisés corrigé, comptes existants conservés. Erreurs de sélecteur/sérialisation DOM du pilote Chrome corrigées sans modification produit ni nouvelle suppression de donnée.

## Accès local et limites

Site **http://127.0.0.1:33100**, API/readiness `http://127.0.0.1:33101/api/v1/health/ready`. Employer cette origine exacte. `/espace/profil` pour importer/régler le contact, `/profils/<id>` pour le public, `/projets/<id>` pour les membres, `/espace/candidatures` et `/espace/candidatures?vue=recues` pour les acceptations. Les identifiants des projets/questions dédiés sont dans le fichier de recette.

Comptes : ouvrir **localement** `.cache/lot18/test-accounts.json` ; aucun mot de passe ni token dans cette documentation ou les captures publiées. Ne pas servir ce fichier sur HTTP. Les clés owner/member/other/admin et projects.active/pending/hidden/deleted identifient les scénarios ; active reste utilisable pour validation, hidden/deleted sont volontairement indisponibles. member est accepté sur active, toujours en attente sur pending. other et ADMIN ne participent pas au projet actif.

Preuves, captures, journaux et paramètres sensibles restent dans `.cache/lot18/`, ignorés. Recette Chrome et contrôle de persistance détaillés dans le complément final ci-dessous. Aucun test distant ou HTTPS de production déduit de ces contrôles HTTP locaux. Linux, lecteur d’écran, appareil physique et zoom réel200% non validés. HTML initial parfois200 malgré API404, limite de streaming conservée. Contenus définitifs, licences globales et environnement cible restent à valider. Teranga Points exclue. Production non validée.

## Complément final de recette

Douze groupes Chrome réussis, aucune exception JavaScript relevée : profils aux quatre largeurs, aperçu/import/remplacement/retrait/rechargement et header, contact sauvegardé, accès effectif et confirmations, clavier/Tab/Échap/retour, candidatures acceptées, déconnexion mobile réelle, ADMIN non participant, contact vide/désactivé par défaut et fallback aux initiales après erreur image. Une réponse a été retenue puis l’envoi interrompu après écriture réelle : incertitude, une seule mutation, lecture privée, abandon de l’aperçu et affichage de l’image effectivement enregistrée. Le premier pilote ciblait un bouton de déconnexion masqué dans le header mobile ; ouverture réelle du menu et sélection du bouton visible corrigées, sans changement produit.

La référence et les octets de photo ont été conservés après redémarrage contrôlé du seul backend de recette. Le frontend de ce lot a aussi été relancé pour son build final ; seuls les PID identifiés du lot18 ont été arrêtés. Le décodeur borné a ensuite été utilisé réellement via le proxy, sortie JPEG256 vérifiée. Le réglage de contact et les refus de tiers/ADMIN ont été relus. Les services antérieurs répondent200 ; ils n’ont pas été arrêtés ou redémarrés.

Captures dans `.cache/lot18/screenshots/` : `lot18-profile-{1440,768,390,320}.png`, `lot18-project-{1440,768,390,320}.png`, `lot18-contact-{1440,768,390,320}.png`, aperçu320, interruption390, profil public1440, question390, candidature acceptée390, initiales après erreur390 et contact désactivé320. Les captures locales ne sont pas ajoutées au dépôt. Contrôles visuels et largeurs ne prouvent pas un zoom navigateur réel200%.

Durcissement de la validation : une URL dont la forme HTTPS normalisée dépasserait2048 caractères est refusée400 au lieu d’atteindre la limite SQL. Le test utilise une URL Unicode de synthèse. La borne mémoire WASM a nécessité une correction du type BufferSource dans son test, sans cast ni assouplissement. Les traces des contrôles intermédiaires restent locales.

## Résultat final et incidents conservés

Derniers contrôles :13 tests backend,93 frontend/client/outillage et102 PostgreSQL réussis ; génération sans différence, lint, TypeScript et builds réussis. Un passage pendant d’autres contrôles lourds avait obtenu93/102 et9 HTTP500 sur des scénarios existants. La suite relancée seule a obtenu102/102, sans modification d’assertion ni désactivation de protection. La cause des500 n’est pas démontrée ; ne pas présenter la concurrence des contrôles comme une explication établie. Traces conservées dans `.cache/lot18/logs/integration-before-isolated.log` ; tests de charge et budgets de production restent à effectuer.

Les deux modes smoke ont été réexécutés avec un build final séparé, proxy cohérent sur33110/33111 et PostgreSQL dédié opt-in : tous deux réussis, neuf aperçus404. Ces serveurs temporaires sont arrêtés. La CI distante n’a pas été déclenchée et aucun contrôle Linux n’est déduit de ces résultats Windows.

Recette laissée active : frontend PID52264 sur33100, backend PID44160 sur33101. Les autres services33070/33071/33080/33081/33090/33091 répondent200 et sont préservés. Les ports Chrome9293 et smoke33110/33111 sont fermés. Images examinées : profil ordinateur1440 et mobile320 après l’ajustement final, profil390, dialogue contact320, projet768, fallback390 et candidatures390. Le sélecteur de fichier natif abrège son texte à320 sans débordement de page ; clavier et sélection restent utilisables.

Audit final :67 fichiers modifiés/nouveaux, index vide, sources identiques à la recette exécutée, contrat stable, aucun secret détecté dans le diff. Les fichiers de comptes, emails, stockage, caches, journaux et captures restent hors Git. Les sources restent locales pour validation fonctionnelle ; aucune publication, migration d’équipe ou opération de production effectuée.

## Incident de connexion après livraison de la recette

Le 22 octobre 2026, le frontend33100 répondait encore, mais le backend33101 n’écoutait plus et son ancien PID44160 était absent. Le proxy renvoyait HTTP500 avec `ECONNREFUSED` vers127.0.0.1:33101, ce qui expliquait le message générique de connexion. Les journaux disponibles ne démontrent pas la cause de l’arrêt du processus. Aucun changement de mot de passe, de compte ou de protection CSRF n’a été nécessaire.

Après vérification de la configuration existante (origine127.0.0.1:33100, base dédiée `jokkodev_lot18` sur127.0.0.1:55475), seul le backend absent a été relancé : nouveau PID25684, même snapshot et même stockage. Aucune migration ni réinitialisation. Le frontend PID52264 et les services antérieurs ont été préservés.

Vérifications réellement exécutées après relance : connexion et lecture de session HTTP200 pour les quatre comptes fictifs, déconnexion204 et nouvelle acquisition CSRF200 ; connexion via le formulaire Chrome pour propriétaire et membre, puis profil privé accessible après rechargement. Les deux ports du lot18 et les six ports des recettes antérieures répondent200. Le Chrome temporaire de diagnostic a été fermé. Preuves locales sans secrets dans `.cache/lot18/login-diagnostic.json` et `.cache/lot18/login-browser-diagnostic.json`. Aucun code applicatif n’a changé pour cet incident ; les suites précédentes ne sont pas présentées comme réexécutées.
