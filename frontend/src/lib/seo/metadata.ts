import type {Metadata} from 'next';
export const SITE_ORIGIN='https://jokkodev.com';
export const SITE_DESCRIPTION='Rejoins JokkoDev : pose tes questions techniques, partage des solutions et trouve des collaborateurs pour construire des projets avec des développeurs africains.';
export const publicPages=[
 {path:'/',title:'JokkoDev — Entraide et projets entre développeurs africains',description:SITE_DESCRIPTION},
 {path:'/questions',title:'JokkoHelp — Questions et entraide entre développeurs | JokkoDev',description:'Pose tes questions de programmation, découvre les réponses de la communauté et partage des solutions techniques sur JokkoHelp.'},
 {path:'/projets',title:'JokkoProjects — Projets collaboratifs entre développeurs | JokkoDev',description:'Découvre des projets, les compétences recherchées et les possibilités de collaboration entre développeurs sur JokkoProjects.'},
 {path:'/ressources',title:'Ressources pour apprendre et collaborer | JokkoDev',description:'Bien poser une question, partager une solution, rejoindre un projet : retrouve les guides JokkoDev et les documentations officielles.'},
 {path:'/a-propos',title:'À propos — La communauté des développeurs africains | JokkoDev',description:'Découvre JokkoDev, plateforme panafricaine d’entraide et de collaboration portée par Ousmane Mbacké Dieng et Serge Senghor, équipe DevTeranga au Sénégal.'},
 {path:'/contact',title:'Contact — Équipe DevTeranga | JokkoDev',description:'Contacte l’équipe JokkoDev pour une question, un retour sur la plateforme ou une demande concernant tes données personnelles.'},
 {path:'/regles',title:'Règles communautaires — Respect et entraide | JokkoDev',description:'Découvre les règles de JokkoDev : échanges respectueux, réponses utiles, partage du code, collaboration et signalement des contenus.'},
 {path:'/confidentialite',title:'Confidentialité et données personnelles | JokkoDev',description:'Comprends les données publiques et privées de JokkoDev, les cookies de session, les durées de conservation et les moyens de contacter l’équipe.'},
] as const;
export function pageMetadata(path:string,title:string,description:string,index=true):Metadata{
 const url=SITE_ORIGIN+path;
 return {title,description,alternates:{canonical:url},robots:{index,follow:true},
 openGraph:{type:'website',locale:'fr_FR',siteName:'JokkoDev',url,title,description,images:[{url:SITE_ORIGIN+'/brand/jokkodev-original.png',alt:'JokkoDev — entraide et collaboration'}]},
 twitter:{card:'summary',title,description,images:[SITE_ORIGIN+'/brand/jokkodev-original.png']}};
}
export function staticMetadata(path:string):Metadata{const page=publicPages.find(p=>p.path===path);if(!page)throw Error('Page SEO inconnue');return pageMetadata(page.path,page.title,page.description);}
export function excerpt(value:string,max=160){return Array.from(value.replace(/\s+/g,' ').trim()).slice(0,max).join('');}
export const privateRobots={index:false,follow:false} as const;

export const websiteSchema={'@context':'https://schema.org','@type':'WebSite',name:'JokkoDev',url:SITE_ORIGIN+'/',inLanguage:'fr',description:SITE_DESCRIPTION};
