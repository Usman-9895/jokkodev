import 'dotenv/config';
import { validateEnvironment } from '../config/environment';
import { createPrismaClient } from '../database/database.service';
import { ReputationService } from '../modules/reputation/reputation.service';
import type { DatabaseService } from '../database/database.service';

// Aligne le registre Teranga Points sur l'état actuel des solutions, question par question, sous le même verrou que
// l'acceptation. Idempotent : un second passage n'écrit rien. Utile à l'activation du module sur une base existante.
async function run(): Promise<void> {
  const prisma = createPrismaClient(validateEnvironment(process.env).databaseUrl);
  try {
    const reputation = new ReputationService({ prisma } as DatabaseService);
    const questions = await prisma.question.findMany({ where: { OR: [{ acceptedAnswerId: { not: null } }, { reputation: { some: {} } }] }, select: { id: true } });
    const before = await prisma.reputationEvent.count();
    for (const { id } of questions) {
      await prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM "Question" WHERE id = ${id}::uuid FOR UPDATE`;
        await reputation.syncQuestion(tx, id);
      });
    }
    console.log(JSON.stringify({ event: 'reputation_rebuilt', questions: questions.length, eventsWritten: (await prisma.reputationEvent.count()) - before }));
  } finally { await prisma.$disconnect(); }
}

run().catch(() => { console.error('Reconstruction impossible.'); process.exitCode = 1; });
