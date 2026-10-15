// Proposition éditoriale séparée du rendu ; aucune politique juridique applicable.
export const communityRules = [
 {id:'respect',title:'Respecter les personnes',icon:'users',tone:'blue',text:'Échange avec bienveillance et respect. Les désaccords se discutent avec des arguments, sans discrimination, harcèlement ou propos offensants.'},
 {id:'questions',title:'Poser des questions utiles',icon:'chat',tone:'green',text:'Décris clairement ton problème et partage le contexte, ce que tu as déjà essayé et, si possible, un extrait de code. Une question compréhensible facilite l’entraide.'},
 {id:'solutions',title:'Partager des solutions claires',icon:'document',tone:'violet',text:'Explique ton raisonnement et partage un exemple lisible lorsque cela aide à comprendre. Indique les sources ou les liens utiles pour permettre à chacun de progresser.'},
 {id:'informations-privees',title:'Protéger les informations privées',icon:'lock',tone:'amber',text:'Ne partage pas de mots de passe, de clés d’API ou d’informations personnelles et confidentielles. Retire ou anonymise les éléments sensibles de tes questions et réponses.'},
 {id:'signalement',title:'Signaler plutôt que répondre à un abus',icon:'flag',tone:'red',text:'Face à un contenu inapproprié, privilégie le signalement plutôt que l’escalade. Les entrées « Signaler » sont préparées ; l’envoi reste indisponible tant que le service n’est pas intégré.'},
] as const;
export const privacyDraft = [
 {title:'Ton compte',icon:'user',tone:'blue',text:'À préciser : informations nécessaires au compte, finalités, accès et récupération. Les opérations de compte ne sont pas encore intégrées.'},
 {title:'Ton profil public',icon:'document',tone:'green',text:'Périmètre prévu : pseudonyme, biographie, compétences et liens publics. Les champs et leur visibilité réelle doivent être confirmés avant publication.'},
 {title:'Tes candidatures',icon:'users',tone:'violet',text:'Périmètre prévu : consultation par le candidat et le responsable du projet. Les autorisations serveur restent à intégrer et à vérifier.'},
 {title:'Les signalements',icon:'flag',tone:'red',text:'Périmètre prévu : traitement réservé à l’administration. Les accès, informations conservées et modalités de traitement restent à confirmer.'},
 {title:'Les sessions',icon:'clock',tone:'amber',text:'Le mécanisme de session, ses cookies éventuels et leurs durées restent à définir par le backend. Aucun mécanisme n’est affirmé dans cette version de travail.'},
] as const;
export const publicInformationLinks = [{href:'/regles',label:'Règles communautaires'},{href:'/confidentialite',label:'Confidentialité'},{href:'/contact',label:'Contact'}] as const;
