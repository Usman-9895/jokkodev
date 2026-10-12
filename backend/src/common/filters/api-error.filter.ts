import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiProperty } from '@nestjs/swagger';
export class ApiErrorDto {
  @ApiProperty({ example: 'VALIDATION_ERROR' }) code!: string;
  @ApiProperty({ example: 'Certaines données sont invalides.' }) message!: string;
  @ApiProperty({ type: 'object', additionalProperties: { type: 'array', items: { type: 'string' } } }) fieldErrors!: Record<string, string[]>;
  @ApiProperty() requestId!: string;
}
@Catch()
export class ApiErrorFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const parserStatus = typeof error === 'object' && error !== null && 'type' in error ? (error as { type: string }).type : '';
    const status = error instanceof HttpException ? error.getStatus() : parserStatus === 'entity.too.large' ? 413 : parserStatus === 'entity.parse.failed' ? 400 : 500;
    const body = error instanceof HttpException ? error.getResponse() : undefined;
    const validation = status === 400 && typeof body === 'object' && body !== null && 'code' in body && body.code === 'VALIDATION_ERROR';
    const fields = validation && 'fieldErrors' in body ? body.fieldErrors : {};
    const codes: Record<number, [string, string]> = { 400: ['BAD_REQUEST', 'Requête invalide.'], 401: ['UNAUTHORIZED', 'Authentification requise.'], 403: ['FORBIDDEN', 'Accès refusé.'], 404: ['NOT_FOUND', 'Ressource introuvable.'], 413: ['PAYLOAD_TOO_LARGE', 'Requête trop volumineuse.'], 503: ['SERVICE_UNAVAILABLE', 'Service temporairement indisponible.'] };
    const [code, message] = validation ? ['VALIDATION_ERROR', 'Certaines données sont invalides.'] : codes[status] ?? ['INTERNAL_ERROR', 'Une erreur interne est survenue.'];
    response.status(status).json({ code, message, fieldErrors: fields, requestId: response.locals.requestId });
    // Aucun corps, cookie, URL avec paramètres, erreur SQL ou stack dans les logs.
    if (status >= 500) console.error(JSON.stringify({ event: 'request_failed', status, requestId: response.locals.requestId, method: request.method }));
  }
}
