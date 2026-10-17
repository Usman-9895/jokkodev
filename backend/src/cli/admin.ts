import 'dotenv/config';
import { validateEnvironment } from '../config/environment';
import { createPrismaClient } from '../database/database.service';
import { normalizeEmail } from '../modules/users/identity';

// Provisionnement contrôlé : réservé à un opérateur ayant accès au serveur et à DATABASE_URL.
// Le compte doit exister (inscription normale) et avoir vérifié son email. Toute modification de rôle ferme ses sessions.
async function run(action: string | undefined, rawEmail: string | undefined): Promise<void> {
  if ((action !== 'grant' && action !== 'revoke') || !rawEmail) throw new UsageError();
  const prisma = createPrismaClient(validateEnvironment(process.env).databaseUrl);
  try {
    const email = normalizeEmail(rawEmail);
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true, status: true, emailVerifiedAt: true } });
    if (!user) throw new Error('Compte introuvable.');
    if (action === 'grant' && (user.status !== 'ACTIVE' || !user.emailVerifiedAt)) throw new Error('Le compte doit être actif et avoir vérifié son email.');
    const role = action === 'grant' ? 'ADMIN' : 'MEMBER';
    if (user.role === role) { console.log(JSON.stringify({ event: 'admin_role_unchanged', userId: user.id, role })); return; }
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { role } }),
      prisma.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } })
    ]);
    console.log(JSON.stringify({ event: 'admin_role_changed', userId: user.id, role }));
  } finally { await prisma.$disconnect(); }
}

class UsageError extends Error {}

run(process.argv[2], process.argv[3]).catch(error => {
  console.error(error instanceof UsageError ? 'Usage : pnpm admin:grant <email> | pnpm admin:revoke <email>' : error instanceof Error && !/prisma|postgres/i.test(error.message) ? error.message : 'Opération impossible.');
  process.exitCode = 1;
});
