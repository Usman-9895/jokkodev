# Lot F1 — brouillon local de question

État : recette fonctionnelle et visuelle validée par Ousmane ; publication en PR autorisée. Branche `feature/question-local-drafts`, base origin/develop vérifiée `193881df53418664a689f8e91d6b6d14c6d4ad50`. Worktree `D:\DEV\JokkoDev\.cache\question-drafts\worktree`. Commit, push et PR autorisés après validation ; aucun accès au VPS, fusion ou déploiement.

## Périmètre et durée

Un brouillon de **création de question par compte et par profil navigateur/origine sur cet appareil**. Les autres profils, navigateurs, appareils et domaines ne partagent pas ce stockage. Aucun brouillon de modification de question, réponse ou projet ajouté. Pas de sauvegarde automatique : le membre choisit **Enregistrer le brouillon sur cet appareil** ; le succès n'est annoncé qu'après la fin réussie de la transaction IndexedDB.

Conservation choisie pour ce premier périmètre : **sept jours après le dernier enregistrement explicite**, soit 604 800 000 ms en UTC, sans prolongation à la simple lecture. Taille maximale **256 Kio de JSON UTF-8**, métadonnées incluses ; aucune troncature silencieuse. La validation de publication reste distincte : un brouillon incomplet peut être enregistré. Une date future incohérente ou un schéma inconnu est refusé. L'échéance UTC et le caractère local sont affichés.

IndexedDB `jokkodev-question-drafts-v1`, magasin `drafts`, clé `ownerId` stable du compte. Valeur strictement limitée aux huit champs du formulaire (titre, contexte, attendu, obtenu, essais, code, langage, identifiants de technologies), version aléatoire, dates, propriétaire, version de format et indicateur d'envoi incertain. Aucun email, mot de passe, cookie, jeton CSRF, rôle ou profil copié. Version de base navigateur 2 : ajout de l'index `expiresAt` aux bases créées pendant la recette initiale, sans effacer leurs valeurs. Aucune migration PostgreSQL ni évolution de contrat.

Les valeurs expirées ne sont jamais reprises. À l'accès vérifié, un curseur de clés sur l'index d'échéance efface les entrées périmées sans lire le contenu des autres comptes. Les transactions vérifient atomiquement la version avant remplacement/suppression ; un nouveau brouillon d'un autre onglet n'est pas effacé par une ancienne confirmation de publication. Sans nouvelle utilisation de l'application, navigateur fermé ou appareil éteint, aucune suppression physique exactement à sept jours n'est garantie. Le navigateur peut aussi supprimer ou refuser le stockage plus tôt : ce n'est pas une sauvegarde durable.

## Identité et réseau

L'ouverture du formulaire et la reprise relisent la session côté serveur avant l'accès au brouillon. La saisie existante n'est jamais remplacée automatiquement : une boîte de dialogue permet de conserver la saisie ou de reprendre le brouillon. La suppression du brouillon enregistré laisse la saisie ouverte intacte.

Une rédaction **déjà ouverte après vérification en ligne** peut rester en mémoire pendant une panne réseau et être enregistrée sous son propriétaire déjà vérifié. Seule une capacité éphémère de rédaction (identifiant et génération d'identité) est gardée ; les vues privées ordinaires continuent de perdre leur identité lors d'une indisponibilité. Aucun droit de session hors ligne n'est inventé, aucune identité n'est persistée pour rouvrir le formulaire hors ligne. Reprendre un brouillon après fermeture se fait au retour en ligne.

Déconnexion, identité différente, 401 ou suspension connue retirent la capacité et démontent le formulaire. Les changements de session utilisent BroadcastChannel, avec signal storage de secours contenant seulement une valeur aléatoire, sans identité ni contenu. Le destinataire masque immédiatement l'ancienne identité puis revérifie sa session ; une ancienne réponse en vol ne la rétablit pas. Si ces deux mécanismes de communication sont interdits, la vérification au focus/retour visible et le contrôle périodique existant restent les moyens de détection : aucune propagation instantanée universelle n'est promise.

Une expiration ou révocation survenue sur le serveur pendant une coupure totale ne peut être connue sans réseau. Elle verrouille le formulaire dès qu'elle est constatée au contrôle suivant ; le brouillon ne peut être rouvert hors ligne après fermeture. Ce lot ne permet ni connexion hors ligne ni publication sans autorisation serveur.

Le stockage n'est **pas chiffré** et les clés par compte ne constituent pas une isolation contre les outils développeur, un script malveillant de même origine ou une personne ayant accès au profil du navigateur. La protection décrite concerne les accès de l'application. Ne pas utiliser un appareil partagé pour des informations sensibles ; la CSP existante reste inchangée.

## Publication, concurrence et incertitude

Le bouton existant et l'API Nest existante restent le seul chemin de publication. Aucun envoi automatique au retour du réseau, file d'attente ou rejeu ; F2 reste exclu. Une identité modifiée pendant l'obtention CSRF empêche l'envoi privé avant qu'il parte. Les réponses privées tardives restent rejetées.

Une réponse réussie avec identifiant serveur permet de supprimer la version locale observée avant l'envoi. Si le stockage échoue ou qu'un autre onglet a enregistré une nouvelle version entre-temps, elle est conservée : le formulaire confirme que la question est publiée, bloque une deuxième publication et propose le lien de consultation. Une erreur de validation conserve le brouillon. Un échec réseau/protocole, résultat abandonné ou erreur serveur ambiguë conserve également le brouillon et marque si possible l'envoi incertain, sans modifier ses champs ni renouveler sa durée.

L'indicateur incertain est repris après fermeture et bloque le bouton de publication jusqu'au choix explicite « J'ai vérifié » après consultation de Mes questions. En cas d'échec de cette écriture de métadonnée, la copie existante reste conservée et le stockage est signalé indisponible ; l'avertissement général de reprise demande de vérifier Mes questions si un précédent envoi était incertain. Un brouillon n'est jamais une preuve que la question n'existe pas déjà sur le serveur.

## PWA et interface

Le service worker et son cache public du lot E ne changent pas. Les brouillons sont dans une base IndexedDB séparée, jamais dans CacheStorage ni dans les réponses d'authentification. Pas de navigation privée rendue disponible hors ligne après fermeture. Le manifeste, la CSP, le collecteur et le rendu statique sont conservés.

La proposition de mise à jour PWA laisse la rédaction intacte en attente et après annulation. Une acceptation explicite avertit de la perte possible de saisie ; enregistrer le brouillon avant de recharger permet ensuite de le reprendre après vérification de session. Le brouillon n'est pas automatiquement enregistré lors d'une mise à jour. Les autres onglets ne sont pas rechargés par ce mécanisme.

Les tokens Clair/Sombre, les boutons de 44 px, le focus existant et les dialogues natifs sont réutilisés. La nouvelle zone reste dans la carte du formulaire existant, sans changer les champs ou la colonne de conseils de la maquette approuvée. Pas d'animation ajoutée.

## Recette disponible

Aperçu : **http://127.0.0.1:3500/questions/poser**. Frontend de production local, API réelle dédiée en développement sur 127.0.0.1:3501, PostgreSQL 17.11 sur **127.0.0.1:5459 / jokkodev_f1**. Les cookies non Secure sont uniquement ceux de cette recette HTTP locale, sans changement des exigences HTTPS de production. Transport email fichier uniquement ; pas d'envoi SMTP réel. Conteneur `jokkodev-f1-postgres`, volume `jokkodev-f1-data`, tous deux étiquetés F1. Les services d'autres projets sont préservés.

Les accès fictifs se consultent **localement** dans `D:\DEV\JokkoDev\.cache\question-drafts\runtime\comptes-recette.txt`, à ne pas publier. Aucun secret de recette n'est versionné. Les PID de ces seuls aperçus sont dans `runtime/processes.json`. La base, les fichiers et les aperçus sont laissés disponibles pour validation ; les proxies de test temporaires sont arrêtés.

1. Se connecter avec A ; ouvrir Poser une question. Rédiger, couper le réseau avec le formulaire déjà ouvert, puis enregistrer. Attendre la confirmation. Continuer à saisir : seuls les derniers champs explicitement enregistrés constituent le brouillon.
2. Fermer l'onglet ; rétablir le réseau puis rouvrir le formulaire. Reprendre ou supprimer. Avant de reprendre, saisir un autre titre et annuler le dialogue : cette saisie doit rester.
3. Dans un autre onglet du même profil, se connecter avec B ou se déconnecter. Le formulaire A doit disparaître ; B ne doit pouvoir reprendre que sa propre entrée. Reconnexion A : la copie A est encore disponible si non expirée.
4. Tester une validation invalide : aucune suppression. Sur une publication confirmée : suppression de la version locale correspondante. Pour un envoi incertain, consulter Mes questions avant tout nouvel envoi, même après réouverture.
5. Tester Clair/Sombre et le clavier aux quatre largeurs. Si une nouvelle version PWA est proposée, annuler garde la rédaction ; enregistrer puis accepter permet une reprise après rechargement.

Les scénarios de panne, quota, expiration et réponse perdue sont automatisés sur ces seules ressources fictives. Le quota plein est injecté par exception bornée dans le navigateur de test, sans remplir réellement le disque. Le script principal crée de nouvelles questions fictives à chaque rejeu complet ; les doublons de titres de recette ne signifient pas un rejeu automatique du client.

Scripts locaux conservés : `.cache/question-drafts/browser-review.cjs`, `extra-review.cjs`, `final-checks.cjs`, `run-smoke.cjs`. Les tests durables des règles et sessions sont dans `tests/question-local-draft.test.mjs` et `tests/account-session.test.mjs`. Résultats et captures : `.cache/question-drafts/verification/`. Voir le [rapport de vérification](question-local-drafts-verification.md).

## Retrait local et futur déploiement

La recette du lot est validée et sa publication en PR est autorisée. Retirer l'interface ne supprime pas les brouillons déjà présents : prévoir un traitement de retrait côté navigateur distinct, conservant les autres bases, cookies, préférence de thème et caches PWA publics. Le backend, un timer serveur et une restauration PostgreSQL ne nettoient pas IndexedDB sur les appareils.

Pour nettoyer **tous les brouillons de ce seul profil de recette**, fermer les onglets F1 puis, dans la console d'une page de l'origine locale, vérifier l'origine et supprimer uniquement cette base :

```js
if (location.origin !== 'http://127.0.0.1:3500') throw new Error('Origine inattendue');
const request = indexedDB.deleteDatabase('jokkodev-question-drafts-v1');
request.onsuccess = () => console.info('Base de brouillons F1 supprimée pour ce profil de recette.');
request.onblocked = () => console.info('Fermer les autres onglets F1 puis réessayer.');
```

Cette commande est volontairement une suppression de tous les brouillons de l'origine de recette, pas une action courante d'un membre. Dans l'interface, Supprimer ne vise que le compte vérifié et la version affichée. Ne pas effacer globalement IndexedDB/localStorage/cookies/CacheStorage. Pour arrêter les aperçus, identifier leurs PID à partir du manifeste F1 et arrêter seulement ces processus ; arrêter le conteneur `jokkodev-f1-postgres` uniquement après fin de recette, sans toucher Docker Desktop ni aux autres conteneurs. Ne pas supprimer le volume sans décision explicite sur les données fictives à conserver.
