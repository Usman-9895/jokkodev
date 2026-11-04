# Lot E — guide de recette et exploitation PWA

Base `81d5e54370dc03bcf87a392c115c67855dfd0171`, worktree isolé `.cache/pwa/worktree`, branche `feature/pwa-offline-reading`. [Choix d'architecture et de confidentialité](../decisions/009-pwa-offline-reading.md). Changements frontend/serveur Next uniquement, sans dépendance, backend, contrat ou migration.

## Ce qui peut réellement être lu hors connexion

Après une première visite en ligne et l'installation réussie du worker :

- `/ressources` reçoit la copie `/lecture-hors-connexion/ressources`, comprenant les trois guides **Poser une question qui aide à comprendre**, **Partager une réponse utile**, **Trouver des personnes avec qui construire**.
- `/lecture-hors-connexion/ressources` donne directement cette copie.
- `/hors-connexion` explique les limites et propose la lecture de la copie encore valide.

Le texte et les étapes de ces guides, ainsi que la liste de liens documentaires, proviennent des données publiques existantes. **Le contenu des sites MDN, Git, Next, Nest et PostgreSQL n'est pas téléchargé.** L'accueil, questions, projets, À propos, règles, contact et confidentialité ne sont pas archivés : seule la page de secours les remplace si leur navigation documentaire sans paramètres échoue.

Questions/détails, projets/détails, profils, comptes, formulaires, espaces personnels, administration, candidatures, signalements et contacts ne deviennent pas des contenus de lecture locale. Les routes exclues et les URL contenant des paramètres échouent normalement hors ligne ; aucun jeton ou chemin de compte n'est utilisé comme clé de cache. Pas d'envoi différé, de connexion simulée ni de rejeu de mutation.

## Stockage, identité et mises à jour

Le [lot F1 préparé localement](question-local-drafts.md) utilise une base IndexedDB séparée pour les brouillons privés de question. Aucun de ces champs n'entre dans les caches publics décrits ici. Le worker de retrait du lot E supprime seulement son préfixe CacheStorage et ne constitue pas une procédure d'effacement de ces brouillons. Leur retrait demande une action distincte et ciblée.

Cache réservé `jokkodev-public-reading-v1-<BUILD_ID>` ; métadonnée technique `jokkodev-public-reading-v1-active` contenant seulement la version active. 13 entrées de payload à liste fermée ; expiration 24 h, 3 Mio/entrée et 8 Mio/version. Au plus deux versions actives/candidates et une métadonnée, sans suppression des caches étrangers. Un quota peut empêcher l'installation ; la navigation reste utilisable en ligne. Les données sont une copie publique, commune aux comptes du navigateur ; aucun compte n'est identifié dans ces caches.

Une copie expirée n'est pas servie. Sans réseau ni copie valide, réponse texte 503 ; après retour du réseau, renouvellement des documents publics sans action métier. Le navigateur peut effacer son stockage indépendamment de l'application. La lecture hors ligne ne remplace donc pas une sauvegarde.

Clair/Sombre, préférence locale et SVG existants réutilisés. Les PNG 192/512, apple 180 et maskable 512 sont des exports du monogramme approuvé sur fond blanc, sans recoloration ; le maskable réserve sa zone centrale. Polices Inter/Source Serif existantes, notices conservées ; aucune bibliothèque nouvelle. Le splash natif reste de couleur fixe, le thème mémorisé est appliqué dans le document.

Installer apparaît uniquement si le navigateur émet beforeinstallprompt. Pas maintenant ou refus masque la proposition sept jours (clé locale `jokkodev.pwa.install-dismissed-at`, sans donnée privée) ; si le stockage est refusé, le refus reste en mémoire. Les commandes natives des navigateurs restent indépendantes.

Actualiser est une action volontaire. Si un formulaire est présent, Continuer ma saisie est l'action initialement focalisée du dialogue ; Échap annule. L'acceptation peut perdre la saisie de cet onglet, ce qui est annoncé. Les autres onglets ne sont jamais rechargés par ce mécanisme. Le retour du réseau seul ne recharge aucun formulaire.

## Recette locale reproductible

Aperçu de production préparé : `http://127.0.0.1:3488/ressources`. Explication/copie : `/hors-connexion`, `/lecture-hors-connexion/ressources`. Aperçu développement sur `http://127.0.0.1:3489/dev/design-system` : worker désactivé. Aucun compte nécessaire. API de cet aperçu dirigée vers le port loopback 1 inaccessible ; ne saisir aucun compte réel.

1. Visiter en ligne l'aperçu production. Dans Application/Service Workers, attendre l'activation de `/sw.js` ; examiner le manifeste et les icônes. Le premier accès ne peut fonctionner hors ligne sans installation préalable.
2. Examiner Cache Storage : seulement le préfixe de ce lot, les 13 chemins autorisés et la métadonnée de version. Aucun `/api`, `_next`, profil, URL de token ni HTML de l'espace privé.
3. Couper le réseau, ouvrir directement `/ressources` puis `/questions`. Guides dans le premier cas, secours sans question archivée dans le second. Essayer `/connexion` : erreur réseau native attendue, jamais une session locale.
4. Tester Clair/Sombre et clavier. Revenir au réseau, recharger `/ressources` : la page normale Next réapparaît et le cache statique serveur reste HIT.
5. La recette automatisée accélère l'expiration uniquement en modifiant les timestamps de ses caches fictifs, sans changer l'horloge machine. Les tests unitaires couvrent la borne exacte 24 h et le refus no-store/cookies/RSC/volumes.
6. Pour une version suivante, conserver un formulaire non envoyé dans deux onglets. La nouvelle version est proposée, la saisie reste avant décision et après annulation ; l'acceptation recharge seulement l'onglet demandeur.

L'émulation offline de Chromium n'a pas coupé tous les fetchs de worker dans cet environnement. Pour une coupure déterministe, la recette automatisée utilise un proxy éphémère sur 3490 qui ferme ses connexions ; un second proxy 3491 change uniquement la version du worker. Ces serveurs appartiennent au script et sont arrêtés à sa fin ; ils ne modifient pas le serveur applicatif ni des services d'équipe.

Les scripts locaux ignorés sont conservés dans `.cache/pwa/` : `browser-review.cjs`, `check-installability.cjs`, `export-icons.cjs`, `run-preview.cjs`. Ils utilisent Playwright/Chromium déjà installés, sans ajouter de dépendance au produit. Les ports 3488/3489 sont réservés aux aperçus ; 3490/3491 aux fixtures, 3494/3495 au smoke. Les PID des seuls aperçus laissés actifs figurent dans `.cache/pwa/processes.json`.

## Désinscription et nettoyage local ciblés

Sur **l'origine locale de recette seulement**, dans la console du navigateur, après avoir vérifié l'adresse :

```js
if (location.origin !== 'http://127.0.0.1:3488') throw new Error('Origine de recette inattendue');
for (const registration of await navigator.serviceWorker.getRegistrations()) {
  const worker = registration.active || registration.waiting || registration.installing;
  if (worker && new URL(worker.scriptURL).pathname === '/sw.js' && registration.scope === location.origin + '/') {
    await registration.unregister();
  }
}
for (const name of await caches.keys()) {
  if (name.startsWith('jokkodev-public-reading-v1-')) await caches.delete(name);
}
localStorage.removeItem('jokkodev.pwa.install-dismissed-at'); // facultatif, pour revoir la proposition
```

Fermer tous les onglets et fenêtres de cette origine : un document déjà contrôlé peut encore garder son ancien contrôleur jusqu'à sa fermeture. Ne pas utiliser `caches.keys().map(delete)` sans filtre, localStorage.clear ou suppression globale des cookies. La préférence `jokkodev.theme`, les sessions et les autres applications restent préservées. Revenir en ligne réinstalle normalement la fonctionnalité si elle est encore activée.

## Futur déploiement, arrêt et rollback

Aucun déploiement exécuté dans ce lot. Avant activation autorisée : revoir le diff, faire les sauvegardes habituelles, installer les versions verrouillées, générer Prisma pour le build avec destination fictive si nécessaire, construire et tester une release isolée. Aucune migration de ce lot.

Conserver HTTPS, CSP du lot C, collecteur, identifiants renouvelés et routage API direct. Vérifier que nginx transmet `/sw.js`, `/manifest.webmanifest`, `/pwa/*`, `/hors-connexion` et `/lecture-hors-connexion/ressources` au frontend. Ne pas lui appliquer un cache immuable au chemin stable sw.js ; sa réponse doit être no-store. Les deux handlers HTML ont noindex. Aucun ajout au sitemap, aucune indexation des parcours privés et aucune extension de CSP inline.

Le serveur charge le worker versionné au démarrage depuis BUILD_ID. Déployer build + worker + documents/assets ensemble, puis redémarrer le seul service nécessaire selon le diff réel. Vérifier dans un navigateur vierge : manifeste, activation, liste des caches, offline, rechargement, propositions et absence de données de compte. La mise à jour de l'app installée dépend du navigateur, pas d'une diffusion immédiate à tous les appareils.

Pour un retrait autorisé, configurer **uniquement le service web** avec `JOKKODEV_PWA_DISABLED=1` puis le redémarrer suivant la procédure d'exploitation habituelle. `/sw.js` sert alors un worker de retrait, qui s'active, supprime le seul préfixe possédé et se désinscrit sans fetch handler et sans rechargement des onglets. Garder cet endpoint accessible assez longtemps pour les appareils qui reviennent au réseau ; ne pas simplement répondre 404 ou retirer le script, car un ancien worker peut subsister. Une bannière déjà affichée dans un ancien onglet n'est pas une preuve de copie disponible après désactivation.

Un rollback du lien current ne suffit pas à retirer un worker enregistré. Prévoir le worker de retrait avant de revenir à une release qui ne le sert plus ; faire valider cette opération séparément et observer le retour des appareils. Aucun nettoyage distant garanti pour un appareil restant hors ligne. Ne pas réinitialiser les caches étrangers ni les cookies. La désactivation a été testée localement ; aucune configuration de production n'a été changée.

## Résultats et réserves

Les résultats précis et incidents sont consignés dans le [rapport de vérification](pwa-verification.md). Les captures comparables restent locales dans `.cache/pwa/verification/`, exclues du commit. Recette fonctionnelle et visuelle validée par Ousmane ; commit, push et PR autorisés ensuite. Aucun compte réel, connexion VPS, fusion ou déploiement dans cette mission.
