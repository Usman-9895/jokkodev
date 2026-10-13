/** Exemples de la maquette, sans endpoint ni données de production. À remplacer via le contrat réel. */
export const homeQuestionExamples = [
  { id: 'demo-jwt', title: 'Comment gérer l’authentification JWT avec Node.js et Express ?', excerpt: 'Je voudrais mettre en place une authentification JWT dans une API Express. J’ai du mal à bien organiser les middlewares et la gestion du rafraîchissement des tokens. Avez-vous des bonnes pratiques ?', technologies: ['Node.js', 'Express', 'JWT', 'Sécurité'], resolved: true, date: '2025-04-12', displayDate: '12 avr. 2025' },
  { id: 'demo-mongodb', title: 'Problème de connexion à une base de données MongoDB sur Render', excerpt: 'Mon application fonctionne en local mais j’obtiens une erreur de connexion lorsque je la déploie sur Render. Une idée de ce qui pourrait causer ce problème ?', technologies: ['MongoDB', 'Render', 'Déploiement', 'Node.js'], resolved: false, date: '2025-04-10', displayDate: '10 avr. 2025' },
] as const;
