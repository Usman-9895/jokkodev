import 'reflect-metadata';
import { mkdir, writeFile } from 'node:fs/promises';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createOpenApi } from './setup';
async function run() {
  const app = await NestFactory.create(AppModule, { logger: false });
  try { app.setGlobalPrefix('api/v1'); const document = createOpenApi(app); await mkdir('../docs/api', { recursive: true }); await writeFile('../docs/api/openapi.json', JSON.stringify(document, null, 2) + '\n'); }
  finally { await app.close(); }
}
run().catch(() => { console.error('Export OpenAPI échoué.'); process.exitCode = 1; });
