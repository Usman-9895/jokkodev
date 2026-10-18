# Bilan central d’intégration frontend — pour Serge

État du lot 10 : socle backend #10–#18 et correctif #20 fusionnés, #19 exclue. Comptes, session et profils raccordés aux endpoints réels ; les autres domaines restent à intégrer. Le frontend n’est pas déclaré prêt à la production. Sources contractuelles : [guide API](../api/frontend-integration.md), [sessions/CSRF](../decisions/003-sessions-csrf.md). Détails et limites de ce raccordement : [lot 10](auth-integration.md).

## Points d’intégration et références

| Périmètre préparé | Raccordement et référence |
| --- | --- |
| Accueil, styles, animations, pause/réduction des mouvements | [Accueil](homepage.md), [composants](design-system.md) : remplacer les extraits fictifs par les sources publiques réelles. |
| Questions : recherche, filtres, pagination URL, détail et réponses | [Consultation JokkoHelp](jokkohelp-read.md) : liste paginée serveur et détail, contenu sûr, compteurs, technologies/statuts et erreurs distinguables. |
| Comptes et profils | [Intégration lot 10](auth-integration.md) : opérations réelles raccordées, recette dédiée et gestion session/CSRF ; [lot 4](accounts-profiles.md) conserve les références visuelles historiques. |
| Questions et réponses, solution acceptée | [Contributions](jokkohelp-contributions.md) : création/modification, listes personnelles, réponse et permissions d’acceptation/retrait. |
| Projets publics et gestion | [JokkoProjects](jokkoprojects.md) : consultation paginée et filtrée, création/modification, catégories personnelles, statuts/recrutement et membres publics. |
| Tableau de bord et candidatures | [Dashboard/candidatures](dashboard-applications.md) : résumé, candidatures envoyées/reçues, décisions, conflits et effet réel sur l’appartenance. |
| Signalements et modération minimale | [Signalements](reports-moderation.md) : cibles/motifs, création et doublons, lecture administrateur, transitions et effets indépendants ou atomiques confirmés, motifs/historique. |
| Pages d’information | [Lot 9](information-quality.md) : textes à valider, confidentialité et coordonnées différées. Contact reste une orientation, sans formulaire nouveau. |

Les listes détaillées par domaine restent dans ces guides pour éviter leur divergence ; leurs constats d’absence de backend sont historiques. Les contrats livrés font référence dans le guide API. Ne pas traiter les URL et états de démonstration comme contrats réseau.

## Socle transversal livré et intégration restante

Le backend livre identité/session, cookies et expiration/révocation, CSRF, autorisations, erreurs structurées, conflits et pagination. Le guide API et les décisions décrivent leurs règles : les domaines suivants doivent encore être raccordés et recettés côté frontend. Les choix produit encore ouverts restent dans les décisions. Les mots de passe, tokens, secrets et cookies ne doivent pas apparaître dans les URL, logs ou stockage navigateur. Aucun rôle administrateur persistant fictif ne débloque le frontend. Un administrateur n’obtient pas automatiquement les candidatures privées.

Après modification du contrat NestJS par son responsable, générer le client via `pnpm api:generate` ; ne pas remplacer les types générés par des copies manuelles. Remplacer les sources fictives par des adaptateurs confirmés, sans filtrer localement une seule page d’API comme une collection complète. Coordonner les changements transverses de `packages/api-client/`.

## Démonstrations et contenus à remplacer

L’[inventaire des routes](routes.md) distingue pages produit, attentes et aperçus. Tous les `/dev/*` sont réservés au développement et doivent rester en 404 en production. Les fixtures publiques de questions/projets restent signalées comme fictives. Les profils produit utilisent désormais les données réelles, sans exposer d’email public. Les autres listes personnelles, permissions, décisions et historiques restent des aperçus ; les pages /espace sont désormais protégées par la session réelle mais leurs domaines non intégrés restent en attente. L’administration produit reste sans données privées ni opération active. Les aperçus seront retirés ou maintenus strictement hors production après intégration, jamais utilisés pour contourner une session réelle.

À fournir/valider par Ousmane et l’équipe : rédaction des règles, texte de confidentialité et informations factuelles nécessaires (opérateur, contact, hébergement/prestataires, traitements/finalités, destinataires, durées et droits), coordonnées de contact, signature officielle DevTeranga, contenu À propos/Ressources et éventuels textes contractuels. Les illustrations simplifiées et écarts de chaque lot restent consignés dans leurs guides. Aucun traceur, service d’analyse ou bannière de consentement ajouté.

## Recette nécessaire après intégration

Utiliser des comptes de test dédiés. Vérifier succès réels et erreurs, expiration et nettoyage du cache privé, CSRF, accès directs sans session, séparation candidat/responsable/administrateur, conflits et doubles soumissions, transitions et compteurs retournés par le serveur, confidentialité des données et absence de secrets. Vérifier les URLs, filtres/pagination côté serveur et retour depuis détail sur les vraies sources.

Rejouer lint, TypeScript, tests, build, garde production des aperçus, parcours navigateur aux quatre largeurs, clavier/focus, animations/pause et contrôles HTTP des contenus introuvables avec et sans streaming. Compléter lecteurs d’écran, appareils physiques, navigateurs cibles, zoom réel et environnement de déploiement. Les tests de démonstration ne prouvent ni l’autorisation serveur ni le fonctionnement métier réel.
