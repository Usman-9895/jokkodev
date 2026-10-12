import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { validateEnvironment } from '../config/environment';
@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private client?: PrismaClient;
  get prisma(): PrismaClient {
    // Initialisation différée : aucune connexion pendant l'export OpenAPI ou la liveness.
    this.client ??= new PrismaClient({ adapter: new PrismaPg({ connectionString: validateEnvironment(process.env).databaseUrl, connectionTimeoutMillis: 2000, query_timeout: 2000, statement_timeout: 2000, max: 5 }), log: [] });
    return this.client;
  }
  async ping(): Promise<void> { await this.prisma.$queryRaw`SELECT 1`; }
  async onApplicationShutdown(): Promise<void> { await this.client?.$disconnect(); }
}
