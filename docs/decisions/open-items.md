# Décisions ouvertes et fonctions reportées (backend)

État au 17 octobre 2026. Chaque point est à trancher avec Ousmane ; les comportements actuels sont des choix par défaut réversibles.

## Décisions à confirmer

| Sujet | Comportement actuel | Référence |
|---|---|---|
| Vérification de l'email avant contribution | Non exigée ; `emailVerified` exposé pour l'interface | Décision 003 |
| Durées de session et de jetons | 7 jours, inactivité 24 h ; réinitialisation 30 min ; vérification 24 h | Décision 003 |
| Inscription avec un email existant | 409 `EMAIL_TAKEN` (révèle l'existence du compte) | Décision 003 |
| Bibliothèque CSRF | `csrf-csrf` 4.0.3 | Décision 003 |
| Règle du pseudonyme | `[A-Za-z0-9_]{3,30}`, sans accents | Décision 002 |
| Contenu des questions | Quatre rubriques nommées et code facultatif, sans langage du code | Décision 002 |
| Catalogue des technologies | 50 entrées | `backend/src/database/seed.ts` |
| Limites de publication | 10 questions, 30 réponses, 5 projets, 20 candidatures, 20 signalements par heure et par compte | Services correspondants |
| Fournisseur SMTP et domaine expéditeur | Non choisi | Runbook, section 7 |
| Service Datacloud, stockage hors serveur des sauvegardes | Non disponible | Runbook |
| Portée de l'exclusion GPL/LGPL/AGPL (système, outils, images) | À confirmer dans le règlement CADEV | `docs/licenses/open-questions.md` |
| Licence du code original | Aucune | README |

## Fonctions reportées

- **Teranga Points (B11)** : implémenté dans une PR séparée (décision 004), barème proposé de 10 points. Fusion à décider le 21 octobre selon le cahier des charges.
- Suppression de compte, transfert de responsabilité d'un projet, départ ou exclusion d'un membre, nouvelle candidature après refus.
- Restauration d'un contenu masqué et réactivation d'un compte suspendu (aucune route ; intervention manuelle en base, tracée par l'équipe, si nécessaire).
- Votes, commentaires, pièces jointes, notifications, messagerie.
- Recherche plein texte PostgreSQL (la recherche actuelle est une requête paramétrée sur titre et rubriques ; à revoir après mesure).
- Limitation partagée entre plusieurs processus API.
