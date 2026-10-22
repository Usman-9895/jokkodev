# Codecs des photos — lot 18

Backend uniquement : `jpeg-js@0.4.4` (BSD avec les notices Apache/Adobe présentes dans son LICENSE), `pngjs@7.0.0` (MIT), `wasm-webp@0.1.0` (MIT, WebAssembly libwebp BSD et grant de brevets). Types de développement `@types/pngjs@6.0.5` : MIT. Aucune dépendance d’exécution transitive, aucun binaire natif, sharp/libvips toujours exclus.

Les cinq fichiers voisins sont des notices intégrales conservées sans modification : LICENSE des trois paquets installés, COPYING et PATENTS de libwebp, sous-module source `6c484cbf92e81a5673b24485ac02d211f69be5b7` référencé par [wasm-webp](https://github.com/nieyuyao/webp-wasm). La version du décodeur de l’archive npm a été vérifiée à l’exécution : **1.3.2**. Le traitement refuse une version différente avant décodage pour imposer une nouvelle revue lors d’une mise à niveau. [libwebp 1.3.2](https://github.com/webmproject/libwebp/releases/tag/v1.3.2) inclut la correction de CVE-2023-4863 ; ceci ne remplace pas une veille de sécurité continue.

Le wrapper racine de wasm-webp possède des imports incompatibles avec Node ESM. L’application charge son entrée Emscripten ESM distribuée, avec son fichier WASM local passé explicitement, sans téléchargement réseau ni modification du paquet. Une déclaration TypeScript minimale décrit cette interface tierce ; aucun DTO ou fichier généré API n’est recopié. Le worker est borné et jetable après chaque import.

Alternatives examinées puis retirées du verrouillage : `@jsquash/webp@1.5.0` (base libwebp ancienne) ; `@stacksjs/ts-webp@0.1.6` (aucune notice LICENSE dans l’archive ni à sa révision taguée, malgré MIT déclaré). Aucun de ces paquets n’est livré. L’image WebP synthétique du test a été produite par un encodeur libwebp indépendant ; elle ne contient aucune donnée personnelle.

L’inventaire et les notices centrales restent à relire selon les plateformes réellement distribuées. Les restrictions CADEV sur les composants système, licences originales et autres arbitrages du projet ne sont pas tranchés par ce choix. Aucune conformité CADEV globale ou validation de production annoncée.

La mémoire linéaire du module instancié est limitée à128 Mio : `boundedWasmBytes` ajuste uniquement son descripteur mémoire wasm32 avant instanciation, en mémoire ; les fichiers du paquet restent inchangés. Le hash original et celui de cette représentation bornée sont conservés dans `provenance.json`. Le code applicatif et son test de dépassement sont distincts du code du codec. Ceci ne remplace pas le budget mémoire/processus à valider dans l’environnement de déploiement.
