import { Prisma, type PrismaClient } from '../../generated/prisma/client';
import { type Page, type PageQueryDto, pageWindow } from './pagination';
import { likeContains } from './text';

type SearchQuery = PageQueryDto & { q?: string; technology?: string; status?: string };
/** Same NFD accent folding as the public frontend; no extension or migration required (PostgreSQL UTF8). */
function folded(expression: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`lower(regexp_replace(normalize(${expression}, NFD), '[̀-ͯ]', '', 'g'))`;
}

/** All criteria apply before COUNT/LIMIT. Static identifiers, bound values, one repeatable-read snapshot. */
export async function searchPage<T>(client: PrismaClient, kind: 'question' | 'project', query: SearchQuery,
  load: (tx: Prisma.TransactionClient, ids: string[]) => Promise<T[]>): Promise<Page<T>> {
  const question = kind === 'question';
  const table = question ? Prisma.sql`"Question"` : Prisma.sql`"Project"`;
  const relation = question ? Prisma.sql`"QuestionTechnology"` : Prisma.sql`"ProjectTechnology"`;
  const relationId = question ? Prisma.sql`jt."questionId"` : Prisma.sql`jt."projectId"`;
  const ownerId = question ? Prisma.sql`c."authorId"` : Prisma.sql`c."ownerId"`;
  const fields = question ? [Prisma.sql`c.title`, Prisma.sql`c.context`, Prisma.sql`c.expected`, Prisma.sql`c.actual`, Prisma.sql`c.attempts`] : [Prisma.sql`c.title`, Prisma.sql`c.objective`];
  const technologyMatch = (condition: Prisma.Sql) => Prisma.sql`EXISTS (SELECT 1 FROM ${relation} jt JOIN "Technology" t ON t.id=jt."technologyId" WHERE ${relationId}=c.id AND ${condition})`;
  const conditions: Prisma.Sql[] = [Prisma.sql`c.visibility = 'VISIBLE'`];
  for (const word of (query.q ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().split(/\s+/).filter(Boolean)) {
    const pattern = `%${likeContains(word)}%`;
    const matches = [...fields, Prisma.sql`u.username`].map(field => Prisma.sql`${folded(field)} LIKE ${pattern}`);
    matches.push(technologyMatch(Prisma.sql`${folded(Prisma.sql`t.name`)} LIKE ${pattern}`));
    conditions.push(Prisma.sql`(${Prisma.join(matches, ' OR ')})`);
  }
  const technology = query.technology?.trim();
  if (technology) conditions.push(technologyMatch(Prisma.sql`(lower(t.slug) = lower(${technology}) OR lower(t.name) = lower(${technology}))`));
  if (question && query.status === 'resolved') conditions.push(Prisma.sql`c."acceptedAnswerId" IS NOT NULL`);
  if (question && query.status === 'open') conditions.push(Prisma.sql`c."acceptedAnswerId" IS NULL`);
  if (!question && query.status === 'open') conditions.push(Prisma.sql`c."recruitmentStatus" = 'OPEN'`);
  if (!question && query.status === 'closed') conditions.push(Prisma.sql`c."recruitmentStatus" = 'CLOSED'`);
  const from = Prisma.sql`FROM ${table} c JOIN "User" u ON u.id=${ownerId} WHERE ${Prisma.join(conditions, ' AND ')}`;
  const { page, pageSize, skip, take } = pageWindow(query);
  return client.$transaction(async tx => {
    const [count] = await tx.$queryRaw<{ total: bigint }[]>(Prisma.sql`SELECT count(*) AS total ${from}`);
    const rows = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT c.id ${from} ORDER BY c."createdAt" DESC, c.id DESC LIMIT ${take} OFFSET ${skip}`);
    const data = rows.length ? await load(tx, rows.map(row => row.id)) : [];
    return { data, meta: { page, pageSize, total: Number(count.total) } };
  }, { isolationLevel: 'RepeatableRead' });
}
