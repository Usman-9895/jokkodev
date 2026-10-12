# Instructions JokkoDev

- Lire README.md et les décisions avant de modifier l’architecture.
- Ousmane pilote frontend/, UX/UI, intégration et coordination. Serge pilote backend/, API, données, authentification et sécurité backend.
- Respecter ces périmètres ; coordonner toute modification transverse dans packages/api-client/.
- Modifier le contrat dans NestJS, puis exécuter pnpm api:generate. Ne jamais recopier manuellement les types générés.
- Ne jamais importer le runtime NestJS ou Prisma dans le navigateur.
- Ne publier aucun secret, cookie, jeton, fichier .env ou donnée privée. Logs sans corps ni secrets.
- Toute source/ ou sources/ est une référence en lecture seule. Ne reprendre aucun ancien code.
- Exécuter lint, typecheck, tests adaptés et build selon les changements ; ne pas inventer les résultats.
- Ne pas créer de modèle métier ou d’authentification factice dans le socle.
- Le dépôt de référence est https://github.com/Usman-9895/jokkodev. Ne pas réinitialiser un dépôt existant, remplacer un remote différent, réécrire l’historique ni effectuer de push forcé.
- main contient les versions stables ; develop sert à l’intégration. Créer une branche par fonctionnalité depuis develop, par exemple feature/auth, feature/questions ou feature/projects, uniquement au début du travail correspondant.
- Chaque PR de fonctionnalité cible develop et décrit le comportement livré, les tests exécutés, les limites et les modifications du contrat API. Ousmane et Serge relisent ; l’auteur ne remplace pas l’approbation indépendante de son partenaire.
- Promouvoir develop vers main par une PR après recette et validation explicite de l’équipe. Aucune fusion automatique.
- Aucun commit, push ou fusion sans validation explicite de l’équipe. Pour la publication initiale, préparer et présenter les fichiers, vérifications et opérations avant de demander cette validation ; aucun commit ni push pendant la préparation.
- Les règles de contribution documentées ne sont pas des protections GitHub effectives : vérifier et signaler leur état réel.
- Aucune migration sur une base existante sans vérifier destination et autorisation. Jamais db push en déploiement.
- Ne pas ajouter de licence au code original sans décision de l’équipe. Vérifier les dépendances directes et transitives ; GPL/LGPL/AGPL exclues du contexte CADEV.
