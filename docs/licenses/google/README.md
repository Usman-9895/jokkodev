# Ressources du bouton Google

Ressources tierces pour l’option de connexion facultative, servies **localement** ; aucune requête Google Fonts ou script Google lors du chargement de JokkoDev. Les polices et autres styles JokkoDev restent inchangés. Cette notice ne donne aucune licence au code original du projet.

## Signe G officiel

`frontend/public/brand/google-sign-in.png`, 1 250 octets, SHA-256 `33f5ab7c3d6b6af7c8cdd3e917e4475d9a2ffd407a7667a68747140b290bdeb8`.

Fichier PNG inchangé issu de l’archive officielle [signin-assets.zip](https://developers.google.com/static/identity/images/signin-assets.zip), chemin `Android + Web/PNG @1x/Light/Theme=Light, Show text=No, Shape=Square, Platform=Android+Web.png`. Seule la zone du signe G de 20 px est présentée par cadrage CSS, sans redessiner/recolorer/étirer ce signe. La marque et le signe appartiennent à Google ; leur affichage pour le bouton suit les [règles de marque du fournisseur](https://developers.google.com/identity/branding-guidelines). Aucune licence MIT ou licence du code n’est attribuée à ce logo.

## Police réservée au bouton

`frontend/public/fonts/google-sans-500.ttf`, 7 292 octets, SHA-256 `1d5f89b304cb285bcadf3e7602b871267fd52a955ecbc6f42bb042ca90649d2b`.

Google Sans, graisse 500, sous-ensemble fourni par l’API officielle Google Fonts pour les seules chaînes « Continuer avec Google » et « Ouverture de Google… ». Source CSS : `https://fonts.googleapis.com/css2?family=Google+Sans:wght@500&display=swap&text=Continuer%20avec%20GoogleOuverture%20de%20Google%E2%80%A6`. Archive de provenance de téléchargement et URL exacte du binaire dans l’artefact local `.cache/auth-google/runtime/google-font-source.json`.

Licence **SIL Open Font License 1.1**, notice originale [Google-Sans-OFL.txt](Google-Sans-OFL.txt), copyright 2025 The Google Sans Project Authors. Source officielle de la notice : [google/fonts/ofl/googlesans/OFL.txt](https://github.com/google/fonts/blob/main/ofl/googlesans/OFL.txt). Notice normalisée en LF, espaces de fin de ligne retirés sans changement du texte. SHA-256 de la notice `54c290753de0b8a368e9438005a69b878596e24d902dbbc0ff300291d6db2389`. Pas de transformation locale du fichier de police ni de requête Google Fonts depuis le navigateur ; le sous-ensemble a été généré par le service fournisseur.

## Dépendances OIDC

`openid-client@6.8.8` et `oauth4webapi@3.8.8` déclarent MIT ; notices originales conservées dans [third-party-notices.txt](../third-party-notices.txt), versions/sources dans l’[inventaire](../dependency-inventory.md). Inventaire régénéré sous Windows : 470 dépendances, 604 notices, aucune licence déclarée GNU GPL/LGPL/AGPL détectée. Cela n’est pas une attestation de conformité globale ; variantes natives Linux et points historiques de l’inventaire restent à examiner.
