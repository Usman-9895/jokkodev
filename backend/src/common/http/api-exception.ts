import { HttpException } from '@nestjs/common';

// Erreur métier au format commun : code stable pour le frontend, message destiné à l'utilisateur, aucune donnée saisie reflétée.
export class ApiException extends HttpException {
  constructor(status: number, code: string, message: string, options: { fieldErrors?: Record<string, string[]>; retryAfterSeconds?: number } = {}) {
    super({ code, message, fieldErrors: options.fieldErrors ?? {}, retryAfterSeconds: options.retryAfterSeconds }, status);
  }
}
