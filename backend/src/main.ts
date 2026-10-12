import 'reflect-metadata';
import 'dotenv/config';
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
  await app.listen(env.port, env.host);
  console.log(JSON.stringify({ event: 'listening', port: env.port }));
}
bootstrap().catch(() => { console.error('Démarrage impossible. Vérifier la configuration et la disponibilité du port.'); process.exitCode = 1; });
