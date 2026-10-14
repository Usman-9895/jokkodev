# Lot 3 — consultation locale de JokkoHelp

Branche `feature/frontend-jokkohelp-read`, créée depuis develop au commit `2eae2e5` après vérification que le lot 2 (`d124536`) est fusionné. Après revue visuelle, l’équipe a autorisé le commit, le push de cette branche et une PR vers `develop`. Aucune fusion ni fusion automatique autorisée. Backend, types générés, package API, dépendances et verrouillage pnpm inchangés.

Le contrat OpenAPI et `packages/api-client/src/schema.d.ts` ne contiennent que `/api/v1/health/live` et `/api/v1/health/ready`. Les clients centralisés serveur/navigateur ont été inspectés ; aucun endpoint de consultation ni session réelle n’est disponible. La consultation utilise donc exclusivement des exemples publics et explicitement fictifs.

## Routes et paramètres

| Route | Fonction |
|---|---|
| `/questions` | Liste, recherche, technologie, état et pagination |
| `/questions/[id]` | Détail public, réponses et solution acceptée |
| `/questions/poser` | Page d’attente du lot 2 ; aucun envoi |
| `/questions/actions` | Explication des futures réponses, modifications, acceptations et signalements |
| `/dev/jokkohelp?state=...` | Aperçu d’états réservé au développement, absent de la navigation publique et à 404 en production |

Paramètres **locaux de présentation**, pas un contrat backend inventé :

- `q` : texte de recherche, espaces extérieurs retirés, limité à 200 caractères. Recherche sans casse/accents, tous les mots doivent correspondre au titre, extrait, auteur ou technologies.
- `technology` : libellé exact d’une technologie du catalogue de démonstration ; valeur inconnue ignorée.
- `status` : `all` par défaut, `resolved` ou `open`. Le statut découle de la présence d’une solution acceptée dans les exemples.
- `page` : entier positif, défaut 1 ; trois questions par page. Une page au-delà des résultats est redirigée vers la dernière page disponible. Paramètres invalides ou multiples gérés sans exception ; premier exemplaire d’un paramètre retenu.

Le formulaire natif GET fonctionne sans JavaScript. L’enhancement Next.js applique les critères au bouton Rechercher ou avec Entrée, réinitialise la page et conserve le défilement. Les critères/page restent dans l’URL ; les liens de détail emportent uniquement ces paramètres autorisés. Fil d’Ariane et retour à la liste les restituent, sans accepter de destination de retour arbitraire. Réinitialiser revient à `/questions`.

## Source et cohérence des données

`lib/jokkohelp/fixtures.ts` contient neuf questions et leurs réponses. `query.ts` normalise les critères, recherche et filtre **tous** les exemples, trie par date décroissante puis pagine. `helpSource` est le point asynchrone de remplacement pour les futures lectures. `model.ts` décrit uniquement la présentation locale ; il ne copie pas des types API générés.

Le fournisseur `source.ts` est réservé au serveur avec `server-only`. Les formats d’affichage sont séparés dans `presentation.ts` ; l’aperçu client relit directement les exemples publics. Cette séparation évite d’importer un futur fournisseur API serveur dans le navigateur.

Les exemples `demo-jwt` et `demo-mongodb` de l’accueil sont dérivés de la même source que la liste et le détail ; leurs liens conduisent désormais au bon détail. Les compteurs proviennent des réponses effectivement présentes, et une solution appartient à sa question. Les auteurs, pays, dates et contenus sont fictifs, signalés sur la page. Dates ISO avec UTC dans les exemples, format d’affichage français en UTC. Les identifiants `demo-*` ne définissent pas le format des futurs identifiants API.

Quand Serge fournira le contrat, le modifier dans NestJS puis exécuter `pnpm api:generate`. Remplacer le fournisseur de lecture et convertir la réponse publique en modèle de présentation. Recherche/filtres/pagination doivent alors être délégués au serveur sur l’ensemble des données ; ne pas filtrer uniquement une page reçue. Aucun import NestJS/Prisma dans le navigateur. Ne pas réutiliser le catalogue local comme enum backend.

## Composants, rôles et contenus

`QuestionFilters`, `QuestionCard`, `QuestionPagination`, `QuestionTips`, `QuestionContent`, `ReadState`, `ReadLoading` et `ReadError` réutilisent les primitives, tokens, polices et navigation des lots 1/2. Style scoped dans `styles/jokkohelp.css`. Pas de gestionnaire d’état global ou bibliothèque supplémentaire.

La consultation est publique. Le header ne simule pas Awa connectée, contrairement à la variante d’auteur de la maquette. Aucun éditeur de réponse ni bouton fonctionnel accepter/retirer/modifier/signaler ; un lien décrit les actions futures. La solution acceptée est une information de lecture, jamais un contrôle de permission.

Contenus locaux : blocs de paragraphes et de code, rendus comme texte React échappé. Pas de HTML non fiable, de `dangerouslySetInnerHTML` ou de moteur Markdown ajouté. JetBrains Mono pour le code ; seul le pre peut défiler horizontalement et recevoir le focus clavier. La copie utilise l’API Clipboard native et indique son résultat réel ou son indisponibilité ; le bouton est désactivé avant hydratation ou si l’API manque.

Les animations restent mesurées : transitions de navigation/boutons/menu héritées, aucun effet rejoué à chaque frappe. Le chargement de liste conserve la présentation des critères ; les erreurs conservent l’URL et permettent un reset/rechargement. Mouvement réduit respecté par les styles communs.

## États et limites

État vide de source distinct de zéro résultat de recherche. Question sans réponse disponible à `/questions/demo-postgresql-cloud`. Question inexistante traitée par `notFound()` et message générique, sans affirmer une distinction absent/masqué/403 que le contrat ne fournit pas. Aucun état d’accès administratif inventé dans JokkoHelp.

Les boundaries Next de chargement/erreur sont installées pour liste et détail. Le fournisseur local immédiat ne reproduit pas une vraie latence ou panne réseau : les états `loading`, `detail-loading`, `empty`, `error`, `detail-error`, `not-found` et `long` sont injectés explicitement dans l’aperçu de développement. Réessayer dans cet aperçu relit les exemples locaux ; ce n’est pas une réussite métier.

Différences assumées des données par rapport aux PNG : auteur/date cohérents entre liste et détail, compteurs issus des réponses locales et PostgreSQL non résolue car aucune réponse/solution n’est inventée. Initiales au lieu des photos conformément aux notes. Labels permanents, bouton de recherche et cibles 44 px ajoutent de la hauteur. Illustrations d’états simplifiées, carte Natural Earth et légende en Source Serif italique, sans nouvelle police manuscrite ou asset de marque. Signature DevTeranga encore provisoire selon le lot 2.

## Examiner et vérifier

`pnpm dev:frontend`, puis http://localhost:3000/questions et http://localhost:3000/questions/demo-session-nestjs.

Tests de logique : `node --test tests/*.test.mjs`. Revue Chrome/Chromium installé : `node scripts/review-jokkohelp.mjs`, `CHROME_PATH` si nécessaire. Ports 3000/9223 libres ; pour conserver un frontend déjà actif, définir `JOKKOHELP_REVIEW_REUSE=1`. Le script ne ferme que les processus qu’il lance. Captures et diagnostics dans `.cache/design-system/lot-3/`, ignorés par Git. Toutes les vérifications portent sur la démonstration, pas sur une API de consultation réelle.

Voir `lot-3-verification.md` pour les résultats réellement exécutés et les limites. Attendre la validation visuelle avant toute publication.
