# Ressources visuelles du lot 2

Le fichier `frontend/public/brand/jokkodev-original.png` est une copie sans modification du logo original fourni par Ousmane (`logo_jokkodev_png.png`), 826 × 990 avec alpha réel. Empreinte conservée dans `frontend/public/illustrations/sources.json`. Les droits de marque restent ceux décidés par l’équipe ; aucune licence nouvelle n’est attribuée.

`frontend/public/illustrations/africa-natural-earth.svg` dérive des coordonnées GeoJSON Natural Earth 1:110m. Source officielle du projet : [natural-earth-vector](https://github.com/nvkelso/natural-earth-vector), fichier `geojson/ne_110m_admin_0_countries.geojson`, commit exact et empreintes dans sources.json. [Conditions de Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/) consultées le 13 octobre 2026 : données déclarées dans le domaine public, modifications et redistribution autorisées.

Transformation : sélection CONTINENT=Africa, projection équirectangulaire, chemins SVG sans données attributaires ni frontières affichées. Le script de préparation reste dans le cache local de revue ; la transformation mathématique est `x=(longitude+18)*4.4+8`, `y=(38-latitude)*4.4+6`, arrondi à deux décimales, viewBox 0 0 340 340. Les anneaux polygonaux sont fermés, remplissage pair-impair. Aucun fichier source de la maquette n’est intégré à l’interface.

Pictogrammes réseau et géométrie d’animation : SVG/CSS rédigés pour JokkoDev, sans bibliothèque tierce ajoutée. La signature DevTeranga est encore typographique et provisoire ; obtenir son asset officiel avant de présenter une reproduction fidèle du pied de page. Cette vérification de provenance ne constitue pas une conformité juridique globale CADEV.
