# Lot 1 — vérifications et revue visuelle

Date : 13 octobre 2026. Branche : feature/frontend-design-system, depuis develop. Lot limité aux styles, assets, composants communs et catalogue local. La revue a été réalisée avant tout commit, push ou PR, puis validée explicitement par l’équipe. Publication de la branche et PR vers develop autorisées ; fusion non autorisée. Backend et contrat API inchangés ; aucune dépendance ajoutée.

## Contrôles exécutés

- `pnpm exec eslint frontend` : réussi.
- `pnpm --filter @jokkodev/frontend typecheck` : réussi.
- `pnpm --filter @jokkodev/frontend build` : réussi, avec les trois polices locales ; aucun téléchargement de police au build.
- `GET /dev/design-system` après lancement production : 404 confirmé.
- Identité binaire des SVG et empreintes Git des polices : comparées aux sources officielles/validées, identiques. Les notices OFL sont conservées.
- Vérifications navigateur et captures du catalogue de développement : réalisées avec Chromium isolé, Chrome 155.0.8059.40. Le navigateur connecté n’était pas disponible ; aucune dépendance de test n’a été ajoutée au projet et aucun profil de navigation personnel n’a été utilisé.

## Dimensions et captures

| Vue contrôlée | Fenêtre CSS | Résultat |
|---|---|---|
| Ordinateur | 1440 × 1000 | Deux colonnes, marque claire/sombre, toutes les sections examinées |
| Intermédiaire | 768 × 1024 | Retour à la ligne des contenus et ressources, aucun débordement de page |
| Mobile | 390 × 844 | Une colonne, boutons fluides, labels/aides/erreurs visibles |
| Petit mobile | 320 × 800 | Contenus et boutons longs non tronqués, logos réorganisés |
| Reflow à échelle 2 | 720 × 500 CSS, facteur 2 | Équivalent de reflow d’une fenêtre 1440 × 1000 à 200 %, sans débordement ; ce n’est pas un test du menu Zoom d’un navigateur physique |

Ces dimensions sont les conditions de revue choisies, pas des mesures originales Figma. La barre de défilement Windows réduit la largeur disponible à 1425 et 753 px sur les deux vues desktop ; cette largeur a été prise en compte pour mesurer les débordements.

Captures et diagnostics locaux dans `.cache/design-system/lot-1/`, ignorés par Git :

- desktop-1440.png, tablet-768.png, mobile-390.png, mobile-320.png : pages complètes.
- Fichiers *-top.png : détail marque et typographie.
- desktop-cards.png, mobile-cards.png : cartes et badges comparables aux éléments de l’accueil.
- desktop-button-hover-focus.png, keyboard-skip-link.png : survol et vrais focus clavier.
- desktop-field-error-focus.png, mobile-field-error-focus.png : erreurs et focus associés.
- mobile-long-content.png : titre de stress sans espaces, sans élargissement de la page.
- reflow-200-percent.png ; checks.json : mesures et assertions du navigateur.

Les images ont réellement été ouvertes et examinées après chargement des polices et décodage des images. Le catalogue ne reproduit pas la page d’accueil complète : la comparaison porte sur les éléments communs des maquettes, leurs hiérarchies, titres, actions, cartes, couleurs et états. Aucun score de fidélité ni résultat pixel perfect n’est revendiqué.

Propagation des styles partagés : l’accueil provisoire existant a aussi été ouvert et capturé à 1440 et 320 px ; /connexion, /espace et /admin ont été contrôlées à 390 px. Logo et polices chargés, métadonnées favicon présentes et aucun débordement horizontal. Ces pages restent les emplacements du socle ; leur contrôle ne constitue pas une implémentation de l’accueil pilote ou des autres écrans. Captures public-home-*.png et diagnostic public-shell-checks.json dans le même dossier local.

À 320 px, le header public provisoire revient sur deux lignes. Il reste utilisable ; sa composition et la navigation mobile conformes à l’accueil approuvé appartiennent au lot suivant.

## Usage et accessibilité vérifiés

Navigation Tab et Shift+Tab, lien d’évitement activé avec Entrée vers le contenu, boutons désactivés ignorés, bouton à icône nommé. Focus mesuré : contour pétrole RGB(0,107,128), largeur 2 px, décalage 2 px. Survol du bouton principal : bleu nuit RGB(3,38,58).

Saisie réelle au clavier, sélection native avec flèches/Entrée, soumission locale de démonstration sans envoi, activation/retrait de l’erreur illustrée, bouton d’attente puis retour à l’état normal. Les champs disposent tous d’un label ; l’erreur est associée via aria-describedby et aria-invalid=true. Les boutons ont un nom dans l’arbre d’accessibilité.

Tous les boutons mesurés atteignent au moins 44 px de haut et ont un rayon de 8 px. Cartes : 12 px. Signatures : 160 px utiles, monogrammes 48 px ; images décodées et ratio conservé. Inter, Source Serif 4 et JetBrains Mono sont effectivement chargées. Aucune exception JavaScript ni requête /api/v1 observée pendant les scénarios du catalogue.

Contrastes calculés sur les couleurs réellement composées des messages, badges et boutons principaux actifs : minimum observé 5,24:1. Cela ne constitue pas un audit exhaustif WCAG. Les éléments désactivés ne sont pas inclus dans cette mesure. Mouvement réduit activé : animations des indicateurs/squelettes neutralisées, tout en conservant leurs libellés.

## Corrections et choix à relire

Le retour à la ligne des boutons/liens, messages, labels et cartes a été renforcé pour les textes longs. Les bordures des champs et boutons secondaires utilisent le texte secondaire #526674 pour mieux distinguer les limites des contrôles ; les cartes gardent la bordure légère #D6E1E5. C’est un renforcement volontaire du contraste par rapport aux bordures pâles des PNG, à relire visuellement.

Les logos sont les variantes compactes validées fournies par le skill ; ils remplacent les anciennes représentations plus volumétriques visibles dans les maquettes. Les composants n’ajoutent pas de relief 3D. Les tailles typographiques et teintes pâles non chiffrées par la charte sont des choix centralisés de ce lot, à confirmer dans l’accueil pilote.

Une première assertion de largeur a été corrigée pour tenir compte de la barre de défilement du navigateur. Le nettoyage du harnais a également été ajusté pour éviter de demander deux fois l’arrêt du serveur production déjà fermé. La dernière exécution de la revue s’est terminée avec code zéro ; fermeture effective des ports de test confirmée. Ces ajustements du harnais n’ont pas modifié les composants pour masquer un défaut.

## Limites et prochain lot

Pas de mobile physique, lecteur d’écran, Safari/Firefox, audit complet d’accessibilité ou parcours métier testé. Le mouvement réduit et le reflow sont émulés. Les screenshots neutralisent uniquement l’indicateur de développement Next.js et les animations, pas le contenu métier ou le layout.

L’illustration autonome Afrique/réseau/logo manque dans le skill : elle doit être fournie pour le lot accueil pilote. Aucune capture de maquette ou illustration improvisée n’est utilisée à sa place. Ce lot ne livre ni accueil complet, ni authentification, ni contenu privé, ni contrat API. Les états visibles restent des démonstrations explicitement isolées.

Les serveurs et la session Chromium de revue sont arrêtés. Pour relire le lot : démarrer uniquement `pnpm dev:frontend` et ouvrir http://localhost:3000/dev/design-system. La revue visuelle du lot 1 est validée ; la revue indépendante du code et toute validation de fusion restent à effectuer dans la PR. L’accueil complet appartient au prochain lot.
