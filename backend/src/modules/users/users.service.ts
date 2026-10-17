import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { isUniqueViolation } from '../../common/auth/prisma-errors';
import { ApiException } from '../../common/http/api-exception';
import { optionalText } from '../../common/http/text';
import { technologySelect } from '../technologies/technologies.dto';
import { ReputationService } from '../reputation/reputation.service';
import { TechnologiesService } from '../technologies/technologies.service';
import type { OwnProfileDto, PublicProfileDto, UpdateProfileDto } from './dto/profile.dto';
import { USERNAME_PATTERN, usernameKey } from './identity';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const profileSelect = {
  id: true, username: true, email: true, emailVerifiedAt: true, createdAt: true,
  profile: { select: { bio: true, countryCode: true, links: true, skills: { select: { technology: { select: technologySelect } }, orderBy: { technology: { name: 'asc' } } } } }
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly database: DatabaseService, private readonly technologies: TechnologiesService, private readonly reputation: ReputationService) {}

  /** Profil public par identifiant ou par pseudonyme (insensible à la casse). */
  async findPublic(reference: string): Promise<PublicProfileDto> {
    const where = UUID.test(reference) ? { id: reference.toLowerCase() } : USERNAME_PATTERN.test(reference) ? { usernameKey: usernameKey(reference) } : undefined;
    const user = where && await this.database.prisma.user.findUnique({ where, select: profileSelect });
    if (!user) throw new ApiException(404, 'USER_NOT_FOUND', 'Profil introuvable.');
    return this.toPublic(user);
  }

  async findOwn(userId: string): Promise<OwnProfileDto> {
    const user = await this.database.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: profileSelect });
    return { ...await this.toPublic(user), email: user.email, emailVerified: user.emailVerifiedAt !== null };
  }

  async updateOwn(userId: string, input: UpdateProfileDto): Promise<OwnProfileDto> {
    if (input.skillIds) await this.technologies.assertExist(input.skillIds, 'skillIds');
    try {
      await this.database.prisma.$transaction(async tx => {
        if (input.username !== undefined) await tx.user.update({ where: { id: userId }, data: { username: input.username, usernameKey: usernameKey(input.username) } });
        const bio = optionalText(input.bio);
        await tx.profile.upsert({
          where: { userId },
          create: { userId, bio: bio ?? null, countryCode: input.countryCode ?? null, links: input.links?.map(link => new URL(link).href) ?? [] },
          update: { bio, countryCode: input.countryCode, links: input.links?.map(link => new URL(link).href) }
        });
        if (input.skillIds) {
          await tx.profileTechnology.deleteMany({ where: { userId } });
          await tx.profileTechnology.createMany({ data: input.skillIds.map(technologyId => ({ userId, technologyId })) });
        }
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ApiException(409, 'USERNAME_TAKEN', 'Ce pseudonyme est déjà pris.', { fieldErrors: { username: ['Pseudonyme déjà pris.'] } });
      throw error;
    }
    return this.findOwn(userId);
  }

  private async toPublic(user: { id: string; username: string; createdAt: Date; profile: { bio: string | null; countryCode: string | null; links: string[]; skills: { technology: { id: string; name: string; slug: string } }[] } | null }): Promise<PublicProfileDto> {
    const prisma = this.database.prisma;
    const [questions, answers, projects, terangaPoints] = await Promise.all([
      prisma.question.count({ where: { authorId: user.id, visibility: 'VISIBLE' } }),
      prisma.answer.count({ where: { authorId: user.id, visibility: 'VISIBLE', question: { visibility: 'VISIBLE' } } }),
      prisma.project.count({ where: { visibility: 'VISIBLE', members: { some: { userId: user.id } } } }),
      this.reputation.score(user.id)
    ]);
    return {
      id: user.id, username: user.username, bio: user.profile?.bio ?? null, countryCode: user.profile?.countryCode ?? null, links: user.profile?.links ?? [],
      skills: user.profile?.skills.map(s => s.technology) ?? [], memberSince: user.createdAt.toISOString(), stats: { questions, answers, projects }, terangaPoints
    };
  }
}
