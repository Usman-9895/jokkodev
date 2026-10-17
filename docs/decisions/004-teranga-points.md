# Décision 004 — Teranga Points

État : implémenté sur `feature/teranga-points` le 17 octobre 2026 (lot B11, P1). **Le barème reste à valider** : la fusion dans `develop` vaut décision d'activation, à prendre le 21 octobre selon le cahier des charges, une fois le P0 livré, testé et déployé. Sans cette PR, les parcours P0 fonctionnent à l'identique.

## Règles

- L'auteur d'une réponse acceptée par l'auteur de la question reçoit `POINTS_PER_ACCEPTED_ANSWER` points, **10 dans la proposition** (`backend/src/modules/reputation/reputation.service.ts`).
- Accepter sa propre réponse ne rapporte rien.
- Changer de solution retire les points de l'ancienne et les attribue à la nouvelle ; retirer la solution les retire.
- Masquer la réponse acceptée ou la question retire les points. La suspension d'un compte ne touche pas ses points.
- Aucun badge, classement ni récompense. Aucune route ne permet de modifier un score.

## Mise en œuvre

Registre append-only `ReputationEvent` (bénéficiaire, question, réponse, delta, motif, rang). Le score est la somme des mouvements, exposé dans `terangaPoints` du profil public et privé. Après chaque changement de solution ou de visibilité, dans la même transaction et sous le verrou de la question, le service compare l'attribution attendue à la somme enregistrée et n'écrit que la différence. Conséquences :

- une acceptation répétée ou simultanée n'écrit rien de plus ;
- un cycle accepter, retirer, réaccepter laisse le score attendu avec un historique complet ;
- un échec d'écriture du registre annule le changement de solution ;
- l'unicité (réponse, rang) et des CHECK en base interdisent une double écriture et un mouvement de sens incohérent.

`pnpm reputation:rebuild` aligne le registre sur l'état actuel des solutions, de façon idempotente : à lancer une fois si le module est activé sur une base qui contient déjà des solutions.

## Décision attendue

1. Valeur du barème (10 proposé).
2. Neutralisation au masquage (appliquée) ; règle de réattribution si une restauration de contenu est un jour ajoutée.
3. Affichage frontend : score sur le profil uniquement, ou aussi à côté des auteurs.
