# Décision 002 — modèle de données initial

État : proposé par Serge le 17 octobre 2026, à valider avec Ousmane avant fusion dans `develop`. Implémentation sur `feature/database-schema` : schéma Prisma, migration `init`, catalogue des technologies et tests d'intégration PostgreSQL. Aucune route métier ni changement du contrat OpenAPI.

## Choix retenus dans la proposition

| Sujet | Proposition | Motif |
|---|---|---|
| Identifiants | UUIDv7 générés par Prisma, colonne `uuid` | Opaques côté API, ordonnés dans le temps (index compacts), sans séquence devinable |
| Dates | `timestamptz(3)` | UTC sans ambiguïté, précision milliseconde suffisante pour le tri |
| Email | Stocké normalisé : NFC, `trim`, minuscules ; 254 caractères | Unicité fiable ; la base refuse une forme non normalisée |
| Pseudonyme | `username` affiché et `usernameKey = lower(username)` unique ; 3 à 30 caractères `[A-Za-z0-9_]` | Unicité insensible à la casse sans extension `citext` ; jeu de caractères ASCII qui évite les homoglyphes |
| Question | Champs structurés `context`, `expected`, `actual`, `attempts` obligatoires, `code` facultatif | Reprend le formulaire guidé du cahier des charges et du plan backend |
| Réponse | `body` et `code` facultatif | Même séparation texte / code que la question |
| Visibilité | Énumération `VISIBLE` / `HIDDEN` sur Question, Answer et Project | Masquage réversible, historique dans ModerationAction |
| Signalement | Trois FK facultatives et CHECK d'unicité de cible | Intégrité référentielle, contrairement à une cible polymorphe |
| Décisions de modération | `NO_ACTION`, `HIDE_CONTENT`, `SUSPEND_ACCOUNT` | Liste du plan backend B08 |
| Suppression | `RESTRICT` sur les contenus et comptes, cascade sur profil, sessions, jetons et liaisons | Aucune perte involontaire d'historique |
| Session | Empreinte SHA-256 de 32 octets aléatoires ; expiration absolue et activité | Voir [décision 003](003-sessions-csrf.md) |

## Points à trancher avec Ousmane

1. **Format du contenu.** Le frontend manipule des blocs `paragraph` / `code` avec intitulés. Le backend propose des champs nommés ; le frontend construit ses blocs à partir d'eux. Confirmer ce découpage et si le code doit porter un langage (`codeLanguage`), absent du cahier des charges.
2. **Code de la réponse.** Garder un champ `code` séparé ou un seul `body` en Markdown restreint.
3. **Pseudonyme.** Valider la règle `[A-Za-z0-9_]{3,30}` ; elle exclut les lettres accentuées.
4. **Pays.** Code ISO alpha-2 ; la liste affichée est à fournir par le frontend.
5. **Catalogue des technologies.** 50 entrées dans `backend/src/database/seed.ts`, à compléter ou réduire ensemble.
6. **Vérification de l'email avant contribution.** Le champ `emailVerifiedAt` existe ; la règle d'obligation reste à décider (plan backend B03).

## Vérifications

- Base vide : migration appliquée par `prisma migrate dev` sur PostgreSQL 17.11.
- Absence de dérive : `prisma migrate diff` base / schéma vide.
- `pnpm test:integration` : 14 tests sur base réelle (unicités, CHECK, FK composite, index partiels, `RESTRICT`).
- Catalogue rejoué deux fois : 50 créations puis 0.
