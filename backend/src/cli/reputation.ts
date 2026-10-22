import 'dotenv/config';
import { validateEnvironment } from '../config/environment';
import { createPrismaClient, type DatabaseService } from '../database/database.service';
import { ReputationService } from '../modules/reputation/reputation.service';

async function run(): Promise<void> {
  const url = validateEnvironment(process.env).databaseUrl;
  // No implicit write to an existing database: operator confirms the exact database name.
  const destination = new URL(url);
  const name = decodeURIComponent(destination.pathname.slice(1));
  if (!name || process.env.REPUTATION_REBUILD_DATABASE !== name) throw Error('Destination non confirmée.');
  console.log(JSON.stringify({event:'reputation_destination',host:destination.hostname,port:destination.port || '5432',database:name}));
  const prisma = createPrismaClient(url);
  try {
    const service = new ReputationService({prisma} as DatabaseService);
    console.log(JSON.stringify({event:'reputation_rebuilt',...await service.rebuild()}));
  } finally { await prisma.$disconnect(); }
}
run().catch(()=>{console.error('Reconstruction impossible : vérifier destination, schéma, disponibilité et journaux sans secrets.');process.exitCode=1;});
