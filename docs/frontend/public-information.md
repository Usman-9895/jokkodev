# Pages publiques — finalisation du 26 octobre 2026

Branche : `feature/public-information`, base actualisée `origin/develop` `b1ff9ea807a732dc13994651aab5833cb9230ef1` après fusion #32, le 27 octobre 2026.

## Décisions explicites d’Ousmane

- Contact : `contact@jokkodev.com`, boîte LWS créée et réception vérifiée par Ousmane.
- Responsables publiés : **Ousmane Mbacké Dieng & Serge Senghor, pour l’équipe DevTeranga — Sénégal**. Aucune société enregistrée, adresse postale ou qualification de délégué n’est inventée.
- Le bouton Contact ouvre un lien `mailto:` ; l’adresse est visible et copiable. Pas de formulaire serveur, accusé d’envoi fictif ni permission d’envoi d’email par l’agent.
- Les durées proposées ont été validées par Ousmane le 26 octobre 2026 : voir [décision 007](../decisions/007-data-retention.md). Les mécanismes préparés sont fusionnés dans develop (#32) mais non déployés ni activés. La notice présente les durées adoptées et leurs limites sans annoncer un effacement déjà effectué.

## Changements

- `/a-propos` : mission, fonctionnalités réelles, reconnaissance Teranga Points, équipe et contexte CADEV. Aucun emploi, financement, résultat de concours ou certification de compétence promis.
- `/contact` : orientation vers l’entraide, signalement réel et contact email ; suppression des mentions d’indisponibilité obsolètes. Copie avec retour accessible et indication de recours à la copie manuelle si le presse-papiers est refusé.
- `/regles` : respect, qualité des questions et réponses, secrets, droits sur le code, réputation et modération avec recours par email.
- `/confidentialite` : contenu accessible publiquement, visibilité, finalités, informations obligatoires/facultatives, cookies, sessions, photos, candidatures, contact partagé, modération, conservation et demandes manuelles.
- Inscription : retrait de la phrase obsolète « Les textes définitifs restent à valider », sans transformer la création de compte en consentement générique à toutes les finalités.
- Métadonnées des quatre routes mises à jour. L’aperçu `/dev/informations` garde son refus en production.

## Sources techniques et limites de la notice

Vérifiés dans la base de code : `backend/src/modules/auth/auth.constants.ts` (session 7 jours / inactivité 24 h / validation email 24 h / renouvellement 30 min), `auth.controller.ts`, `csrf.ts` (cookies de session navigateur pour préconnexion et CSRF), projections utilisateur, accès aux candidatures et contacts, décision 005 (photos réencodées), décision 004 de suppression et journal de réputation. L’expiration fonctionnelle des jetons n’est pas présentée comme une suppression physique de leurs enregistrements.

L’hébergement Systalink à Madrid, le fournisseur SMTP Resend configuré en Irlande, les sauvegardes quotidiennes avec rétention locale 7 jours et les copies externes manuelles proviennent de la recette VPS effectuée par Ousmane dans ce chat. Le prestataire de réception est LWS, pas Resend. Pas d’affirmation « toutes les données restent en Europe » : Resend distingue région d’envoi et stockage aux États-Unis.

Sources primaires consultées le 26 octobre 2026 :

- [CDP Sénégal — comprendre vos droits](https://www.cdp.sn/particulier/comprendre-vos-droits) : information, accès, opposition, rectification et suppression ; durées et transferts à renseigner.
- [CDP Sénégal — obligations](https://www.cdp.sn/obligations-entreprises) : catégories d’information à communiquer.
- [Resend — sécurité et conservation](https://resend.com/security) : stockage américain, région d’envoi, conservation annoncée de 30 jours pour les offres standard. Aucune vérification du plan réel depuis le compte Resend n’a été effectuée par l’agent.

**Cette notice décrit l’existant et ne vaut pas validation juridique ou attestation de conformité.** Avant ouverture publique, l’équipe doit mettre en œuvre les durées de conservation retenues dans la décision 007 et le traitement des demandes. L’absence actuelle d’activation des nouveaux traitements automatiques est annoncée ; ce lot frontend ne les active pas.

## Décisions restant à régler avant publication

1. Déployer puis valider par simulation et activer progressivement les traitements préparés selon la décision 007 et docs/operations/data-retention.md ; organiser les revues humaines et le suivi des exceptions. La durée d’une candidature encore en attente reste à décider. Ne pas présenter un délai cible comme appliqué sans procédure effective et coordination backend.
2. Contrôler sur le VPS les durées réelles des journaux nginx/systemd et les éventuelles copies fournisseurs ; appliquer la rétention retenue de 30 jours maximum pour les copies externes manuelles. La rétention locale utilise `find -mtime +7` lors d’une sauvegarde réussie : ce n’est pas une garantie d’effacement à exactement 168 heures.
3. Vérifier avec les responsables les formalités CDP applicables au traitement et aux transferts hors du Sénégal ; aucune déclaration, autorisation ou conformité générale n’est supposée acquise.
4. Organiser la consultation de la boîte contact et le traitement manuel des demandes et contestations. Aucune suppression automatique de compte ni export de données n’est ajouté.
5. Validation éditoriale des responsables avant publication. Une approbation de l’interface ne constitue pas une validation juridique.

## Design et recette

Références examinées : maquettes 23 Règles, 24 Confidentialité, 25 Contact, charte du skill `jokkodev-ui-fidelity`. Même palette, polices locales, cartes, pictogrammes et composants. À propos n’a pas de maquette approuvée fournie ; composition dérivée des composants existants, sans identité nouvelle. La confidentialité est plus longue que la planche pour rendre les limites et prestataires explicites.

Les résultats exécutés et les preuves sont consignés dans `public-information-verification.md`. Aucune opération sur la base, migration, secret, SMTP, nginx ou service du VPS. Aucun commit, push, PR ou déploiement sans validation explicite.


## Publication préparée le 27 octobre 2026

La fusion de #32 est vérifiée. La décision 007 présente dans develop est identique à celle validée ; elle n’est pas dupliquée dans cette PR. Seuls les pages et documents frontend diffèrent de la nouvelle base. Les durées adoptées sont affichées avec la mention explicite de traitements préparés mais non activés ; le texte devra être actualisé après activation effective. Aucun backend, migration, dépendance ou contrat modifié par cette PR.

La revue des captures a révélé une règle tablette qui gardait deux cartes Contact côte à côte en mobile. La grille est rétablie à une colonne sous 768 px. Les captures et contrôles ont été repris après correction, sans modifier les tokens ni l’identité approuvée. Le texte plus long de confidentialité et le contact copiable restent des adaptations documentées des maquettes 23–25. La page /ressources reste hors périmètre.
