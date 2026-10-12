# Modèle conceptuel futur — non implémenté

| Entité | Responsabilité et relations prévues |
|---|---|
| User / Profile | Compte, statut, pseudonyme et informations publiques séparées des données privées |
| Session / AccountToken | Session opaque révocable ; jetons de compte expirants à usage unique |
| Technology | Référentiel lié aux profils, questions et projets |
| Question / Answer | Auteur, contenus, question par réponse, solution acceptée facultative |
| Project | Propriétaire, présentation et recrutement |
| Application | Candidat, projet et état de candidature |
| ProjectMember | Adhésion d’un membre à un projet |
| Report | Déclarant, exactement une cible, état de traitement |
| ModerationAction | Acteur autorisé, décision et traçabilité minimale |

Invariants à traduire en contraintes PostgreSQL et transactions :

- Email et pseudonyme normalisés uniques ; fixer la politique Unicode/casse avant les migrations.
- Une candidature par membre et projet ; une adhésion par membre et projet.
- Une solution acceptée appartient à sa question (contrainte relationnelle composite à concevoir).
- Un signalement vise exactement une question, une réponse ou un projet (CHECK SQL).
- Un seul signalement ouvert par déclarant et cible (index partiels uniques, avec définition explicite des états ouverts).
- Acceptations de candidature, adhésions, choix de solution et actions de modération nécessitent des transactions ; vérifier les courses concurrentes.

Prisma ne remplace pas les contraintes de base : les CHECK/index non exprimables dans le schéma seront ajoutés dans des migrations SQL relues. Aucune migration ni table métier n’est présente. Teranga Points est exclu de ce modèle initial.
