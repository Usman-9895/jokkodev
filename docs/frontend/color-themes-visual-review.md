# Lot D — complément de recette visuelle du 3 novembre 2026

Branche `feature/frontend-color-themes`, base `34866fafc22bdda8405eb588cdf12d71435d8bf3`. Complète le [guide et les premières vérifications](color-themes.md), dont les impossibilités initiales sont conservées comme historique. Recette visuelle validée par Ousmane pour Clair/Sombre uniquement ; commit, push et PR normale vers develop autorisés ensuite. Aucune connexion VPS ni modification de données.

## Conditions réelles

Le connecteur habituel renvoie encore `The browser access host is unavailable`. Le recours à Playwright expressément demandé a permis de terminer les captures : `playwright-core` déjà installé sur le poste et Chromium déjà installé, version **148.0.7778.96**, en mode headless sous Windows. Aucun paquet ajouté, aucun profil personnel réutilisé. Aucun démarrage Docker, changement de protection antivirus ou service d'un autre projet.

Production locale : `http://127.0.0.1:3470`. Exemples de développement : `http://127.0.0.1:3471`. Hauteur de viewport **900 px**, largeurs **1440, 768, 390 et 320 px**, échelle 1. Captures intégrales après polices chargées, animations neutralisées pour la comparaison. Les pages sont réellement rendues par Chromium ; ce ne sont pas des maquettes.

La décision ultérieure d'Ousmane retirant Système et fixant Clair par défaut reste appliquée. Aucun troisième choix n'est réintroduit à partir de la mention Système dans la liste de recette. Les changements système sont émulés au navigateur pour vérifier leur absence d'effet sur Clair/Sombre ; ce n'est pas une manipulation du réglage Windows.

## Matrice visuelle exécutée

Chaque ligne ci-dessous est capturée en Clair et Sombre aux quatre largeurs : **120 vues principales**, auxquelles s'ajoutent menus ouverts, dialogues, champs en erreur et focus. Les planches rapprochent les captures aux mêmes largeurs ; les PNG originaux permettent la lecture à leur taille réelle.

| Écran | Source réellement examinée | Observation et limite |
|---|---|---|
| Accueil et pied de page | `/` sur 3470 | Composition, illustration blanche conservée, boutons, erreurs de lecture, variantes de marque ; menu ouvert aussi à 768/390/320 |
| Questions et filtres | `/questions` sur 3470 | Catalogue et données indisponibles, état d'erreur réel ; aucune liste remplie prétendument authentique |
| Question, réponses, code, badges | `/dev/jokkohelp-contributions?view=detail` | Contributions fictives existantes, code avec défilement interne ; confirmations locales |
| Projets et filtres | `/projets` sur 3470 | État d'indisponibilité réel |
| Liste et détail de projets | `/dev/jokkoprojects?view=list` et `view=detail` | Cartes, pagination, responsable, membres et actions désactivées fictifs |
| Connexion et inscription | `/connexion`, `/inscription` sur 3470 | Formulaires vierges, labels et champs ; aucun identifiant réel saisi, aucun compte créé |
| Ressources | `/ressources` sur 3470 | Cartes, liens et pied de page ; rendu statique conservé |
| Confidentialité | `/confidentialite` sur 3470 | Sections longues, listes et panneaux adaptés au thème |
| Page absente | `/theme-missing-page` sur 3470 | Vraie réponse 404, illustration, actions et retour à la ligne du header à 320 px |
| Design system | `/dev/design-system` | Nuancier, logos, désactivés, chargement, champs en erreur, cartes et badges ; panneau de marque corrigé puis recapturé |
| Profil | `/dev/comptes?view=profile` | Avatar initiales, biographie, compétences et cartes fictives ; ne couvre pas photo réelle ni score réel |
| Espace membre | `/dev/espace` | Tableau de bord et navigation fictifs, sans session |
| Administration | `/dev/moderation` | États, filtres et présentation responsive fictifs, sans rôle ADMIN réel |

Examen des captures et mesures : aucun débordement horizontal de la page sur les 120 vues ; aucun chevauchement majeur ou texte invisible attribuable au thème relevé dans ces états. Les extraits de code gardent leur défilement horizontal interne. Les grands contenus produisent volontairement des pages longues. Ce constat n'est ni une conformité générale d'accessibilité ni une recette exhaustive des états métier.

## Correction confirmée

Le panneau « Sur fond clair » du design system héritait d'une surface sombre et de logos automatiques en mode Sombre ; son favicon destiné au clair devenait inadapté. Le panneau conserve maintenant un fond blanc, ses textes secondaires adaptés et les variantes originales `theme="light"`. Le panneau voisin sur bleu nuit conserve ses variantes sombres. Aucun logo redessiné, aucun asset modifié. Les huit vues du design system ont été recapturées ; fond calculé `rgb(255, 255, 255)` pour ce seul échantillon, images décodées avec succès. Le reste du catalogue continue à suivre le thème.

## Interactions et mesures navigateur

- **41 assertions de comportement réussies** : première visite claire avec système sombre, Espace/Entrée, persistance Sombre au rechargement, priorité aux choix explicites lors des changements système émulés, ancienne valeur `system` ramenée à Clair, aucune animation de restauration, stockage indisponible utilisable en mémoire puis retour à Clair au rechargement, synchronisation entre onglets et absence de changement des cookies de visiteur par le bouton.
- Ces assertions comprennent huit scénarios de dialogue (deux thèmes × quatre largeurs) : ouverture, focus initial sur Annuler, focus maintenu dans le dialogue, Échap et retour au déclencheur. Aucune mutation métier exécutée.
- **20 assertions complémentaires réussies** : champs en erreur et focus visible aux huit combinaisons ; activation du thème au clavier dans le menu mobile et placement après S'inscrire sans débordement aux six combinaisons mobiles. La première matrice vérifie aussi Échap et retour du focus au bouton du menu dans ces six combinaisons.
- Cible du bouton mesurée **128 × 44 px** ; focus clavier sombre `rgb(106, 216, 229) solid 2px`. Réduction des mouvements émulée : transition calculée de la pastille **0 s**. Le réglage approuvé reste 600 ms / 400 ms hors réduction des mouvements.
- **44 paires de contraste calculées par Chromium**, zéro échec aux seuils du script existant : texte 4,5:1, contrôles/icônes concernés 3:1. Mesures sur des éléments portant les tokens réels et `getComputedStyle`, y compris `color(srgb ...)`. Les captures complètent ce contrôle ciblé ; toutes les combinaisons de pixels, gradients, images et états transitoires ne sont pas mesurées.
- Première visite et rechargement avec Sombre enregistré : **30 frames avec contenu échantillonnées par cas**, toutes respectivement claires ou sombres ; aucun mauvais thème de page observé dans cet essai local. Pas de promesse d'absence de flash dans toute condition réseau, ni de mesure terrain du coût du script bloquant.

## Console, CSP et limites démontrées

Les huit écrans publics de la matrice sur 3470 n'ont produit aucun avertissement d'hydratation détecté ni exception JavaScript de page. Les vues de développement ont produit **56 avertissements d'hydratation**, tous contenant la substitution d'un élément `script` du head par un script de **Kaspersky**. Un passage dédié a recueilli le diff React exact : fichier attendu `/theme-init.js`, élément injecté par le logiciel de sécurité. Cette modification du document ne vient pas du composant de thème. L'antivirus n'a pas été désactivé et le code n'a pas reçu de suppression d'avertissement supplémentaire. Le badge rouge Next visible dans certaines captures conserve la trace de cet incident ; l'hydratation des exemples de développement ne peut donc pas être annoncée sans avertissement dans cet environnement.

Des erreurs de chargement de ressources et de lecture des données existent dans l'environnement sans base. Elles ne sont pas présentées comme corrigées. Les refus de lecture en production locale et les exemples privés fictifs restent distingués. La vérification de stabilité de session est limitée aux cookies de visiteur : aucune session authentifiée disponible, aucune preuve de changement de compte réel.

Les en-têtes de production du lot C sont présents dans les réponses navigateur et inchangés. Les interactions fonctionnent avec la CSP limitée bloquante et la CSP complète Report-Only. Cette dernière peut signaler les scripts inline Next ; elle ne les bloque pas. Aucun ajout de `unsafe-inline`, nonce, rendu dynamique global ou contournement de CSP. Les variations de verbosité de console du navigateur ne prouvent pas une absence de violations Report-Only.

Le contrôle HTTP a été rejoué après le build final : page `/ressources` en **cache HIT**, document identique malgré un cookie de thème fictif, pas de personnalisation par cookie, identifiants de requête renouvelés, script externe conforme à sa source, neuf aperçus en 404 en production et page absente en 404. Le build confirme les pages statiques. Aucune modification de configuration de sécurité ou de session.

## Contrôles relancés et incidents de recette

Après la seule correction des deux fichiers du design system : ESLint ciblé réussi, typecheck frontend réussi et build frontend réussi. `git diff --check` réussi. Les tests de comportement/unitaires, backend, smoke et autres contrôles techniques historiques ne sont pas relancés inutilement : logique de thème, serveur et contrat inchangés. Leurs résultats précédents restent ceux du guide, pas de nouvelles exécutions.

Incidents conservés :

1. Le premier script attendait que le bouton caché dans le menu mobile fermé soit visible. Cette attente était incorrecte ; l'attente d'attachement au DOM a remplacé cette condition. Les 90 vues à 768/390/320 ont ensuite été obtenues sans timeout. Les 30 vues ordinateur réussies sont conservées.
2. Le premier lecteur de contraste interprétait incorrectement les composantes normalisées `color(srgb ...)` comme des entiers RGB, produisant six faux échecs. Le lecteur corrigé donne 44 réussites ; sortie initiale conservée, aucun changement de palette pour masquer ces résultats.
3. Le premier typegen a été refusé par le sandbox sur `next-env.d.ts` (`EPERM`). Exécution autorisée reprise avec succès, aucun changement inattendu du fichier généré.
4. L'arrêt ciblé des deux aperçus par `Stop-Process` a renvoyé une erreur PowerShell ; leurs PID, parent et commandes ont été revérifiés, puis seuls ces deux processus ont été relancés via Node pour servir le build final. L'API du lot et les autres services sont conservés. L'aperçu final répond ; aucune ancienne release ou donnée effacée.

## Preuves et reprise

Dans le dossier local principal : `.cache/color-themes/verification/browser/` contient les PNG `<écran>-<largeur>-<light|dark>.png`, les planches `sheet-*`, `dialog-*`, `mobile-menu-*`, `fields-focus-*` et `focus-dark.png`. `initial-pass.json` conserve le premier passage ; `results.json` contient les 90 vues mobiles/intermédiaires. `behaviors.json`, `final-checks.json`, `computed-contrast.json` et `console-probe.json` contiennent les résultats observés. Les captures avant correction de logos sont préfixées `before-logo-fix-`. `summary.json` et `index.html` regroupent la livraison finale. Ces fichiers locaux ne sont pas destinés à être commités automatiquement.

Les scripts de reproduction sont conservés dans `.cache/color-themes/` : `browser-review.cjs`, `browser-behaviors.cjs`, `browser-final.cjs`, `browser-contrast.cjs`, `console-probe.cjs` et `make-review-sheets.cjs`. Ils utilisent le module Playwright et Chromium déjà installés, avec des chemins locaux explicites ; aucune installation ou dépendance produit supplémentaire. Le script principal conserve les vues 1440 du premier passage et reprend les autres largeurs. Un rejeu peut remplacer les résultats courants : archiver les preuves avant de le relancer.

Les aperçus restent accessibles sur 3470/3471 ; les PID courants figurent dans `.cache/color-themes/processes.json`. L'API 3472 garde une destination DB/SMTP injoignable. Ne pas saisir de comptes réels. Les processus Chromium de recette ont été fermés par leurs scripts.

Restent hors validation : authentification et permissions réelles, photo/contacts/score réels, tous les états métier, autres moteurs et versions anciennes, appareil physique, lecteur d'écran, zoom réel 200 %, changement réel du réglage OS, réseau lent/performance terrain et VPS. Une vérification complémentaire de l'hydratation des exemples de développement est à prévoir dans un navigateur sans l'injection Kaspersky observée. La validation visuelle d'Ousmane et l'autorisation de publication ne lèvent pas ces réserves. Aucune fusion, fusion automatique ou déploiement autorisé.
