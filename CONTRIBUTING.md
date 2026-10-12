# Contribuer

Ousmane : frontend, UX/UI, intégration et coordination. Serge : backend, API, données, authentification et sécurité. Les deux relisent le contrat partagé et les décisions transverses.

Le dépôt de référence est [Usman-9895/jokkodev](https://github.com/Usman-9895/jokkodev). L’équipe conserve `main` pour les versions stables et `develop` pour l’intégration. Chaque fonctionnalité possède sa propre branche, créée progressivement depuis `develop` : futurs exemples `feature/auth`, `feature/questions`, `feature/projects`. Aucune branche de fonctionnalité n’est créée pour la publication du socle.

Après la publication initiale, préparer une fonctionnalité ainsi :

```sh
git switch develop
git pull --ff-only origin develop
git switch -c feature/questions
```

Cet exemple illustre un futur travail, à exécuter seulement au démarrage de la fonctionnalité correspondante. Si l’historique diverge, inspecter et coordonner l’intégration ; aucun reset destructif ni push forcé.

Chaque PR de fonctionnalité cible **develop**. Elle décrit le comportement livré, les tests réellement exécutés, les limites et les changements de contrat API. Ousmane et Serge effectuent la revue ; l’auteur relit son changement et son partenaire donne l’approbation indépendante. Pour un changement transverse, les deux périmètres sont examinés. Toute fusion exige une validation explicite de l’équipe et reste manuelle.

La promotion de **develop vers main** passe également par une PR, après recette des parcours concernés et validation explicite. Ne pas créer de PR entre les branches identiques lors de la publication initiale : elles établissent le même socle. Ne pas activer la fusion automatique.

1. Se synchroniser sur le périmètre et décrire le comportement attendu.
2. Garder les fonctions métier dans leur application. TypeScript strict ; noms explicites ; DTO distincts des modèles de stockage. Composants serveur par défaut.
3. Si l’API change : décorer les DTO/réponses NestJS, exécuter pnpm api:generate, relire docs/api/openapi.json et les types générés ensemble.
4. Exécuter pnpm lint, pnpm typecheck, pnpm test et pnpm build. Ajouter des tests de comportement proportionnés ; pas de tests d’existence de dossiers.
5. Mettre à jour documentation, exemples d’environnement et inventaire de licences en cas de dépendance nouvelle.
6. Faire relire par Ousmane et Serge et attendre la validation explicite avant tout commit, push ou fusion. Ne pas joindre de secrets ou de logs contenant des données personnelles. Les résultats locaux ne remplacent pas une protection de branche configurée sur GitHub.

Configuration : variables serveur sans préfixe NEXT_PUBLIC_ ; exemples sans secret réel. Erreurs structurées, requestId et messages non sensibles. Le serveur reste l’autorité des permissions.

Les fondations ne constituent pas un MVP fonctionnel : readiness positive sur PostgreSQL réel, exécution Linux et audit complet des licences restent à vérifier ; authentification et fonctionnalités métier restent à développer. Voir [vérifications](docs/verification.md) et [plan de publication et protections](docs/publication/initial-publication.md).
