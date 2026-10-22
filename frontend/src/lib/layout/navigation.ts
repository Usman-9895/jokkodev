import type {components} from '@jokkodev/api-client';
const links=[{href:'/questions',label:'Questions',section:'/questions'},{href:'/projets',label:'Projets',section:'/projets'},{href:'/admin/signalements',label:'Administration',section:'/admin'}] as const;
export function primaryNavigation(role:components['schemas']['CurrentUserDto']['role']|undefined,pathname:string){return links.filter(link=>link.section!=='/admin'||role==='ADMIN').map(link=>({...link,active:pathname===link.section||pathname.startsWith(link.section+'/')}));}
