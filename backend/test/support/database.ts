import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Client } from 'pg';

const migrationsDir = join(__dirname, '..', '..', '..', 'prisma', 'migrations');

export interface TestDatabase { schema: string; url: string; drop(): Promise<void> }

/** Schéma temporaire sur la base TEST_DATABASE_URL, migrations versionnées appliquées. Jamais la base de développement. */
export async function createTestDatabase(): Promise<TestDatabase> {
  const base = process.env.TEST_DATABASE_URL;
  if (!base) throw new Error('TEST_DATABASE_URL requis pour les tests d’intégration PostgreSQL.');
  const schema = `it_${randomBytes(6).toString('hex')}`;
  const client = new Client({ connectionString: base });
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    const dirs = (await readdir(migrationsDir, { withFileTypes: true })).filter(d => d.isDirectory()).map(d => d.name).sort();
    for (const dir of dirs) await client.query(await readFile(join(migrationsDir, dir, 'migration.sql'), 'utf8'));
  } finally { await client.end(); }
  const url = new URL(base);
  url.searchParams.set('schema', schema);
  return {
    schema, url: url.toString(),
    async drop() {
      const admin = new Client({ connectionString: base });
      await admin.connect();
      try { await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); } finally { await admin.end(); }
    }
  };
}

/** Client SQL brut positionné sur le schéma de test, pour préparer ou vérifier des données. */
export async function sqlClient(database: TestDatabase): Promise<Client> {
  const client = new Client({ connectionString: process.env.TEST_DATABASE_URL });
  await client.connect();
  await client.query(`SET search_path TO "${database.schema}"`);
  return client;
}
