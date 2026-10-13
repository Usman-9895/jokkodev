# Lot 2 — vérifications et revue de l’accueil

Date : 13 octobre 2026. Branche : `feature/frontend-homepage`, depuis `develop` à `7ef68f6` après récupération du distant et avance rapide. Dossier initial propre. Revue réalisée avant tout commit, push ou PR du lot 2, puis validée explicitement par l’équipe. Commit, publication de la branche et PR vers develop autorisés ; fusion et fusion automatique non autorisées. Backend, package API, dépendances et verrouillage inchangés.

## Contrôles exécutés

- `pnpm exec eslint frontend scripts/review-home.mjs` : réussi sur le code final.
- `pnpm --filter @jokkodev/frontend typecheck` : réussi. Le build final a également terminé sa compilation TypeScript.
- `pnpm --filter @jokkodev/frontend build` : réussi après les corrections visuelles, sans téléchargement de police.
- `node scripts/review-home.mjs` : dernière exécution complète réussie, code zéro. Contrôles HTTP et comportements réels dans Chrome isolé ; aucun paquet de test installé.
- Vérification HTTP du build production : accueil, huit destinations publiques et assets PNG/SVG à 200 ; catalogue `/dev/design-system` à 404. HTML initial avec texte et données de démonstration, illustration en pause avant hydratation.
- Copie du PNG original : identité binaire et SHA-256 conservées dans la provenance. Transparence alpha réelle vérifiée ; aucune suppression artificielle de fond.
- Vidéo WebM relue dans Chrome : 390 × 844, lecture avançant de 2,02 à 3,85 secondes, puis pause. Un frame a été décodé et examiné.

## Conditions et captures

Chrome 155.0.8059.40, profil dédié sans données personnelles. Le navigateur connecté était indisponible ; utilisation de Chrome installé en mode headless avec CDP natif. Fenêtres CSS redimensionnées, sans prétendre émuler un appareil physique.

| Fenêtre demandée | Largeur utile avec scrollbar Windows | Capture initiale |
|---|---|---|
| 1440 × 1000 | 1425 px | home-1440.png |
| 768 × 1024 | 753 px | home-768.png |
| 390 × 844 | 375 px | home-390.png |
| 320 × 800 | 305 px | home-320.png |

Les captures du rendu final ont été ouvertes et examinées, avec Inter et Source Serif 4 effectivement chargées et les images décodées. JetBrains Mono reste disponible dans les fondations ; l’accueil ne contient pas de code nécessitant son chargement. Aucun débordement horizontal observé.

État initial déterministe : pause manuelle, puis temps zéro des seules animations continues via l’API native du navigateur. Les apparitions ont été laissées terminer. La commande affiche donc « Reprendre l’animation » dans ces captures ; elle affiche « Mettre l’animation en pause » pendant le fonctionnement normal. Aucune maquette n’est affichée comme image d’interface.

Preuves dans `.cache/design-system/lot-2/`, ignorées par Git :

- `home-1440.png`, `home-768.png`, `home-390.png`, `home-320.png` : composition complète.
- `menu-390.png`, `menu-320.png` : menu et focus clavier.
- `orbit-1440.png`, `orbit-768.png`, `orbit-390.png`, `orbit-320.png` : états en mouvement.
- `illustration-390.webm` : extrait d’environ six secondes, encodé par MediaRecorder natif depuis les frames CDP du navigateur réel.
- `illustration-motion.html` : replay autonome des frames d’une orbite de 36 secondes, avec commande de pause ; pas un second écran produit.
- `video-frame.png`, `video-checks.json` : lecture et décodage du WebM examinés.
- `reduced-motion-390.png`, `no-javascript-390.png` : états complémentaires avec navigation/focus ; ne pas les utiliser comme état initial de comparaison.
- `checks.json`, `orbit-checks.json`, `production-checks.json` : résultats et conditions du harnais.

## Comportements vérifiés

À chaque largeur, une orbite de 36 secondes a réellement fonctionné, avec 117 mesures de position sur le dernier passage. Les quatre médaillons restent dans la scène et ne touchent pas le texte ou les actions ; aucune inclinaison résiduelle des pictogrammes mesurée. Les captures en cours de mouvement et la vidéo complètent ces mesures. Le temps total du scénario à 390 px est plus long car il inclut l’encodage vidéo après l’orbite.

Menu mobile : ouverture avec Entrée, état annoncé, Tab vers Questions, fermeture par Échap et focus rendu au summary, liens fermant le menu, navigation vers la page d’attente et fermeture au passage desktop avec focus sur la marque visible. Les liens cachés du disclosure fermé sont exclus du parcours Tab. Le menu reste natif et fonctionne sans JavaScript.

Pause : commande activée, focus déplacé avec Tab, transformation inchangée après attente ; pause conservée après sortie/retour dans la zone visible. Reprise explicite, suspension automatique hors champ puis reprise automatique uniquement sans pause manuelle. Une fenêtre supplémentaire 390 × 400 a servi au test hors champ, car la page peut rester partiellement visible dans une grande fenêtre.

Visibilité d’onglet : gestionnaire vérifié avec un événement `visibilitychange` et `document.hidden` simulés ; conservation de la pause manuelle au retour. Ce scénario ne remplace pas un changement d’onglet dans une UI de navigateur interactive.

Mouvement réduit émulé : animations continues supprimées, commande désactivée avec explication, aucune entrée avec déplacement. Test sans JavaScript effectué séparément avec préférence de mouvement normale : illustration statique, contenu présent et menu utilisable. Aucune exception JavaScript ou requête `/api/v1` observée pendant la revue.

## Corrections apportées

Le hero initial était trop haut ; illustration et hiérarchie ont été ajustées. Les cartes mobiles utilisent désormais une action compacte à droite, nom accessible conservé et cible de 44 px. Titre sur deux lignes à 320 px avec taille adaptée, sans troncature. Les statuts passent sous le texte à cette largeur pour préserver les contenus.

Le premier rayon mobile ignorait les 15 px de scrollbar Windows et provoquait un léger débordement pendant l’orbite à 320 px. Il a été corrigé, puis les quatre orbites complètes ont été recontrôlées. L’espace de la commande est réservé avant hydratation pour éviter un déplacement lié à son apparition.

Le harnais a aussi été corrigé : attente de fin de révélation, événement Entrée natif complet, attente de compilation de destination, viewport réellement capable de masquer la scène, séparation des préférences pour tester sans JavaScript. Un problème de nettoyage du navigateur de lecture vidéo a été corrigé ; la relecture finale et l’arrêt ont réussi. Ces corrections ne remplacent pas un résultat manquant par un succès.

## Différences et limites

- La signature officielle DevTeranga n’est pas disponible : nom typographique et silhouette décorative provisoires, à remplacer par un asset validé. Le logo central JokkoDev utilise bien l’original fourni.
- Les questions, statuts et dates sont fictifs, isolés dans `lib/demo/home-questions.ts` et signalés sur l’accueil. Les destinations métier sont des pages d’attente ; aucune authentification ou publication de données.
- Commande de pause et mention de démonstration ajoutées par rapport à la maquette. Les cibles de 44 px et le reflow rendent certaines sections plus hautes ; retours à la ligne et dispositions adaptés aux petites largeurs.
- Questions n’est pas artificiellement sélectionné dans la navigation de l’accueil ; l’état actif correspond à la vraie destination `/questions`.
- Carte issue de Natural Earth et réseau construits pour ce lot : composition approchée, pas une extraction Figma ni une revendication pixel perfect. La charte prime sur les nuances du PNG.
- Appareils physiques, lecteurs d’écran, Safari/Firefox, Linux et audit WCAG exhaustif non testés. Visibilité d’onglet et mouvement réduit simulés comme précisé ci-dessus.

Serveurs et navigateurs de revue arrêtés. Pour examiner : `pnpm dev:frontend`, puis http://localhost:3000/. La revue visuelle est validée ; les contrôles réussis sont réutilisés pour la publication, sans changement du code depuis leur exécution. La revue indépendante du code et toute validation de fusion restent à effectuer dans la PR.
