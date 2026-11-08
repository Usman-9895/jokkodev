import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { PageQueryDto } from '../../common/http/pagination';
import { HasText } from '../../common/http/validators';

export const REASON_MIN = 10;
export const REASON_MAX = 1_000;
export const CONTENT_TYPES = ['QUESTION', 'ANSWER', 'PROJECT'] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];
export const DECISIONS = ['NO_ACTION', 'HIDE_CONTENT', 'SUSPEND_ACCOUNT'] as const;
export const ACTION_DECISIONS = [...DECISIONS, 'REACTIVATE_ACCOUNT'] as const;
export type Decision = (typeof DECISIONS)[number];

export class AdminUserDto {
  @ApiProperty({nullable:true,type:String}) photoUrl!: string | null;
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() username!: string;
  @ApiProperty({ enum: ['ACTIVE', 'SUSPENDED'] }) status!: 'ACTIVE' | 'SUSPENDED';
  @ApiProperty({ enum: ['MEMBER', 'ADMIN'] }) role!: 'MEMBER' | 'ADMIN';
}

export class ReportTargetDto {
  @ApiProperty({ nullable: true, type: String, format: 'date-time', description: 'Date de suppression propriétaire de la cible, ou de la question parente pour ANSWER ; distincte du masquage.' }) deletedAt!: string | null;
  @ApiProperty({ enum: CONTENT_TYPES }) type!: ContentType;
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ description: 'Titre de la question, de la question parente d’une réponse, ou du projet.' }) title!: string;
  @ApiProperty({ description: 'Extrait du contenu signalé.' }) excerpt!: string;
  @ApiProperty({ enum: ['VISIBLE', 'HIDDEN'] }) visibility!: 'VISIBLE' | 'HIDDEN';
  @ApiProperty({ type: AdminUserDto, description: 'Auteur ou responsable : compte visé par une suspension.' }) author!: AdminUserDto;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'uuid', description: 'Question parente, pour une réponse.' }) questionId!: string | null;
}

export class ReportDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: ['OPEN', 'CLOSED'] }) status!: 'OPEN' | 'CLOSED';
  @ApiProperty({ description: 'Motif du déclarant, réservé aux administrateurs.' }) reason!: string;
  @ApiProperty({ type: AdminUserDto }) reporter!: AdminUserDto;
  @ApiProperty({ type: ReportTargetDto }) target!: ReportTargetDto;
  @ApiPropertyOptional({ nullable: true, enum: DECISIONS, type: String }) decision!: Decision | null;
  @ApiPropertyOptional({ nullable: true, type: AdminUserDto }) closedBy!: AdminUserDto | null;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' }) closedAt!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class ModerationTargetRefDto {
  @ApiProperty({ enum: [...CONTENT_TYPES, 'USER'] }) type!: ContentType | 'USER';
  @ApiProperty({ format: 'uuid' }) id!: string;
}

export class ReactivateAccountDto {
  @ApiProperty({ minLength: REASON_MIN, maxLength: REASON_MAX }) @IsString() @HasText() @MinLength(REASON_MIN) @MaxLength(REASON_MAX) reason!: string;
}

export class ModerationActionDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: ACTION_DECISIONS }) decision!: (typeof ACTION_DECISIONS)[number];
  @ApiProperty() reason!: string;
  @ApiProperty({ type: AdminUserDto }) admin!: AdminUserDto;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'uuid' }) reportId!: string | null;
  @ApiProperty({ type: ModerationTargetRefDto }) target!: ModerationTargetRefDto;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class ReportDetailDto extends ReportDto {
  @ApiProperty({ description: 'Signalements encore ouverts sur la même cible, celui-ci compris.' }) openReportsOnTarget!: number;
  @ApiProperty({ type: [ModerationActionDto], description: 'Actions déjà prises sur ce contenu ou sur le compte de son auteur, plus récentes d’abord.' }) history!: ModerationActionDto[];
}

export class ReportQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: ['OPEN', 'CLOSED'] }) @IsOptional() @IsIn(['OPEN', 'CLOSED']) status?: 'OPEN' | 'CLOSED';
}

export class ResolveReportDto {
  @ApiProperty({ enum: DECISIONS, description: 'SUSPEND_ACCOUNT vise l’auteur du contenu signalé, déterminé par le serveur.' }) @IsIn(DECISIONS) decision!: Decision;
  @ApiProperty({ minLength: REASON_MIN, maxLength: REASON_MAX, description: 'Motif de la décision, conservé dans l’historique.' }) @IsString() @HasText() @MinLength(REASON_MIN) @MaxLength(REASON_MAX) reason!: string;
}

export class DirectActionDto {
  @ApiProperty({ enum: ['HIDE_CONTENT', 'SUSPEND_ACCOUNT'] }) @IsIn(['HIDE_CONTENT', 'SUSPEND_ACCOUNT']) decision!: 'HIDE_CONTENT' | 'SUSPEND_ACCOUNT';
  @ApiProperty({ enum: [...CONTENT_TYPES, 'USER'], description: 'HIDE_CONTENT : QUESTION, ANSWER ou PROJECT. SUSPEND_ACCOUNT : USER.' }) @IsIn([...CONTENT_TYPES, 'USER']) targetType!: ContentType | 'USER';
  @ApiProperty({ format: 'uuid' }) @IsUUID() targetId!: string;
  @ApiProperty({ minLength: REASON_MIN, maxLength: REASON_MAX }) @IsString() @HasText() @MinLength(REASON_MIN) @MaxLength(REASON_MAX) reason!: string;
}

export class CreateReportDto {
  @ApiProperty({ enum: CONTENT_TYPES }) @IsIn(CONTENT_TYPES) targetType!: ContentType;
  @ApiProperty({ format: 'uuid' }) @IsUUID() targetId!: string;
  @ApiProperty({ minLength: REASON_MIN, maxLength: REASON_MAX }) @IsString() @HasText() @MinLength(REASON_MIN) @MaxLength(REASON_MAX) reason!: string;
}

export class CreatedReportDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: ['OPEN'] }) status!: 'OPEN';
  @ApiProperty({ enum: CONTENT_TYPES }) targetType!: ContentType;
  @ApiProperty({ format: 'uuid' }) targetId!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}
