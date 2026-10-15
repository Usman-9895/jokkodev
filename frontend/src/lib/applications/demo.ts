import {projectExamples} from '../jokkoprojects/fixtures';
import type {DemoApplicationStatus} from './presentation';
export interface DemoApplication { id:string; projectId:string; candidate:string; technologies:string[]; message:string; status:DemoApplicationStatus; date:string }
/** Données strictement réservées aux aperçus ; aucun stockage ni adaptateur réseau. */
export const sentApplicationExamples: DemoApplication[] = [
  {id:'demo-sent-library',projectId:'demo-projet-6',candidate:'Awa',technologies:['React'],message:'Je peux contribuer à l’interface et à la documentation.',status:'pending',date:'2026-10-12T09:00:00Z'},
  {id:'demo-sent-ateliers',projectId:'demo-ressources-dev',candidate:'Awa',technologies:['React'],message:'Je souhaite contribuer à la bibliothèque de ressources.',status:'accepted',date:'2026-10-11T09:00:00Z'},
  {id:'demo-sent-tutorat',projectId:'demo-tutorat',candidate:'Awa',technologies:['TypeScript'],message:'Je souhaite partager des exemples accessibles.',status:'refused',date:'2026-10-10T09:00:00Z'},
  {id:'demo-sent-typescript',projectId:'demo-projet-7',candidate:'Awa',technologies:['TypeScript'],message:'Présentation d’un ancien message fictif.',status:'withdrawn',date:'2026-10-09T09:00:00Z'},
];
export const receivedApplicationExamples: DemoApplication[] = [
  {id:'demo-received-moussa',projectId:'demo-associations',candidate:'Moussa Ba',technologies:['NestJS','PostgreSQL'],message:'Je peux contribuer à l’API et aux tests du backend.',status:'pending',date:'2026-10-12T09:00:00Z'},
  {id:'demo-received-binta',projectId:'demo-associations',candidate:'Binta Fall',technologies:['React','TypeScript'],message:'Je souhaite améliorer l’interface et l’expérience mobile.',status:'pending',date:'2026-10-12T10:00:00Z'},
];
export function demoProject(id:string) { return projectExamples.find(project=>project.id===id); }
