# État laissé pour revue

Worktree : `D:\DEV\JokkoDev\.cache\lot21\worktree`, branche `fix/security-audit-remediation`, base `d300b0ba17fbf8d0665c26f6cad52c17ac0011a2`. Changements produit, configuration, dépendances, tests, notices et documentation locaux, **aucun fichier indexé et aucun commit**. Le dossier principal reste propre sur `feature/teranga-points-integration`, HEAD `2876bfeb4f9ae4010deab4ce404c90cc5091f88d`.

Les 56 entrées du manifeste de l’audit lot 20 ont des empreintes inchangées. Ses fichiers non commités sont préservés dans son propre worktree ; pas de réécriture des anciennes assertions ou alertes. Le nouveau dossier comprend les seules preuves utiles au lot 21, sans comptes ou configurations privées.

Recette du lot 21 arrêtée après vérification : derniers backend PID 52676 (33301) et frontend PID 9680 (33300). Les premiers PID 50692/30528 avaient été arrêtés pour reconstruire leur `.next`. Les processus IP, nginx, smoke et Chrome créés pour les tests sont fermés ; aucun listener sur 33300/33301/33303/33304/33305/33309/33310/33311/9296, aucun conteneur/réseau temporaire du lot restant. Les bases, comptes, messages et photos fictifs sont conservés localement pour une revue/reprise explicite, pas purgés.

Les recettes préexistantes sur 33070/33071, 33080/33081, 33090/33091, 33100/33101, 33120/33121 répondent toutes readiness HTTP 200 au dernier contrôle. Leurs PIDs sont inchangés par rapport au constat de l’audit. Aucun service d’équipe ni PostgreSQL redémarré. Cela ne diagnostique pas les anciens 503 ou 500 d’autres lots.

La correction reste dans ce worktree et n’est pas appliquée aux anciens services. [Procédure locale](reproduction.md) pour relancer notre recette sur son origine canonique, après vérification des ports et destinations. Secrets, emails, comptes, stockage, captures, logs et builds sont ignorés et exclus des fichiers proposés à publication. Aucune publication, action GitHub d’écriture ou autorisation d’exposition publique n’est déduite de cette livraison.
