# Bilan central d’intégration frontend — pour Serge

État du lot 16 : socle backend #10–#18 et correctif #20 fusionnés, #19 exclue. Comptes, session, profils, JokkoHelp, JokkoProjects, candidatures, tableau de bord et modération minimale raccordés aux endpoints réels. Le frontend n’est pas déclaré prêt à la production. Sources contractuelles : [guide API](../api/frontend-integration.md), [sessions/CSRF](../decisions/003-sessions-csrf.md). Détails : [comptes/profils lot 10](auth-integration.md) et [JokkoHelp lot 11](jokkohelp-integration.md) et [JokkoProjects lot 12](jokkoprojects-integration.md) et [tableau de bord/candidatures lot 13](dashboard-applications-integration.md) et [modération lot 14](moderation-integration.md).

## Points d’intégration et références

| Périmètre préparé | Raccordement et référence |
| --- | --- |
| Accueil, styles, animations, pause/réduction des mouvements | [Accueil](homepage.md), [composants](design-system.md) : dernières questions désormais réelles ; autres extraits selon leur lot. |
| Questions : recherche, filtres, pagination URL, détail et réponses | [Intégration JokkoHelp](jokkohelp-integration.md) : liste/détail/réponses et dernières questions réels ; catalogue, filtres et pagination serveur. |
| Comptes et profils | [Intégration lot 10](auth-integration.md) : opérations réelles raccordées, recette dédiée et gestion session/CSRF ; [lot 4](accounts-profiles.md) conserve les références visuelles historiques. |
| Questions et réponses, solution acceptée | [Intégration JokkoHelp](jokkohelp-integration.md) : création/modification, Mes questions, réponses et solution raccordées ; droits serveur et session réels. |
| Projets publics et gestion | [JokkoProjects lot 12](jokkoprojects-integration.md) : consultation, catalogue/recherche/filtres/pagination serveur, création/modification, recrutement, catégories personnelles et membres publics réels. Candidatures raccordées au lot 13. |
| Tableau de bord et candidatures | [Intégration dashboard/candidatures](dashboard-applications-integration.md) : compteurs réels, candidatures envoyées/reçues, décisions, conflits et adhésion transactionnelle ; [recette réelle](lot-13-verification.md). |
| Signalements et modération minimale | [Intégration modération](moderation-integration.md) : signalements réels et doublons, accès ADMIN, liste/détail/historique et résolution atomique ; [recette](lot-14-verification.md). |
| Pages d’information | [Lot 9](information-quality.md) : textes à valider, confidentialité et coordonnées différées. Contact reste une orientation, sans formulaire nouveau. |

Les listes détaillées par domaine restent dans ces guides pour éviter leur divergence ; leurs constats d’absence de backend sont historiques. Les contrats livrés font référence dans le guide API. Ne pas traiter les URL et états de démonstration comme contrats réseau.

## Socle transversal livré et intégration restante

Le backend livre identité/session, cookies et expiration/révocation, CSRF, autorisations, erreurs structurées, conflits et pagination. Le guide API et les décisions décrivent leurs règles : les domaines sont raccordés selon les rapports de lots ; le lot 14 est fusionné ; la recette globale du lot 15 est validée localement par Ousmane, avec publication pour revue autorisée ; aucune autorisation de déploiement ou promotion vers main. Les choix produit encore ouverts restent dans les décisions. Les mots de passe, secrets, cookies et jetons de session ne doivent pas apparaître dans les URL, logs ou stockages navigateur. Les tokens à usage unique des liens de compte suivent le contrat du lot10 et ne sont pas journalisés. Aucun rôle administrateur persistant fictif ne débloque le frontend. Un administrateur n’obtient pas automatiquement les candidatures privées.

Après modification du contrat NestJS par son responsable, générer le client via `pnpm api:generate` ; ne pas remplacer les types générés par des copies manuelles. Remplacer les sources fictives par des adaptateurs confirmés, sans filtrer localement une seule page d’API comme une collection complète. Coordonner les changements transverses de `packages/api-client/`.

## Démonstrations et contenus à remplacer

L’[inventaire des routes](routes.md) distingue pages produit, attentes et aperçus. Tous les `/dev/*` sont réservés au développement et doivent rester en 404 en production. Questions et projets produit utilisent l’API sans repli fictif. Les profils produit utilisent désormais les données réelles, sans exposer d’email public. Les candidatures, leur détail privé, les décisions de responsable et le tableau de bord utilisent désormais l’API réelle sous SessionGate. L’administration minimale utilise une session ADMIN réelle, la liste privée, le détail et la résolution atomique. Les aperçus historiques demeurent isolés ; l’espace développeur conserve une seule navigation. Les aperçus seront retirés ou maintenus strictement hors production après intégration, jamais utilisés pour contourner une session réelle.

À fournir/valider par Ousmane et l’équipe : rédaction des règles, texte de confidentialité et informations factuelles nécessaires (opérateur, contact, hébergement/prestataires, traitements/finalités, destinataires, durées et droits), coordonnées de contact, signature officielle DevTeranga, contenu À propos/Ressources et éventuels textes contractuels. Les illustrations simplifiées et écarts de chaque lot restent consignés dans leurs guides. Aucun traceur, service d’analyse ou bannière de consentement ajouté.

## Recette nécessaire après intégration

Utiliser des comptes de test dédiés. Vérifier succès réels et erreurs, expiration et nettoyage du cache privé, CSRF, accès directs sans session, séparation candidat/responsable/administrateur, conflits et doubles soumissions, transitions et compteurs retournés par le serveur, confidentialité des données et absence de secrets. Vérifier les URLs, filtres/pagination côté serveur et retour depuis détail sur les vraies sources.

Rejouer lint, TypeScript, tests, build, garde production des aperçus, parcours navigateur aux quatre largeurs, clavier/focus, animations/pause et contrôles HTTP des contenus introuvables avec et sans streaming. Compléter lecteurs d’écran, appareils physiques, navigateurs cibles, zoom réel et environnement de déploiement. Les tests de démonstration ne prouvent ni l’autorisation serveur ni le fonctionnement métier réel.

## Recette globale et livraison — lot 15

Voir le [rapport central de livraison](../release/readiness.md) pour la matrice réel/API/navigateur, les corrections ciblées, la CI préparée mais non exécutée à distance, les limites404/streaming et les préalables priorisés. Le tri des membres est limité à la page reçue ; le motif d’un signalement à réponse perdue reste désormais lisible, sans faux succès ni renvoi. Les neuf aperçus404 sont inclus dans le smoke. Les [notices et contenus provisoires](../licenses/lot15-audit.md) restent des validations distinctes. Fonctionnement local, automatisation, aptitude au déploiement cible et validation de production ne sont pas équivalents.

## Lot 16 — recette fonctionnelle validée

[Navigation, animation et auto-signalement](navigation-self-report-animation.md) : entrée Administration principale partagée, commande pause/lecture accessible, interdiction serveur403 SELF_REPORT_FORBIDDEN pour toute cible propre, ADMIN compris. Contrat régénéré depuis NestJS ; pas de migration ou dépendance. Recette dédiée sur33080/33081. Les lots précédents et leurs données sont préservés. Recette fonctionnelle validée par Ousmane ; publication autorisée pour revue vers develop, sans fusion. Production toujours non validée.
