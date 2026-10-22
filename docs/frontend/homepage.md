# Lot 2 — accueil pilote, navigation et mouvement

Branche `feature/frontend-homepage`, créée depuis `develop` mis à jour par avance rapide au commit `7ef68f6`. Le lot a été préparé sans publication, puis sa revue visuelle a été validée par l’équipe. Commit, push de cette branche et PR vers develop explicitement autorisés ; aucune fusion autorisée. Le lot 1 est réutilisé ; backend, contrat API, dépendances et verrouillage restent inchangés.

Lancer `pnpm dev:frontend` depuis la racine, puis ouvrir http://localhost:3000/. Aucun backend n’est requis pour cette démonstration. Le catalogue du lot 1 reste à `/dev/design-system`, uniquement en développement.

## Composition et composants

L’accueil est un composant serveur : hero, actions, cartes JokkoHelp/JokkoProjects, dernières questions et dates. L’ordre mobile suit la référence `JokkoDev_01_Accueil_v1.png`. Les cadres de présentation et les mentions Ordinateur/Mobile ne sont pas reproduits. Les logos compacts approuvés du lot 1 restent stables dans le header.

- `PublicHeader` : liens réels et disclosure mobile natif `details/summary`. Entrée/Espace ouvrent le menu, Tab parcourt les liens, Échap ferme et remet le focus sur le déclencheur. Ce menu n’est pas modal : pas de piège à focus. Un lien ferme le disclosure ; passer en desktop ferme le menu et déplace un focus contenu vers le lien de marque visible.
- `PublicFooter` : présentation et liens d’information. Depuis le lot 9, signature textuelle sobre « Une initiative de DevTeranga », sans silhouette utilisée comme signature. Aucun asset de signature officielle trouvé ; ce texte ne prétend pas reproduire un logo validé. Voir le [guide d’information](information-quality.md).
- `BrandIllustration` : original JokkoDev à transparence réelle, carte statique, réseau SVG et quatre médaillons indépendants. Le PNG 826 × 990 retrouvé sur le poste correspond au logo fourni ; copie binaire sans suppression de fond, étirement ou retouche. La composition est nouvelle, autorisée pour ce lot, et reste soumise à la validation visuelle.
- `ComingSoon` : pages d’attente explicites, aucun formulaire factice.

## Mouvement réutilisable

`styles/motion.css` centralise 180 ms pour les interactions et 420 ms pour les apparitions. `.jd-enter` anime un hero de 6 px ; `Reveal` ajoute `.jd-reveal-once` lors de la première intersection, déplacement 8 px. Le contenu est visible par défaut ; l’opacité initiale reste lisible, sans `opacity: 0` ou masquage durable. Il n’y a ni délai en cascade ni détournement du défilement. Les cartes ont un survol de 2 px ; les boutons conservent les états du lot 1.

Illustration : une orbite circulaire de 36 s, contre-rotation identique pour garder les pictogrammes droits ; flottement du logo de 5 s, amplitude 6 px sur ordinateur et 3 px sur mobile. La carte reste fixe. Dimensions des images réservées ; géométrie contenue dans sa scène.

La commande « Mettre l’animation en pause » conserve l’intention de l’utilisateur indépendamment du focus, du défilement et de la visibilité. `IntersectionObserver` et `visibilitychange` suspendent automatiquement le mouvement sans annuler une pause manuelle. `prefers-reduced-motion` supprime orbites, flottement et déplacements d’entrée ; la commande explique alors la préférence active. Avant hydratation ou sans JavaScript, l’illustration reste statique et le menu natif reste utilisable.

Les transitions `::details-content` du menu sont une amélioration CSS progressive. Un navigateur sans ces transitions conserve le disclosure natif ; aucune bibliothèque d’animation ajoutée.

## Destinations et données

| Destination | État actuel |
|---|---|
| `/` | Accueil pilote |
| `/questions` | Attente de consultation/recherche/réponses |
| `/questions/poser` | Attente du formulaire et des règles de session ; aucun envoi |
| `/projets` | Attente de consultation/recrutement/candidatures |
| `/connexion` | Page provisoire du socle, non fonctionnelle |
| `/inscription` | Attente ; aucun compte créé |
| `/a-propos`, `/ressources` | Présentations complètes à préparer |
| `/contact` | Contact définitif différé ; aucune adresse inventée |

Les liens des questions fictives conduisent à la page d’attente de la liste, pas à un faux détail métier. `lib/demo/home-questions.ts` isole les exemples de la maquette ; leur nature est également visible sur la page. Les dates historiques et statuts ne décrivent aucune activité réelle. Le contrat OpenAPI inspecté ne contient que live/ready : aucun endpoint inventé, aucun appel API ni type partagé modifié. Remplacer cette source via un adaptateur du futur contrat de Serge, puis implémenter séparément chargement, vide et erreur réels.

## Ressources et provenance

La silhouette Afrique est produite depuis Natural Earth 1:110m, révision et empreintes dans `frontend/public/illustrations/sources.json`. Projection équirectangulaire simple, pays africains de même remplissage, sans frontière ni libellé politique. Natural Earth déclare ses données dans le [domaine public](https://www.naturalearthdata.com/about/terms-of-use/). La carte est décorative, pas un outil cartographique.

Le PNG original pèse environ 1,28 Mo ; l’optimisation Next reste désactivée selon la décision de licences du socle. Une optimisation ultérieure requiert validation et contrôle de conservation du logo. Aucune nouvelle licence attribuée au code ou à la marque.

## Revue reproductible

`node scripts/review-home.mjs` utilise Chrome/Chromium déjà installé, un profil isolé et le protocole CDP natif de Node 24. Définir `CHROME_PATH` si le navigateur n’est pas détecté. Les ports 3000 et 9223 doivent être libres. Le script lance et arrête ses propres processus ; il ne prend pas possession d’un serveur existant. Il conserve captures et diagnostics dans `.cache/design-system/lot-2/`, ignorés par Git. Aucun paquet de test n’est ajouté.

Le harnais contrôle les vrais comportements du menu et de la pause, les liens, le mode sans JavaScript, le mouvement réduit et une orbite en temps réel à chacune des quatre largeurs. La visibilité d’onglet est simulée dans Chrome headless et reste à confirmer dans un navigateur interactif. Les tests ne remplacent pas l’examen des images.

Voir `lot-2-verification.md` pour les résultats exécutés, captures, conditions et différences restantes. La revue visuelle du lot 2 est validée ; la revue indépendante du code et toute validation de fusion restent à effectuer dans la PR.

## Complément lot16

La [commande d’animation](navigation-self-report-animation.md) remplace le texte visible par pause/lecture, sans changer les mécanismes de suspension et de réduction des mouvements. Nom accessible, title et cible44px conservés. Administration utilise la navigation principale commune sous rôle réel ; la documentation des lots initiaux ci-dessus reste historique.
