import { Controller, Get, Param } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { isEmail } from 'class-validator';
import type { AuthenticatedUser } from '../../common/auth/auth-context';
import { CurrentUser } from '../../common/auth/decorators';
import { ApiException } from '../../common/http/api-exception';
import { ProjectId, UserId } from '../../common/http/id.pipe';
import { DatabaseService } from '../../database/database.service';

export function validCollaborationContact(value: string): boolean {
  if (!value || value.length > 2048 || /[\s\\]/.test(value) || Array.from(value).some(c=>c.charCodeAt(0)<32||c.charCodeAt(0)===127)) return false;
  if (value.length <= 254 && isEmail(value)) return true;
  try { const u=new URL(value); return u.protocol==='https:' && u.href.length<=2048 && !u.username && !u.password && u.hostname.includes('.') && !u.hostname.endsWith('.'); } catch { return false; }
}
export class CollaborationContactDto {
  @ApiProperty({ nullable: true, type: String, description: 'Privé. null : non renseigné ou partage désactivé. Aucun email de connexion par défaut.' }) contact!: string | null;
}
@ApiTags('projects')
@Controller('projects')
export class CollaborationController {
  constructor(private readonly db: DatabaseService) {}
  @Get(':id/members/:userId/contact')
  @ApiCookieAuth()
  @ApiOkResponse({type:CollaborationContactDto, description:'Membres effectifs d’un projet actif uniquement, sans privilège ADMIN. no-store.'})
  async read(@CurrentUser() viewer: AuthenticatedUser, @Param('id',ProjectId) id: string, @Param('userId',UserId) userId: string): Promise<CollaborationContactDto> {
    // One statement checks both memberships and reads the private value at the same database snapshot.
    const rows=await this.db.prisma.$queryRaw<{contact:string|null}[]>`SELECT CASE WHEN u.status='ACTIVE' AND pr."collaborationContactEnabled" THEN pr."collaborationContact" ELSE NULL END AS contact
      FROM "Project" p JOIN "User" u ON u.id=${userId}::uuid LEFT JOIN "Profile" pr ON pr."userId"=u.id
      WHERE p.id=${id}::uuid AND p.visibility='VISIBLE' AND p."deletedAt" IS NULL
      AND (p."ownerId"=${viewer.id}::uuid OR EXISTS(SELECT 1 FROM "ProjectMember" m WHERE m."projectId"=p.id AND m."userId"=${viewer.id}::uuid))
      AND (p."ownerId"=${userId}::uuid OR EXISTS(SELECT 1 FROM "ProjectMember" m WHERE m."projectId"=p.id AND m."userId"=${userId}::uuid))`;
    if (!rows.length) throw new ApiException(404,'COLLABORATION_UNAVAILABLE','Contact de collaboration indisponible.');
    return rows[0];
  }
}
