import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Identité publique d'un auteur, responsable ou membre : jamais d'email ni de donnée de compte. */
export class PublicAuthorDto {
  @ApiProperty({ nullable: true, type: String }) photoUrl!: string | null;
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'awa_dev' }) username!: string;
  @ApiPropertyOptional({ example: 'SN', nullable: true, type: String }) countryCode!: string | null;
}

export const publicAuthorSelect = { id: true, username: true, avatarKey: true, profile: { select: { countryCode: true } } } as const;

export function toPublicAuthor(user: { id: string; username: string; avatarKey?: string | null; profile: { countryCode: string | null } | null }): PublicAuthorDto {
  return { photoUrl: photoUrl(user.avatarKey), id: user.id, username: user.username, countryCode: user.profile?.countryCode ?? null };
}

export function photoUrl(key?: string | null): string | null { return key ? '/api/v1/users/photos/' + key : null; }
