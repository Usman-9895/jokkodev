# Ressources, notices et contenus — audit lot 15

Contrôle local du19 octobre2026 sur Windows x64, sans décision juridique ou nouvelle licence du code original.

- Empreintes des sept logos/favicons, trois polices locales, logo original et silhouette Natural Earth : **12 conformes** aux manifests de provenance existants. Trois notices OFL présentes. Sources et transformation : [polices](fonts/README.md), [illustrations](home-assets.md), frontend/public/brand/sources.json et illustrations/sources.json.
- Marque JokkoDev fournie par l’équipe ; aucun droit nouveau présumé. Signature DevTeranga encore textuelle, illustration/carte simplifiée et pictogrammes de code provisoires selon les guides historiques. Obtenir les assets/droits définitifs.
- Règles : principes confirmés, rédaction proposée à relire. Confidentialité : contenu public à venir, aperçu de travail non applicable et404 en production. Contact : orientation sans coordonnées validées ni service d’envoi. À propos/Ressources restent en attente. Aucun statut éditorial transformé par la validation fonctionnelle.

Inventaire régénéré avec le script existant dans un dossier d’artefacts, puis comparé avant mise à jour. **465 entrées contre456**, neuf ajouts, aucune suppression : @epic-web/invariant1.0.0, @phc/format1.0.0, @types/nodemailer8.0.2, argon20.45.1, cross-env10.1.0, csrf-csrf4.0.3, node-addon-api8.9.2, node-gyp-build4.8.4, nodemailer10.1.2. Dépendances et verrou inchangés dans ce lot. L’ancien et le nouveau graphe sont Windows ; aucune différence Linux supprimée silencieusement.

Le collecteur détecte **599 notices** sur l’installation actuelle contre590. Les590 anciens blocs sont conservés ;16 blocs nouveaux/différents sont ajoutés en complément (neuf nouveaux en-têtes et sept variantes), au lieu d’effacer les notices antérieures. Voir [inventaire](dependency-inventory.md), JSON et [notices](third-party-notices.txt). Le texte original de chaque notice est conservé ; l’inventaire ne couvre pas automatiquement tous les composants embarqués.

Aucune déclaration GPL/LGPL/AGPL ou inconnue détectée dans ce graphe installé ; cela ne suffit **pas** à déclarer une conformité CADEV. type-fest reste MIT OR CC0-1.0 à arbitrer ; MPL/EPL et composants embarqués/natifs restent à relire. **20 paquets sans notice séparée détectée**, dont le nouvel @epic-web/invariant : récupérer/valider les notices à leurs sources avant redistribution. Les notices Argon2 natives et bibliothèques embarquées nécessitent leur revue propre.

Reste à compléter le graphe optionnel Linux sur la plateforme cible et à préciser la portée des restrictions CADEV pour Node/PostgreSQL, images système, outils et binaires natifs. SMTP/HTTPS/systemd/Datacloud ne sont pas validés. Références et arbitrages : [questions ouvertes](open-questions.md), sans conformité globale annoncée.
