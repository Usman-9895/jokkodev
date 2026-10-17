import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { validateEnvironment } from '../config/environment';

// Référentiel commun aux profils, questions et projets. Idempotent : rejouable sans doublon, y compris en production.
export const technologies: ReadonlyArray<readonly [name: string, slug: string]> = [
  ['JavaScript', 'javascript'], ['TypeScript', 'typescript'], ['Python', 'python'], ['Java', 'java'], ['Kotlin', 'kotlin'],
  ['PHP', 'php'], ['C#', 'csharp'], ['C', 'c'], ['C++', 'cpp'], ['Go', 'go'], ['Rust', 'rust'], ['Dart', 'dart'], ['Swift', 'swift'],
  ['HTML', 'html'], ['CSS', 'css'], ['SQL', 'sql'], ['Bash', 'bash'],
  ['React', 'react'], ['Next.js', 'nextjs'], ['Vue.js', 'vuejs'], ['Angular', 'angular'], ['Svelte', 'svelte'], ['Tailwind CSS', 'tailwind-css'],
  ['Node.js', 'nodejs'], ['NestJS', 'nestjs'], ['Express', 'express'], ['Django', 'django'], ['Flask', 'flask'], ['FastAPI', 'fastapi'],
  ['Laravel', 'laravel'], ['Spring Boot', 'spring-boot'], ['.NET', 'dotnet'], ['Flutter', 'flutter'], ['React Native', 'react-native'], ['Android', 'android'],
  ['PostgreSQL', 'postgresql'], ['MySQL', 'mysql'], ['MongoDB', 'mongodb'], ['Redis', 'redis'], ['SQLite', 'sqlite'], ['Prisma', 'prisma'],
  ['Docker', 'docker'], ['Kubernetes', 'kubernetes'], ['Linux', 'linux'], ['Git', 'git'], ['Nginx', 'nginx'],
  ['GraphQL', 'graphql'], ['REST', 'rest'], ['Machine Learning', 'machine-learning'], ['Sécurité', 'securite']
];

export async function seedTechnologies(prisma: PrismaClient): Promise<number> {
  const result = await prisma.technology.createMany({ data: technologies.map(([name, slug]) => ({ name, slug })), skipDuplicates: true });
  return result.count;
}

async function run() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: validateEnvironment(process.env).databaseUrl }) });
  try {
    const created = await seedTechnologies(prisma);
    console.log(JSON.stringify({ event: 'seed', technologiesCreated: created, technologiesTotal: await prisma.technology.count() }));
  } finally { await prisma.$disconnect(); }
}
if (require.main === module) run().catch(() => { console.error('Initialisation des données échouée.'); process.exitCode = 1; });
