import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PageQueryDto } from '../../common/http/pagination';
import { HasText } from '../../common/http/validators';
import { TechnologyDto } from '../technologies/technologies.dto';
import { PublicAuthorDto } from '../users/projections';

export const MESSAGE_MIN = 20;
export const MESSAGE_MAX = 1_000;
export const APPLICATION_STATUSES = ['PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export class ApplicationProjectDto {
  @ApiProperty({ nullable: true, type: String, format: 'date-time', description: 'Suppression logique par le propriétaire, distincte du masquage. Contenu privé neutralisé hors administration.' }) deletedAt!: string | null;
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ description: 'false si le projet a été masqué : son contenu n’est plus publié, seul le statut de la demande reste suivi.' }) available!: boolean;
  @ApiPropertyOptional({ nullable: true, type: String }) title!: string | null;
  @ApiPropertyOptional({ nullable: true, enum: ['OPEN', 'CLOSED'], type: String }) recruitmentStatus!: 'OPEN' | 'CLOSED' | null;
  @ApiPropertyOptional({ nullable: true, type: PublicAuthorDto }) owner!: PublicAuthorDto | null;
}

export class ApplicationDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: APPLICATION_STATUSES }) status!: ApplicationStatus;
  @ApiProperty({ description: 'Privé : visible uniquement par le candidat et le responsable.' }) message!: string;
  @ApiProperty({ type: PublicAuthorDto }) applicant!: PublicAuthorDto;
  @ApiProperty({ type: [TechnologyDto], description: 'Compétences publiques du profil du candidat.' }) applicantSkills!: TechnologyDto[];
  @ApiProperty({ type: ApplicationProjectDto }) project!: ApplicationProjectDto;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' }) decidedAt!: string | null;
  @ApiProperty({ enum: ['APPLICANT', 'OWNER'], description: 'Partie que représente la session.' }) viewerRole!: 'APPLICANT' | 'OWNER';
}

export class CreateApplicationDto {
  @ApiProperty({ minLength: MESSAGE_MIN, maxLength: MESSAGE_MAX }) @IsString() @HasText() @MinLength(MESSAGE_MIN) @MaxLength(MESSAGE_MAX) message!: string;
}

export class DecideApplicationDto {
  @ApiProperty({ enum: ['ACCEPTED', 'REJECTED', 'WITHDRAWN'], description: 'ACCEPTED et REJECTED : responsable. WITHDRAWN : candidat. Uniquement depuis PENDING.' })
  @IsIn(['ACCEPTED', 'REJECTED', 'WITHDRAWN']) status!: 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
}

export class ApplicationQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: APPLICATION_STATUSES }) @IsOptional() @IsIn(APPLICATION_STATUSES) status?: ApplicationStatus;
}
