import 'reflect-metadata';
import 'dotenv/config';
import type { Server } from 'node:http';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { validateEnvironment } from './config/environment';
import { configureApp, createOpenApi } from './setup';
async function bootstrap() {
  const env = validateEnvironment(process.env);
  const app = await NestFactory.create(AppModule, { bodyParser: false, logger: false });
  configureApp(app, env);
  if (env.nodeEnv !== 'production') SwaggerModule.setup('api/docs', app, createOpenApi(app));
  // Délais bornés : une connexion lente ou abandonnée ne garde pas indéfiniment un emplacement du serveur.
  const server = app.getHttpServer() as Server;
  server.requestTimeout = 30_000;
  server.headersTimeout = 15_000;
  server.keepAliveTimeout = 5_000;
  await app.listen(env.port, env.host);
  console.log(JSON.stringify({ event: 'listening', port: env.port, version: process.env.APP_VERSION ?? 'dev' }));
}
// Seul le message de validation est affiché : il nomme les variables fautives sans jamais citer leurs valeurs.
bootstrap().catch(error => {
  const configuration = error instanceof Error && error.message.startsWith('Configuration invalide') ? ` ${error.message}` : '';
  console.error(`Démarrage impossible.${configuration || ' Vérifier la configuration et la disponibilité du port.'}`);
  process.exitCode = 1;
});
