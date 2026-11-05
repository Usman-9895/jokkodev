# JokkoDev — s’entraider, puis construire ensemble

**Dossier G1 à relire — 5 novembre 2026.** Projet porté par DevTeranga pour la CADEV. [Visiter JokkoDev](https://jokkodev.com/) · [Preuves et limites](grille-criteres.md) · [Démonstration en trois minutes](parcours-demonstration.md).

## Le problème et le public

Un développeur bloqué a besoin de décrire son problème, de comprendre une réponse et de trouver des personnes avec qui avancer. Une connexion instable peut interrompre cette démarche. JokkoDev s’adresse aux développeurs débutants ou confirmés et aux porteurs de projets de l’écosystème africain ; cette orientation est une intention de service, pas une mesure d’adoption.

## Deux parcours complémentaires

**[JokkoHelp](https://jokkodev.com/questions)** permet de rechercher des questions, lire les réponses, poser une question structurée avec du code et désigner une solution acceptée. Exemple : expliquer le contexte d’une erreur, le résultat attendu, le résultat obtenu et les essais déjà effectués pour faciliter une réponse utile.

**[JokkoProjects](https://jokkodev.com/projets)** permet de découvrir des projets et leurs technologies, proposer un projet et candidater pour le rejoindre. Le responsable traite les candidatures ; les contacts de collaboration restent réservés aux personnes autorisées. Les actions de membre seront montrées sur des comptes fictifs locaux, sans alimenter le site public.

## Ce que nous voulons montrer

- **Reconnaître l’aide utile :** une réponse éligible acceptée par un autre membre rapporte **10 Teranga Points** à son auteur. Le serveur tient un journal et compense les points si la solution est retirée ou le contenu masqué. Il ne s’agit pas d’une certification de compétence. [Règle et preuves](../frontend/teranga-points.md).
- **Continuer à apprendre sans réseau :** trois guides publics restent consultables **24 heures après leur préparation en ligne**, sous réserve que le navigateur conserve le stockage. Questions, projets et données privées ne sont pas archivés par la PWA. [Périmètre exact](grille-criteres.md#p2--guides-hors-connexion).
- **Reprendre sans publier deux fois :** depuis un formulaire ouvert avec une session vérifiée, le membre peut enregistrer un brouillon ou figer une question en attente sur son appareil. Il revient en ligne, vérifie son compte et choisit quand envoyer. Après une réponse perdue, la même tentative retrouve le résultat serveur. Conservation locale : **7 jours, 256 Kio par copie**. [Parcours F2](../frontend/question-pending-publication.md).

Le site public est déployé au SHA `dd6d537e34ca62fc25719476535f193eac1d70f9`. La prévention des doublons après réponse perdue est prouvée sur **PostgreSQL local**, pas par une publication de recette en production. L’installation sur appareil physique et les transitions authentifiées de production restent à confirmer ; GitHub Actions est en `startup_failure`. Le dossier ne revendique ni métrique d’usage ni conformité globale de sécurité ou de licences.
