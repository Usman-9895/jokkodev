import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsISO31661Alpha2, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { IsPublicHttpsUrl, MAX_URL_LENGTH, OptionalButNotNull } from '../../../common/http/validators';
import { TechnologyDto } from '../../technologies/technologies.dto';
import { USERNAME_PATTERN } from '../identity';

export const MAX_BIO_LENGTH = 500;
export const MAX_LINKS = 3;
export const MAX_SKILLS = 15;

export class ProfileStatsDto {
  @ApiProperty({ description: 'Questions visibles.' }) questions!: number;
  @ApiProperty({ description: 'Réponses visibles dont la question est visible.' }) answers!: number;
  @ApiProperty({ description: 'Projets visibles créés ou rejoints.' }) projects!: number;
}

export class PublicProfileDto {
  @ApiProperty({ type: Number, description: "Somme du journal Teranga Points : +10 pour une solution éligible acceptée par un autre membre." }) terangaPoints!: number;
  @ApiProperty({ nullable: true, type: String }) photoUrl!: string | null;
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'awa_dev' }) username!: string;
  @ApiPropertyOptional({ nullable: true, type: String, maxLength: MAX_BIO_LENGTH }) bio!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String, example: 'SN', description: 'ISO 3166-1 alpha-2.' }) countryCode!: string | null;
  @ApiProperty({ type: [String], example: ['https://github.com/awa-dev'] }) links!: string[];
  @ApiProperty({ type: [TechnologyDto] }) skills!: TechnologyDto[];
  @ApiProperty({ format: 'date-time' }) memberSince!: string;
  @ApiProperty({ type: ProfileStatsDto }) stats!: ProfileStatsDto;
}

export class OwnProfileDto extends PublicProfileDto {
  @ApiProperty({ nullable: true, type: String, description: "Privé : contact choisi, jamais l’email de connexion." }) collaborationContact!: string | null;
  @ApiProperty() collaborationContactEnabled!: boolean;
  @ApiProperty({ example: 'awa@example.com', description: 'Privé : visible uniquement par le titulaire.' }) email!: string;
  @ApiProperty() emailVerified!: boolean;
}

/** Champs absents : inchangés. null efface la biographie ou le pays ; [] vide les liens ou les compétences. */
export class UpdateProfileDto {
  @ApiPropertyOptional({ nullable: true, type: String, maxLength: 2048 }) @IsOptional() @IsString() @MaxLength(2048) collaborationContact?: string | null;
  @ApiPropertyOptional() @OptionalButNotNull() @IsBoolean() collaborationContactEnabled?: boolean;
  @ApiPropertyOptional({ pattern: USERNAME_PATTERN.source }) @OptionalButNotNull() @IsString() @Matches(USERNAME_PATTERN) username?: string;
  @ApiPropertyOptional({ nullable: true, type: String, maxLength: MAX_BIO_LENGTH }) @IsOptional() @IsString() @MaxLength(MAX_BIO_LENGTH) bio?: string | null;
  @ApiPropertyOptional({ nullable: true, type: String, example: 'SN' }) @IsOptional() @IsString() @Matches(/^[A-Z]{2}$/) @IsISO31661Alpha2() countryCode?: string | null;
  @ApiPropertyOptional({ type: [String], maxItems: MAX_LINKS, description: `URLs HTTPS absolues de ${MAX_URL_LENGTH} caractères au plus.` }) @OptionalButNotNull() @IsArray() @ArrayMaxSize(MAX_LINKS) @ArrayUnique() @IsPublicHttpsUrl({ each: true }) links?: string[];
  @ApiPropertyOptional({ type: [String], maxItems: MAX_SKILLS, description: 'Identifiants de technologies du catalogue.' }) @OptionalButNotNull() @IsArray() @ArrayMaxSize(MAX_SKILLS) @ArrayUnique() @IsUUID('all', { each: true }) skillIds?: string[];
}
