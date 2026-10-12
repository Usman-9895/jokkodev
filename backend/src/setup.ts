import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import express from 'express';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ApiErrorFilter } from './common/filters/api-error.filter';
import { strictValidation } from './common/pipes/validation';
import type { Environment } from './config/environment';
export function configureApp(app: INestApplication, env: Environment): void {
  app.setGlobalPrefix('api/v1');
  app.getHttpAdapter().getInstance().set('trust proxy', false);
  app.use((request: Request, response: Response, next: NextFunction) => {
    const requestId = randomUUID();
    response.locals.requestId = requestId;
    response.setHeader('X-Request-Id', requestId);
    response.setHeader('Cache-Control', 'no-store');
    response.on('finish', () => console.log(JSON.stringify({ event: 'request', requestId, method: request.method, status: response.statusCode })));
    next();
  });
  app.use(helmet());
  app.use(express.json({ limit: '64kb' }));
  app.use(express.urlencoded({ extended: false, limit: '64kb', parameterLimit: 100 }));
  if (env.corsOrigins.length) app.enableCors({ origin: env.corsOrigins, credentials: true, methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'X-CSRF-Token'], exposedHeaders: ['X-Request-Id'] });
  app.useGlobalPipes(strictValidation());
  app.useGlobalFilters(new ApiErrorFilter());
  app.enableShutdownHooks();
}
export function createOpenApi(app: INestApplication) {
  return SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('JokkoDev API').setDescription('Fondations techniques. Aucune fonctionnalité métier.').setVersion('1.0.0').build());
}
