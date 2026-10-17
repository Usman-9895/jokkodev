import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';
import { PageQueryDto } from '../../common/http/pagination';
import { HasText } from '../../common/http/validators';
import { TechnologyDto } from '../technologies/technologies.dto';
import { PublicAuthorDto } from '../users/projections';

export const OBJECTIVE_MIN = 30;
export const OBJECTIVE_MAX = 5_000;
export const AVAILABILITY_MAX = 300;
const RECRUITMENT = ['OPEN', 'CLOSED'] as const;
export type Recruitment = (typeof RECRUITMENT)[number];

export class ProjectSummaryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ description: 'Début de l’objectif, 200 caractères au plus.' }) summary!: string;
  @ApiProperty({ type: PublicAuthorDto }) owner!: PublicAuthorDto;
  @ApiProperty({ type: [TechnologyDto], description: 'Compétences recherchées.' }) technologies!: TechnologyDto[];
  @ApiProperty({ enum: RECRUITMENT }) recruitmentStatus!: Recruitment;
  @ApiPropertyOptional({ nullable: true, type: String }) availability!: string | null;
  @ApiProperty({ description: 'Membres, responsable compris.' }) memberCount!: number;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class MemberDto extends PublicAuthorDto {
  @ApiProperty({ description: 'Responsable du projet.' }) isOwner!: boolean;
  @ApiProperty({ format: 'date-time' }) joinedAt!: string;
}

export class ViewerApplicationDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'] }) status!: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
}

export class ProjectDetailDto extends ProjectSummaryDto {
  @ApiProperty() objective!: string;
  @ApiProperty({ type: [MemberDto], description: 'Les 50 premiers membres ; liste complète via /projects/:id/members.' }) members!: MemberDto[];
  @ApiPropertyOptional({ enum: ['OWNER', 'MEMBER'], nullable: true, type: String, description: 'Rôle de la session courante dans le projet.' }) viewerRole!: 'OWNER' | 'MEMBER' | null;
  @ApiPropertyOptional({ nullable: true, type: ViewerApplicationDto, description: 'Candidature de la session à ce projet, s’il y en a une.' }) viewerApplication!: ViewerApplicationDto | null;
}

export class OwnProjectSummaryDto extends ProjectSummaryDto {
  @ApiProperty({ enum: ['OWNER', 'MEMBER'] }) role!: 'OWNER' | 'MEMBER';
  @ApiProperty({ enum: ['VISIBLE', 'HIDDEN'] }) visibility!: 'VISIBLE' | 'HIDDEN';
}

export class ProjectListQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: RECRUITMENT }) @IsOptional() @IsIn(RECRUITMENT) recruitment?: Recruitment;
  @ApiPropertyOptional({ maxLength: 200, description: 'Mots recherchés dans le titre et l’objectif.' }) @IsOptional() @IsString() @MaxLength(200) q?: string;
  @ApiPropertyOptional({ example: 'react' }) @IsOptional() @IsString() @Matches(/^[a-z0-9-]{1,50}$/) technology?: string;
}

export class OwnProjectQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: ['OWNER', 'MEMBER'] }) @IsOptional() @IsIn(['OWNER', 'MEMBER']) role?: 'OWNER' | 'MEMBER';
}

export class CreateProjectDto {
  @ApiProperty({ minLength: 10, maxLength: 150 }) @IsString() @HasText() @MinLength(10) @MaxLength(150) title!: string;
  @ApiProperty({ minLength: OBJECTIVE_MIN, maxLength: OBJECTIVE_MAX }) @IsString() @HasText() @MinLength(OBJECTIVE_MIN) @MaxLength(OBJECTIVE_MAX) objective!: string;
  @ApiProperty({ type: [String], minItems: 1, maxItems: 10, description: 'Compétences recherchées (technologies du catalogue).' }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10) @ArrayUnique() @IsUUID('all', { each: true }) technologyIds!: string[];
  @ApiPropertyOptional({ nullable: true, type: String, maxLength: AVAILABILITY_MAX, example: '5 heures par semaine, en soirée' }) @IsOptional() @IsString() @MaxLength(AVAILABILITY_MAX) availability?: string | null;
  @ApiPropertyOptional({ enum: RECRUITMENT, default: 'OPEN' }) @IsOptional() @IsIn(RECRUITMENT) recruitmentStatus?: Recruitment;
}

export class UpdateProjectDto {
  @ApiPropertyOptional({ minLength: 10, maxLength: 150 }) @IsOptional() @IsString() @HasText() @MinLength(10) @MaxLength(150) title?: string;
  @ApiPropertyOptional({ minLength: OBJECTIVE_MIN, maxLength: OBJECTIVE_MAX }) @IsOptional() @IsString() @HasText() @MinLength(OBJECTIVE_MIN) @MaxLength(OBJECTIVE_MAX) objective?: string;
  @ApiPropertyOptional({ type: [String], minItems: 1, maxItems: 10 }) @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10) @ArrayUnique() @IsUUID('all', { each: true }) technologyIds?: string[];
  @ApiPropertyOptional({ nullable: true, type: String, maxLength: AVAILABILITY_MAX }) @IsOptional() @IsString() @MaxLength(AVAILABILITY_MAX) availability?: string | null;
  @ApiPropertyOptional({ enum: RECRUITMENT, description: 'CLOSED bloque les nouvelles candidatures ; les demandes en attente restent traitables.' }) @IsOptional() @IsIn(RECRUITMENT) recruitmentStatus?: Recruitment;
}
