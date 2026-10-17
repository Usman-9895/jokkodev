import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { validateEnvironment } from '../config/environment';
import type { PrismaClient } from '../generated/prisma/client';
import { PasswordService } from '../modules/auth/passwords.service';
import { createPrismaClient } from './database.service';
import { seedTechnologies } from './seed';

// Jeu de démonstration pour les scénarios de recette : deux membres et un administrateur, contenus préfixés « [Démo] ».
// Les mots de passe sont tirés au hasard à chaque exécution et affichés une seule fois : aucun secret fixe, rien dans le dépôt.
const DOMAIN = 'demo.jokkodev.invalid';
const accounts = [
  { username: 'demo_awa', role: 'MEMBER', bio: 'Compte de démonstration. Développeuse backend à Dakar.', countryCode: 'SN', skills: ['typescript', 'nestjs', 'postgresql'] },
  { username: 'demo_moussa', role: 'MEMBER', bio: 'Compte de démonstration. Développeur mobile à Abidjan.', countryCode: 'CI', skills: ['flutter', 'dart', 'android'] },
  { username: 'demo_admin', role: 'ADMIN', bio: 'Compte administrateur de démonstration.', countryCode: 'SN', skills: [] }
] as const;

async function run(): Promise<void> {
  const env = validateEnvironment(process.env);
  if (env.nodeEnv === 'production' && !process.argv.includes('--confirm-production')) throw new Error('En production, relancer avec --confirm-production.');
  const prisma = createPrismaClient(env.databaseUrl);
  try {
    if (await prisma.user.count({ where: { email: { endsWith: `@${DOMAIN}` } } })) throw new Error('Les données de démonstration existent déjà.');
    await seedTechnologies(prisma);
    const tech = new Map((await prisma.technology.findMany({ select: { id: true, slug: true } })).map(t => [t.slug, t.id]));
    const passwords = new PasswordService();
    const credentials: { email: string; password: string; role: string }[] = [];
    const ids: Record<string, string> = {};
    for (const account of accounts) {
      const password = randomBytes(12).toString('base64url');
      const email = `${account.username}@${DOMAIN}`;
      const user = await prisma.user.create({
        data: {
          email, username: account.username, usernameKey: account.username, passwordHash: await passwords.hash(password), role: account.role, emailVerifiedAt: new Date(),
          profile: { create: { bio: account.bio, countryCode: account.countryCode, skills: { create: account.skills.filter(s => tech.has(s)).map(s => ({ technologyId: tech.get(s) as string })) } } }
        },
        select: { id: true }
      });
      ids[account.username] = user.id;
      credentials.push({ email, password, role: account.role });
    }
    await createContent(prisma, ids, tech);
    console.log(JSON.stringify({ event: 'demo_seeded', accounts: credentials }, null, 2));
    console.log('Conserver ces identifiants dans un gestionnaire de mots de passe ; ils ne seront plus affichés.');
  } finally { await prisma.$disconnect(); }
}

async function createContent(prisma: PrismaClient, ids: Record<string, string>, tech: Map<string, string>): Promise<void> {
  const technologies = (...slugs: string[]) => ({ create: slugs.filter(s => tech.has(s)).map(s => ({ technologyId: tech.get(s) as string })) });
  const resolved = await prisma.question.create({
    data: {
      authorId: ids.demo_awa, title: '[Démo] Prisma renvoie P1001 au démarrage de NestJS',
      context: 'Mon API NestJS se connecte à PostgreSQL via Prisma 7 et l’adaptateur pg. Au démarrage, la première requête échoue.',
      expected: 'La route de santé répond 200 dès que la base est disponible.',
      actual: 'Erreur P1001 : impossible de joindre le serveur de base de données.',
      attempts: 'J’ai vérifié que le conteneur PostgreSQL tourne et que le port est publié.',
      code: 'DATABASE_URL=postgresql://user:password@localhost:5432/app', technologies: technologies('nestjs', 'prisma', 'postgresql')
    }
  });
  const answer = await prisma.answer.create({
    data: { questionId: resolved.id, authorId: ids.demo_moussa, body: 'Dans un conteneur, localhost désigne le conteneur lui-même. Utilise le nom du service ou 127.0.0.1 avec le port publié, puis relance.', code: 'DATABASE_URL=postgresql://user:password@127.0.0.1:5435/app' }
  });
  await prisma.question.update({ where: { id: resolved.id }, data: { acceptedAnswerId: answer.id } });
  await prisma.question.create({
    data: {
      authorId: ids.demo_moussa, title: '[Démo] Flutter perd l’état du formulaire au retour arrière',
      context: 'Application Flutter avec un formulaire en plusieurs étapes et Navigator 2.',
      expected: 'Les champs déjà remplis restent présents au retour.', actual: 'Le formulaire est vide après un retour arrière.',
      attempts: 'J’ai essayé AutomaticKeepAliveClientMixin sans succès.', technologies: technologies('flutter', 'dart')
    }
  });
  await prisma.project.create({
    data: {
      ownerId: ids.demo_moussa, title: '[Démo] Application de covoiturage étudiant',
      objective: 'Mettre en relation les étudiants qui font le même trajet vers le campus pour partager les frais de transport.',
      availability: 'Deux soirées par semaine', technologies: technologies('flutter', 'nestjs', 'postgresql'), members: { create: { userId: ids.demo_moussa } }
    }
  });
  const team = await prisma.project.create({
    data: {
      ownerId: ids.demo_awa, title: '[Démo] Annuaire des communautés tech africaines',
      objective: 'Recenser les communautés de développeurs par pays avec leurs événements et leurs canaux de discussion.',
      recruitmentStatus: 'CLOSED', technologies: technologies('nextjs', 'typescript'), members: { create: [{ userId: ids.demo_awa }, { userId: ids.demo_moussa }] }
    }
  });
  await prisma.application.create({ data: { projectId: team.id, applicantId: ids.demo_moussa, message: 'Je peux prendre en charge la partie mobile et les tests.', status: 'ACCEPTED', decidedAt: new Date() } });
}

run().catch(error => { console.error(error instanceof Error && !/prisma|postgres/i.test(error.message) ? error.message : 'Initialisation de la démonstration impossible.'); process.exitCode = 1; });
