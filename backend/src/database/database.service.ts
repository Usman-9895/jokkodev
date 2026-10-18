import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { validateEnvironment } from '../config/environment';
@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private client?: PrismaClient;
  get prisma(): PrismaClient {
    // Initialisation différée : aucune connexion pendant l'export OpenAPI ou la liveness.
    this.client ??= createPrismaClient(validateEnvironment(process.env).databaseUrl);
    return this.client;
  }
  async ping(): Promise<void> { await this.prisma.$queryRaw`SELECT 1`; }
  async onApplicationShutdown(): Promise<void> { await this.client?.$disconnect(); }
}

// Le paramètre ?schema= de l'URL sélectionne le schéma PostgreSQL (public par défaut) ; utilisé par les tests d'intégration.
export function createPrismaClient(databaseUrl: string): PrismaClient {
  const url = new URL(databaseUrl);
  const schema = url.searchParams.get('schema') ?? 'public';
  url.searchParams.delete('schema');
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString(), options: `-c search_path="${schema.replaceAll('"', '')}"`, connectionTimeoutMillis: 5000, query_timeout: 10000, statement_timeout: 10000, max: 10 }, { schema }), log: [] });
}
