# Bilan central d’intégration frontend — pour Serge

État du lot 9 : interfaces préparées, **aucune opération métier intégrée**. `backend/src/app.module.ts` importe uniquement `HealthModule` ; `packages/api-client/src/schema.d.ts` expose seulement `/api/v1/health/live` et `/api/v1/health/ready`. Le transport partagé et le proxy existent ; ils ne constituent pas une API de comptes, contributions ou modération. Le frontend n’est pas prêt à une mise en production métier.

## Points d’intégration, sans inventer les endpoints

| Périmètre préparé | Contrat attendu et référence unique |
| --- | --- |
| Accueil, styles, animations, pause/réduction des mouvements | [Accueil](homepage.md), [composants](design-system.md) : remplacer les extraits fictifs par les sources publiques réelles. |
| Questions : recherche, filtres, pagination URL, détail et réponses | [Consultation JokkoHelp](jokkohelp-read.md) : liste paginée serveur et détail, contenu sûr, compteurs, technologies/statuts et erreurs distinguables. |
| Comptes et profils | [Comptes/profils](accounts-profiles.md) : inscription, connexion, session, déconnexion, vérification/renvoi email, récupération/renouvellement, profil public et sauvegarde propriétaire. |
| Questions et réponses, solution acceptée | [Contributions](jokkohelp-contributions.md) : création/modification, listes personnelles, réponse et permissions d’acceptation/retrait. |
| Projets publics et gestion | [JokkoProjects](jokkoprojects.md) : consultation paginée et filtrée, création/modification, catégories personnelles, statuts/recrutement et membres publics. |
| Tableau de bord et candidatures | [Dashboard/candidatures](dashboard-applications.md) : résumé, candidatures envoyées/reçues, décisions, conflits et effet réel sur l’appartenance. |
| Signalements et modération minimale | [Signalements](reports-moderation.md) : cibles/motifs, création et doublons, lecture administrateur, transitions et effets indépendants ou atomiques confirmés, motifs/historique. |
| Pages d’information | [Lot 9](information-quality.md) : textes à valider, confidentialité et coordonnées différées. Contact reste une orientation, sans formulaire nouveau. |

Les listes détaillées par domaine restent dans ces guides pour éviter leur divergence. Ne pas traiter les URL et états de démonstration comme contrats réseau.

## Socle transversal attendu

Serge doit confirmer identité/session courante, cookies et expiration/révocation, mécanisme CSRF, autorisations serveur par opération et contenu, format/association des erreurs de validation, gestion des conflits, règles de pagination/tri et redirections internes autorisées. Les mots de passe, tokens, secrets et cookies ne doivent pas apparaître dans les URL, logs ou stockage navigateur. Aucun rôle administrateur persistant fictif ne débloque le frontend. Un administrateur n’obtient pas automatiquement les candidatures privées.

Après modification du contrat NestJS par son responsable, générer le client via `pnpm api:generate` ; ne pas remplacer les types générés par des copies manuelles. Remplacer les sources fictives par des adaptateurs confirmés, sans filtrer localement une seule page d’API comme une collection complète. Coordonner les changements transverses de `packages/api-client/`.

## Démonstrations et contenus à remplacer

L’[inventaire des routes](routes.md) distingue pages produit, attentes et aperçus. Tous les `/dev/*` sont réservés au développement et doivent rester en 404 en production. Les fixtures publiques de questions/projets restent signalées comme fictives ; les profils, listes personnelles, permissions, décisions et historiques n’existent que dans les aperçus. Les routes produit privées restent des attentes publiques sans données privées ni faux succès. Les aperçus seront retirés ou maintenus strictement hors production après intégration, jamais utilisés pour contourner une session réelle.

À fournir/valider par Ousmane et l’équipe : rédaction des règles, texte de confidentialité et informations factuelles nécessaires (opérateur, contact, hébergement/prestataires, traitements/finalités, destinataires, durées et droits), coordonnées de contact, signature officielle DevTeranga, contenu À propos/Ressources et éventuels textes contractuels. Les illustrations simplifiées et écarts de chaque lot restent consignés dans leurs guides. Aucun traceur, service d’analyse ou bannière de consentement ajouté.

## Recette nécessaire après intégration

Utiliser des comptes de test dédiés. Vérifier succès réels et erreurs, expiration et nettoyage du cache privé, CSRF, accès directs sans session, séparation candidat/responsable/administrateur, conflits et doubles soumissions, transitions et compteurs retournés par le serveur, confidentialité des données et absence de secrets. Vérifier les URLs, filtres/pagination côté serveur et retour depuis détail sur les vraies sources.

Rejouer lint, TypeScript, tests, build, garde production des aperçus, parcours navigateur aux quatre largeurs, clavier/focus, animations/pause et contrôles HTTP des contenus introuvables avec et sans streaming. Compléter lecteurs d’écran, appareils physiques, navigateurs cibles, zoom réel et environnement de déploiement. Les tests de démonstration ne prouvent ni l’autorisation serveur ni le fonctionnement métier réel.
