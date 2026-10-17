import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiProperty } from '@nestjs/swagger';
export class ApiErrorDto {
  @ApiProperty({ example: 'VALIDATION_ERROR' }) code!: string;
  @ApiProperty({ example: 'Certaines données sont invalides.' }) message!: string;
  @ApiProperty({ type: 'object', additionalProperties: { type: 'array', items: { type: 'string' } } }) fieldErrors!: Record<string, string[]>;
  @ApiProperty() requestId!: string;
}
const defaults: Record<number, [string, string]> = {
  400: ['BAD_REQUEST', 'Requête invalide.'], 401: ['UNAUTHORIZED', 'Authentification requise.'], 403: ['FORBIDDEN', 'Accès refusé.'],
  404: ['NOT_FOUND', 'Ressource introuvable.'], 409: ['CONFLICT', 'L’opération est en conflit avec l’état actuel.'], 413: ['PAYLOAD_TOO_LARGE', 'Requête trop volumineuse.'],
  429: ['RATE_LIMITED', 'Trop de tentatives. Réessayez plus tard.'], 503: ['SERVICE_UNAVAILABLE', 'Service temporairement indisponible.']
};
@Catch()
export class ApiErrorFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const parserStatus = typeof error === 'object' && error !== null && 'type' in error ? (error as { type: string }).type : '';
    const status = error instanceof HttpException ? error.getStatus() : parserStatus === 'entity.too.large' ? 413 : parserStatus === 'entity.parse.failed' ? 400 : 500;
    const body = error instanceof HttpException ? error.getResponse() : undefined;
    const detail = typeof body === 'object' && body !== null ? body as { code?: unknown; message?: unknown; fieldErrors?: unknown; retryAfterSeconds?: unknown } : {};
    const [defaultCode, defaultMessage] = defaults[status] ?? ['INTERNAL_ERROR', 'Une erreur interne est survenue.'];
    // Seules les erreurs construites par l'application portent un code ; les messages internes des exceptions Nest ne sont jamais exposés.
    const known = status < 500 && typeof detail.code === 'string';
    const code = known ? detail.code as string : defaultCode;
    const message = code === 'VALIDATION_ERROR' ? 'Certaines données sont invalides.' : known && typeof detail.message === 'string' ? detail.message : defaultMessage;
    const fieldErrors = known && typeof detail.fieldErrors === 'object' && detail.fieldErrors !== null ? detail.fieldErrors : {};
    if (typeof detail.retryAfterSeconds === 'number') response.setHeader('Retry-After', String(detail.retryAfterSeconds));
    response.status(status).json({ code, message, fieldErrors, requestId: response.locals.requestId });
    // Aucun corps, cookie, URL avec paramètres, erreur SQL ou stack dans les logs.
    if (status >= 500) console.error(JSON.stringify({ event: 'request_failed', status, requestId: response.locals.requestId, method: request.method }));
  }
}
