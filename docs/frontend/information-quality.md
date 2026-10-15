# Pages d’information et cohérence — lot 9

Branche `feature/frontend-information-quality`, depuis `develop` à `b55b323`, après vérification de la fusion de la PR #8. Dossier initial propre. Aucun changement backend, contrat généré, dépendance ou licence. Validation visuelle du lot 9 reçue ; commit, push de feature/frontend-information-quality et PR vers develop explicitement autorisés. Cette validation ne vaut pas approbation définitive des règles, de la confidentialité, des coordonnées ou des assets provisoires. Aucune fusion ni fusion automatique autorisée.

## Références et contenu

Les PNG 23 Règles communautaires, 24 Confidentialité et 25 Contact ont été réellement ouverts dans `D:/BUSINESS/CADEV/Maquettes/JokkoDev_7_maquettes_serie_04_v1/`. Lecture des notes série 04, de la charte du skill et de la procédure visuelle. Les notes précisent que le texte est illustratif, que la confidentialité n’est pas une politique finalisée et que Contact est une orientation sans formulaire/API supplémentaire.

Les décisions, guides frontend, README et ressources locales consultés ne fournissent ni coordonnées définitives approuvées ni signature officielle DevTeranga. Aucun email, numéro, réseau social, responsable de traitement, hébergeur, délai, durée de conservation ou engagement de conformité ajouté.

## Routes et composants

- `/regles` : cinq principes confirmés (respect, entraide, questions compréhensibles, informations privées, signalement). Leur rédaction reste explicitement une proposition à relire. Les cinq ancres sont `#respect`, `#questions`, `#solutions`, `#informations-privees`, `#signalement`. La maquette ne dessine pas de sommaire ; aucun menu interne supplémentaire imposé.
- `/confidentialite` : attente publique concise, aucune politique applicable.
- `/dev/informations` : structure de confidentialité avec cartes compte/profil/candidatures/signalements/sessions et comparaison public/privé. Version de travail explicitement identifiée, hypothèses à confirmer et aucun cookie présenté comme déjà implémenté. Garde `NODE_ENV !== development → notFound()` avant le rendu ; aucun lien public vers cet aperçu.
- `/contact` : trois cartes d’orientation ; consultation JokkoHelp, lien vers les règles et bouton d’écriture désactivé avec explication. Aucun formulaire ni simulation d’envoi : les notes n’en prévoient pas. Coordonnées à fournir par Ousmane.

`components/information/pages.tsx` réutilise `Container`, `Heading`, `Card`, `Message` et `Icon`. Le contenu est séparé dans `lib/information/content.ts`. Rendu React texte, sans HTML injecté. Les icônes et bulles de contact sont des tracés SVG simples dans le code ; aucune dépendance ou logo inventé. `information.css` reprend les tokens et animations communes.

Footer public : signature textuelle sobre « Une initiative de DevTeranga », liens Règles/Confidentialité/Contact et liens existants À propos/Ressources/Accueil. La silhouette d’Afrique provisoire n’est plus présentée comme signature DevTeranga. Footer compte harmonisé avec les pages réellement disponibles. Les espaces développeur et administrateur gardent leur navigation distincte. Pas de lien vers des conditions contractuelles inexistantes.

Titres et descriptions explicites sur les routes produit existantes, sans annoncer une authentification fonctionnelle. Le lien d’évitement existant est conservé ; aucune nouvelle animation longue. Les pages À propos et Ressources restent des attentes tant que leurs contenus ne sont pas validés. Les formulaires et données privées ne sont pas activés par cette harmonisation.

## Écarts à relire

- Note éditoriale ajoutée aux règles ; texte reformulé sans promesse de traitement opérationnel des signalements.
- Confidentialité : rendu de travail différent du texte illustratif, car les pratiques réelles restent inconnues ; route publique volontairement réduite.
- Contact : bulles SVG simplifiées, bouton indisponible et textes d’orientation adaptés à l’absence de service. Pas d’email illustratif.
- Footer partagé plus complet que celui de certaines maquettes, signature textuelle sans asset officiel ni mentions juridiques inventées.

Voir [l’inventaire](routes.md), [le bilan d’intégration](integration-readiness.md) et [les vérifications](lot-9-verification.md). Le lot ne rend pas l’application prête à publier : les parcours métier, contenus et contrôles d’intégration restent incomplets.
