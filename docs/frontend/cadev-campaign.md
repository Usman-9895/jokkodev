# G2 — campagne publique CADEV

6 novembre 2026. Branche `feature/cadev-campaign-page`, base `origin/develop` `b06c254d5f0c8ea5f1ac37a3c3fd0b5090bad1ae` (fusion #42 vérifiée). Recette locale validée par l’équipe, puis commit, push et PR vers develop autorisés. Le code et le visuel restent ceux de la recette ; seul le statut documentaire est actualisé pour publication. Fusion et mise en ligne restent des étapes distinctes.

## Parcours et identité

Page **`/cadev`** : public et besoin, cartes JokkoHelp/JokkoProjects, exemple de brouillon commencé avec session vérifiée puis repris au retour du réseau. Actions Découvrir, Partager et Copier le lien. Aucune métrique d’usage, aucun appel au vote non vérifié ni détail d’infrastructure dans le parcours public. Les faits proviennent de la [fiche jury](../cadev-jury-package/fiche-jury.md) ; les preuves techniques restent dans le dossier de soumission.

Charte du skill jokkodev-ui-fidelity, composants Heading/Card/Brand/Button, tokens et deux thèmes existants réutilisés. Pas de maquette dédiée à cette campagne ; la planche 23 (Règles, ordinateur/mobile) a été examinée comme référence du langage des pages d’information, sans la présenter comme une maquette de campagne approuvée. Nouvelle composition soumise à relecture. Aucun changement backend, contrat, schéma, dépendance ou verrou.

URL finale canonique et partagée : **https://jokkodev.com/cadev**. L’aperçu local copie volontairement cette future URL publique ; elle n’est pas annoncée comme déjà déployée. Partage natif sur action utilisateur si disponible, sinon copie ; annulation distincte d’un succès. Copie refusée : champ en lecture seule sélectionnable et annonce accessible, sans faux succès. Aucun partage réellement envoyé à un tiers pendant la recette.

Open Graph / Twitter grande image : **https://jokkodev.com/brand/cadev-og.png**, 1200 × 630 px, **46 906 octets**. PNG rendu avec Chromium à partir du SVG horizontal validé et de la police Inter locale, sans déformation ni image IA. Empreintes SHA-256 :

- PNG : `49d65c7129a23505cc67c393758374e3030a10b9ec0e9bb43acb9f0f33e8377e`.
- Logo source `public/brand/jokkodev-horizontal.svg` : `089eed8835dfca5151a15a444ad52eef58c943b991bd911d03722ea7dda77a25`.
- Inter source `src/styles/fonts/Inter-Variable.ttf` : `29160a80ff49ddcab2c97711247e08b1fab27a484a329ce8b813d820dc559031`.

Générateur local conservé dans `.cache/cadev-campaign/generate-og.cjs` (Chromium et Playwright déjà installés), aucun outil ajouté au runtime. Droits et notices des sources : [marque/illustrations](../licenses/home-assets.md), [polices](../licenses/fonts/README.md). Ce relevé n’attribue pas de licence nouvelle au logo ou au projet.

## Concours et vidéo

**Décision de l’équipe après la première recette :** la vidéo sera refaite plus tard pour présenter les dernières fonctionnalités. G2 est livré sans vidéo et sans emplacement réservé ; la page est complète avec Découvrir, Partager et Copier le lien. L’ancienne vidéo reste conservée à son emplacement source, hors du site et de Git. La proposition d’intégration ci-dessous constitue seulement une piste pour une étape future, hors G2.

Le [règlement officiel](https://platform.systalink.com/cadev/conditions-generales) a été recontrôlé le 6 novembre : HTML client puis texte français de sa ressource publique JavaScript. L’outil web n’a pas pu ouvrir la page rendue ; aucune consultation du formulaire authentifié revendiquée. Extrait de contrôle conservé dans `.cache/cadev-campaign/official.txt`. Calendrier retrouvé : soumission 15 novembre à 17 h GMT, pairs 15 novembre 18 h → 16 novembre 23 h 59 ; vote public **17 → 20 novembre**, jury 21 → 22 novembre. Le vote public n’est donc pas ouvert à la date de cette recette et **aucun lien officiel de vote propre à JokkoDev n’est établi** : pas de bouton Voter. À reconfirmer avant une éventuelle activation, sans remplacer le vote par un lien d’inscription/parrainage.

Vidéo locale retrouvée : `D:\BUSINESS\CADEV\JokkoDev - Vidéo de présentation.mp4`, **4 722 229 octets**, durée conteneur 60 s vérifiée en G1 ; SHA-256 recontrôlé `0d903733ab89da6a0d321fcc669485fc7737576ec0bd5c033fc6497f0502af15`. Provenance connue : fichier fourni dans les ressources de l’équipe ; auteur, droits et approbation éditoriale actuels non établis par les pièces examinées. **Non copiée dans le site, non intégrée.** Si l’équipe confirme ce fichier, proposition : vidéo locale sans autoplay, `controls`, `preload="none"`, titre accessible, résumé textuel et transcription/sous-titres validés après visionnage. Ne pas annoncer cette intégration comme réalisée.

## Recette réellement exécutée

- Installation `pnpm install --frozen-lockfile` : 467 paquets. Prisma généré avec URL fictive loopback inaccessible, aucune connexion ni migration.
- **Lint, TypeScript et build complets réussis** sur le code final. `/cadev` reste statique. Premier essai d’image dynamique échoué avec le rendu de police variable ; remplacé par le PNG statique avant le build final réussi. Aucun contournement de CSP.
- **20 tests SEO/PWA réussis**, `node --test tests/seo.test.mjs tests/pwa-server.test.mjs tests/pwa-worker.test.mjs`. Le test sitemap comptait auparavant un nombre fixe de pages : attente adaptée au catalogue actuel et présence de `/cadev` vérifiée. Première exécution : 19/20, puis 20/20 après correction. Avertissement Node MODULE_TYPELESS_PACKAGE_JSON existant conservé.
- **37 assertions navigateur principales + 28 complémentaires réussies**, Chromium 148 ordinateur, profils isolés. Métadonnées rendues et URL HTTPS finales, PNG 1200 × 630, liens publics locaux 200, CSP bloquante limitée et complète Report-Only présentes, thème sombre persistant, aucun `pageerror`/incident d’hydratation observé.
- Clair/Sombre à **1440, 768, 390, 320 px** : huit captures réalisées et examinées, aucun débordement de document, boutons de copie ≥44 px, clavier Entrée et focus visibles. Réduction des mouvements demandée pour les captures, aucune animation G2 ajoutée.
- Presse-papiers réellement écrit/lu aux quatre largeurs et dans les deux thèmes ; partage non disponible → copie, refus → champ sélectionnable. Partage natif succès/annulation testé avec fonctions injectées, **pas avec une boîte de partage du système ni un appareil mobile réel**. Une première assertion lisait le statut React trop tôt : attente ajoutée au harnais puis passage complet réussi.
- Worker de production contrôlant l’aperçu, trois guides toujours préparés dans CacheStorage ; `/cadev`, les API et espaces privés absents du cache. Le périmètre fixe du lot E est inchangé : la campagne elle-même n’est pas archivée hors connexion. Les tests PWA couvrent fallback, exclusions sensibles et expiration ; pas de nouvelle coupure physique réseau ni de cycle de mise à jour A/B complet rejoué dans G2.

Les chemins de captures/logs/JSON et galerie sont dans **`.cache/cadev-campaign/verification/`**, hors Git ; scripts `browser.cjs` et `extra.cjs`, logs `lint.log`, `typecheck.log`, `build.log` dans le dossier parent. Aperçu **http://127.0.0.1:3540/cadev**, production locale, API volontairement inaccessible `127.0.0.1:1`. « Session momentanément indisponible » et erreurs de transport de session attendues : aucune authentification ou action métier validée dans cette recette. Aucun serveur d’autre projet ni Docker redémarré.

Restent ouverts : lien projet et ouverture officielle du vote, vidéo/droits/accessibilité audiovisuelle, installation/appareils physiques, Safari/Firefox, lecteur d’écran, rendu réel des cartes sur réseaux sociaux après publication, recette authentifiée et sécurité globale. Les réserves de soumission G1 restent applicables. Assistance Codex : contenu, code, image composée depuis assets, harnais et documentation ; aucun nouveau visuel génératif.

## Deux messages prêts à copier après mise en ligne

**Court :** Développeurs débutants ou confirmés : une question, une réponse, un projet à construire ensemble. Découvre JokkoHelp et JokkoProjects sur JokkoDev : https://jokkodev.com/cadev

**Continuité :** Le réseau coupe, pas ton idée : JokkoDev permet de garder un brouillon sur cet appareil et de le reprendre au retour en ligne. Trois guides préparés en ligne restent aussi lisibles hors connexion pendant 24 h. Découvre le projet DevTeranga pour la CADEV : https://jokkodev.com/cadev

Ces messages ne demandent pas de vote et ne doivent être diffusés qu’après vérification de la mise en ligne de cette route. Publication et déploiement restent distincts de cette recette.
