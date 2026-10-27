export const resourceGuides=[
 {id:'question',title:'Poser une question qui aide à comprendre',icon:'code',description:'Un bon contexte permet à la communauté de te répondre plus vite.',steps:['Donne un titre précis et choisis les technologies concernées.','Décris le contexte, le résultat attendu et ce que tu obtiens.','Ajoute les pistes essayées et un exemple de code court, sans secret.'],href:'/questions/poser',action:'Préparer ma question'},
 {id:'reponse',title:'Partager une réponse utile',icon:'book',description:'Explique la démarche pour aider la personne et les prochains lecteurs.',steps:['Lis la question et vérifie que ta réponse traite le problème.','Explique ta solution et ses limites ; précise ce que tu as testé.','Cite les sources et respecte les licences du code partagé.'],href:'/questions',action:'Explorer les questions'},
 {id:'projet',title:'Trouver des personnes avec qui construire',icon:'users',description:'Un objectif clair et des attentes réalistes facilitent la collaboration.',steps:['Présente le problème, l’objectif du projet et les compétences recherchées.','Précise les disponibilités et le périmètre de la contribution.','Après acceptation, le contact partagé reste facultatif et réservé aux collaborateurs autorisés.'],href:'/projets',action:'Découvrir les projets'},
] as const;

// Liens vers les sources officielles, vérifiés le 27 octobre 2026 ; aucun contenu tiers recopié ou embarqué.
export const documentationResources=[
 {title:'Les bases du web',source:'MDN Web Docs',language:'Français',description:'Apprendre HTML, CSS et JavaScript, avec des guides progressifs.',href:'https://developer.mozilla.org/fr/docs/Learn_web_development',tag:'Débuter'},
 {title:'Git et le travail en équipe',source:'Pro Git',language:'Français',description:'Comprendre les commits, les branches et les bases de la collaboration.',href:'https://git-scm.com/book/fr/v2',tag:'Collaborer'},
 {title:'Construire avec Next.js',source:'Documentation Next.js',language:'Anglais',description:'Retrouver les guides du framework et choisir la version de son projet.',href:'https://nextjs.org/docs',tag:'Frontend'},
 {title:'Structurer une API avec NestJS',source:'Documentation NestJS',language:'Anglais',description:'Explorer les modules, contrôleurs et mécanismes de sécurité du framework.',href:'https://docs.nestjs.com/',tag:'Backend'},
 {title:'Comprendre PostgreSQL',source:'Documentation PostgreSQL',language:'Anglais',description:'Consulter les manuels SQL et sélectionner la version de sa base.',href:'https://www.postgresql.org/docs/',tag:'Données'},
] as const;
