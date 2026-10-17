/** Filtre par technologie : nom affiché ou slug, comme dans les URL du frontend. */
export function technologyFilter(value: string | undefined) {
  const technology = value?.trim();
  if (!technology) return undefined;
  return { some: { technology: { OR: [{ slug: technology.toLowerCase() }, { name: { equals: technology, mode: 'insensitive' as const } }] } } };
}
