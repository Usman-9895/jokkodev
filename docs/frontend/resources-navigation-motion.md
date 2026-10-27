# Ressources, navigation et animations — 27 octobre 2026

Branche `feature/frontend-resources-navigation-motion`, worktree isolé `.cache/interface-polish/worktree`, base develop `8404fb7b88c82bdfe85bf9398411523973cfc942`. Aucun backend, contrat API, migration, dépendance, publication ou accès au VPS modifié par ce lot.

## Changements

- /ressources remplace la page d’attente : trois guides JokkoHelp/JokkoProjects, cinq documentations officielles, langues indiquées, sommaire et proposition de ressource via Contact. Liens vérifiés le 27 octobre : MDN, Pro Git, Next.js, NestJS, PostgreSQL. Aucun article externe copié ni fichier tiers téléchargé.
- Navigation commune : Questions, Projets, Ressources, Contact, À propos ; Administration reste conditionnée à une session ADMIN réelle. Menu compact sous 1200 px pour conserver la lisibilité avec les nouveaux liens. Même adaptation de l’en-tête administratif sur tablette. Pas de permission serveur remplacée par ce contrôle visuel.
- Pied de page : signature JokkoDev/DevTeranga, deux groupes stables Découvrir et Notre communauté, suppression du lien redondant Retour à l’accueil (logo déjà lié à l’accueil). Les cinq destinations utiles restent accessibles, cibles de 44 px et lecture en deux colonnes mobile.
- Animations : réutilisation de Reveal, apparitions courtes au défilement sur Ressources, transitions sur boutons et flèches, retour visuel sur liens des cartes. Aucun nouveau mouvement continu, parallax ou dépendance ; mode prefers-reduced-motion respecté, contenu visible sans JavaScript. Animation de logo existante inchangée.

Les derniers choix utilisateur priment sur les anciennes maquettes : Ressources n’a pas de planche dédiée, le pied de page et les liens sont volontairement réorganisés. Palette, polices, cartes et logos approuvés conservés selon le skill jokkodev-ui-fidelity. Aucune recherche ou publication collaborative de ressources n’est inventée : c’est une sélection éditoriale statique.

## Recette

Installation figée réussie après échec hors ligne (cache incomplet) ; lockfile et dépendances inchangés. ESLint frontend, compilation du client partagé, TypeScript frontend et build réussis. 104 tests Node : 103 réussis, un ignoré sous Windows pour création de symlink, aucun échec ; ce scénario était couvert sous Linux au lot conservation.

Chromium : quatre routes /ressources, /contact, /a-propos, /regles × 1440, 1024, 768, 390, 320 px, un H1, HTTP 200, sans débordement. Pied de page avec cinq liens sans doublons ; menu clavier/Échap/focus et nouvelles destinations visibles. Sessions MEMBER/ADMIN simulées uniquement dans le navigateur : huit vues contrôlées, Administration absente pour MEMBER ; en-tête admin et menu à 1024 px également contrôlés. Pas de recette d’autorisation backend nouvelle annoncée.

Sommaire et cinq liens externes, rendu sans JS, apparitions déclenchées et absence d’animations en mode réduit vérifiés. Aucune pageerror pendant les quatre routes publiques. La première capture admin 1024 montrait une mauvaise compression ; correction puis nouvelle compilation et reprise de la recette. Captures revues sur ordinateur et mobile ; preuves dans livrables/JokkoDev_InterfacePolish_20261027 du workspace de ce chat, verification.json.

Aperçu local : http://127.0.0.1:33550/ressources. Serveur de production limité à la boucle locale, API_INTERNAL_ORIGIN sur port 9 volontairement indisponible. Sans interception du navigateur de test, l’aperçu affiche donc éventuellement Session momentanément indisponible ; aucun compte réel ni service de recette n’est utilisé. Anciens aperçus et services conservés.

## Limites et validation

Validation visuelle utilisateur attendue, aucun commit/push/PR. Les animations ne prouvent pas l’ergonomie ; lecteur d’écran, appareil physique, zoom réel 200 % et ensemble des navigateurs restent à vérifier. Aucun audit de sécurité complet, nouvelle recette métier ou validation CI distante pour ce lot. La configuration du compte PostgreSQL de nettoyage sur le VPS reste en attente de la réponse utilisateur dans le chat ; aucune tâche de conservation activée par ce travail frontend.

Sources des liens externes : https://developer.mozilla.org/fr/docs/Learn_web_development ; https://git-scm.com/book/fr/v2 ; https://nextjs.org/docs ; https://docs.nestjs.com/ ; https://www.postgresql.org/docs/ .


## Complément — ancres, apparition et menu mobile

Demandes utilisateur : arrivée fluide sur les sections Ressources/Confidentialité, apparition des blocs au scroll et écart entre Connexion/S’inscrire dans le menu mobile.

Le scroll natif utilise scroll-behavior:smooth avec marge de défilement de 24 px ; aucun intercepteur de clic ne remplace les ancres, leur URL ou l’historique. En mode réduit, le défilement reste immédiat. Les éléments balisés data-reveal des pages d’information sont observés sans enveloppes qui changeraient les grilles. Reveal existant couvre l’accueil et Ressources. Entrée par fondu/déplacement vertical de 18 px en 560 ms ; une seule apparition, pas de boucle. Seuls les blocs hors de la fenêtre sont préparés après hydratation, sans masquer le contenu HTML initial. Sans JS/IntersectionObserver ou en mode réduit, contenu visible. Le focus rend immédiatement visible le bloc concerné. Le changement de préférence vers mouvement réduit retire les états en attente.

Menu compact : row-gap de 8 px, dont entre les deux liens de compte. Mesuré à 768, 390 et 320 px ; capture menu-spacing-390.png examinée.

Recette relancée : lint, build frontend, TypeScript et tests Node réussis (103/104, un symlink ignoré sous Windows). Reprise des vingt vues et huit variantes de session fictive, sans débordement. Aucun backend, contrat ou dépendance modifié.

Mesures Chromium en mouvement normal : Ressources, positions successives 10/677/884 px ; Confidentialité, 24/992/1521 px (échantillons après 40/200/1200 ms cumulés). Les deux ancres arrivent progressivement et conservent le fragment d’URL. Six blocs hors fenêtre sur accueil, Ressources, Confidentialité, À propos, Règles et Contact présentent une opacité intermédiaire strictement entre 0 et 1, puis 1 en fin d’animation. Hauteur de fenêtre 600 px pour placer réellement le bloc de Règles hors écran ; la première tentative à 900 px l’avait trouvé déjà visible, ce qui n’était pas un défaut du produit. Préférence réduite modifiée en cours de page : aucune animation active, défilement auto et contenu visible. Focus clavier sur un bloc en attente et confidentialité sans JS vérifiés. Preuves : motion-verification.json dans le dossier de captures déjà indiqué. Aucun test d’appareil physique supplémentaire annoncé.

Aucun commit, push, PR ou déploiement effectué ; aperçu local 33550 relancé uniquement pour charger ce complément.


## Publication autorisée et cohérence de la notice

Ousmane valide le lot et demande sa mise en ligne dans le chat. La publication passe par commit, push et PR vers develop ; aucune fusion automatique. La notice Confidentialité est alignée sur les captures VPS reçues : nettoyage SESSION/TOKEN activé et planifié chaque heure, délais 30/7 jours et traitement par lots ; autres catégories non activées. Cette correction descriptive ne change ni les délais ni les tâches du serveur. La première exécution manuelle avait zéro donnée éligible ; aucun effacement réel de cas éligible ni passage planifié n’est affirmé sur cette seule base.

Le présent travail publie le code pour revue ; il ne modifie pas le VPS. Le domaine ne montrera les changements qu’après fusion et déploiement de la nouvelle version par le workflow de l’équipe.
