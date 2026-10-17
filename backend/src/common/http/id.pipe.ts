import { Injectable, type PipeTransform } from '@nestjs/common';
import { ApiException } from './api-exception';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Identifiant de ressource dans l'URL : un format invalide est traité comme une ressource introuvable, jamais transmis à la base. */
@Injectable()
export class IdPipe implements PipeTransform<string, string> {
  constructor(private readonly code: string, private readonly message: string) {}
  transform(value: string): string {
    if (!UUID.test(value)) throw new ApiException(404, this.code, this.message);
    return value.toLowerCase();
  }
}

export const QuestionId = new IdPipe('QUESTION_NOT_FOUND', 'Question introuvable.');
export const AnswerId = new IdPipe('ANSWER_NOT_FOUND', 'Réponse introuvable.');
export const ProjectId = new IdPipe('PROJECT_NOT_FOUND', 'Projet introuvable.');
export const ApplicationId = new IdPipe('APPLICATION_NOT_FOUND', 'Candidature introuvable.');
export const ReportId = new IdPipe('REPORT_NOT_FOUND', 'Signalement introuvable.');
export const UserId = new IdPipe('USER_NOT_FOUND', 'Profil introuvable.');
