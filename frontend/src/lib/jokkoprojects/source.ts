import 'server-only';
import {projectExamples} from './fixtures';
import {selectProjects} from './query';
import type {ProjectCriteria} from './query';
import type {ProjectView} from './model';
/** Frontière de remplacement par un adaptateur API après publication du contrat. */
export interface ProjectSource { list(criteria:ProjectCriteria):Promise<ReturnType<typeof selectProjects>>;detail(id:string):Promise<ProjectView|null> }
export const projectSource:ProjectSource={list:async c=>selectProjects(c,projectExamples),detail:async id=>projectExamples.find(p=>p.id===id)??null};
