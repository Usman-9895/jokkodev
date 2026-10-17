import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type { Prisma } from '../../generated/prisma/client';
import { ApiException } from '../../common/http/api-exception';
import { likeContains } from '../../common/http/text';
import { technologySelect, type TechnologyDto, type TechnologyQueryDto } from './technologies.dto';

@Injectable()
export class TechnologiesService {
  constructor(private readonly database: DatabaseService) {}

  list(query: TechnologyQueryDto): Promise<TechnologyDto[]> {
    const q = query.q?.trim();
    return this.database.prisma.technology.findMany({
      where: q ? { name: { contains: likeContains(q), mode: 'insensitive' } } : undefined,
      orderBy: [{ name: 'asc' }, { id: 'asc' }], take: query.limit ?? 200, select: technologySelect
    });
  }

  /** Vérifie que chaque identifiant désigne une technologie du catalogue ; les doublons sont refusés en amont par les DTO. */
  async assertExist(ids: string[], field: string, db: Prisma.TransactionClient = this.database.prisma): Promise<void> {
    if (ids.length === 0) return;
    const found = await db.technology.count({ where: { id: { in: ids } } });
    if (found !== ids.length) throw new ApiException(400, 'VALIDATION_ERROR', 'Certaines données sont invalides.', { fieldErrors: { [field]: ['Technologie inconnue.'] } });
  }
}
