import assert from 'node:assert/strict';
import type { Client } from 'pg';
import { technologies } from '../../src/database/seed';
import { Browser } from './browser';

export const PASSWORD = 'mot de passe solide 2026';

export interface Member { id: string; email: string; username: string; browser: Browser }

/** Compte membre inscrit par l'API, avec un navigateur connecté. */
export async function registerMember(api: string, username: string): Promise<Member> {
  const browser = new Browser(api);
  const email = `${username.toLowerCase()}@example.test`;
  const response = await browser.post('/auth/register', { email, username, password: PASSWORD });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  return { id: response.body.user.id, email, username, browser };
}

/** Compte administrateur : inscription par l'API puis promotion directe en base, comme le ferait pnpm admin:grant. */
export async function registerAdmin(api: string, sql: Client, username: string): Promise<Member> {
  const member = await registerMember(api, username);
  await sql.query(`UPDATE "User" SET role = 'ADMIN', "emailVerifiedAt" = now() WHERE id = $1`, [member.id]);
  return member;
}

/** Catalogue complet ; renvoie slug vers identifiant. */
export async function seedCatalogue(sql: Client): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const [name, slug] of technologies) {
    const { rows } = await sql.query(`INSERT INTO "Technology"(id, name, slug) VALUES (gen_random_uuid(), $1, $2) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`, [name, slug]);
    map.set(slug, rows[0].id);
  }
  return map;
}
