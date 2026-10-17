import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';
import { PageQueryDto } from '../../common/http/pagination';
import { HasText } from '../../common/http/validators';
import { TechnologyDto } from '../technologies/technologies.dto';
import { PublicAuthorDto } from '../users/projections';

export const TITLE_MIN = 10;
export const TITLE_MAX = 150;
/** Plafond cumulé des quatre rubriques structurées d'une question. */
export const QUESTION_BODY_MAX = 20_000;
export const CODE_MAX = 20_000;
export const ANSWER_MIN = 10;
export const ANSWER_MAX = 20_000;
/** Libellé libre du langage d'un extrait : lettres, chiffres, espaces et + # . - uniquement. */
export const CODE_LANGUAGE_PATTERN = /^[\p{L}\p{N} +#.-]{1,30}$/u;
const codeLanguageDoc = { nullable: true, type: String, maxLength: 30, example: 'TypeScript', description: 'Langage affiché avec l’extrait ; ignoré et effacé sans code.' };

export class AnswerDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) questionId!: string;
  @ApiProperty({ type: PublicAuthorDto }) author!: PublicAuthorDto;
  @ApiProperty({ description: 'Texte brut ou Markdown restreint, à afficher sans interpréter de HTML.' }) body!: string;
  @ApiPropertyOptional({ nullable: true, type: String, description: 'Extrait de code, jamais exécuté.' }) code!: string | null;
  @ApiPropertyOptional(codeLanguageDoc) codeLanguage!: string | null;
  @ApiProperty({ description: 'Réponse retenue comme solution.' }) accepted!: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class QuestionSummaryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ description: 'Début du contexte, 200 caractères au plus.' }) excerpt!: string;
  @ApiProperty({ type: PublicAuthorDto }) author!: PublicAuthorDto;
  @ApiProperty({ type: [TechnologyDto] }) technologies!: TechnologyDto[];
  @ApiProperty({ description: 'Calculé : une solution acceptée existe.' }) resolved!: boolean;
  @ApiProperty({ description: 'Réponses visibles.' }) answerCount!: number;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class OwnQuestionSummaryDto extends QuestionSummaryDto {
  @ApiProperty({ enum: ['VISIBLE', 'HIDDEN'], description: 'HIDDEN : masquée par la modération, invisible du public.' }) visibility!: 'VISIBLE' | 'HIDDEN';
}

export class QuestionDetailDto extends QuestionSummaryDto {
  @ApiProperty() context!: string;
  @ApiProperty() expected!: string;
  @ApiProperty() actual!: string;
  @ApiProperty() attempts!: string;
  @ApiPropertyOptional({ nullable: true, type: String }) code!: string | null;
  @ApiPropertyOptional(codeLanguageDoc) codeLanguage!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'uuid' }) acceptedAnswerId!: string | null;
  @ApiPropertyOptional({ nullable: true, type: AnswerDto, description: 'Solution acceptée, reprise ici pour l’afficher en tête.' }) acceptedAnswer!: AnswerDto | null;
  @ApiProperty({ description: 'La session courante est l’auteur : modification et choix de la solution possibles.' }) viewerIsAuthor!: boolean;
}

export class QuestionListQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ maxLength: 200, description: 'Mots recherchés dans le titre, les rubriques, le pseudonyme de l’auteur et les technologies ; tous doivent apparaître.' }) @IsOptional() @IsString() @MaxLength(200) q?: string;
  @ApiPropertyOptional({ example: 'TypeScript', maxLength: 50, description: 'Nom affiché ou slug d’une technologie du catalogue, sans tenir compte de la casse.' }) @IsOptional() @IsString() @MaxLength(50) technology?: string;
  @ApiPropertyOptional({ enum: ['all', 'resolved', 'open'], default: 'all' }) @IsOptional() @IsIn(['all', 'resolved', 'open']) status?: 'all' | 'resolved' | 'open';
}

export class CreateQuestionDto {
  @ApiProperty({ minLength: TITLE_MIN, maxLength: TITLE_MAX }) @IsString() @HasText() @MinLength(TITLE_MIN) @MaxLength(TITLE_MAX) title!: string;
  @ApiProperty({ description: 'Contexte du problème.' }) @IsString() @HasText() @MaxLength(QUESTION_BODY_MAX) context!: string;
  @ApiProperty({ description: 'Résultat attendu.' }) @IsString() @HasText() @MaxLength(QUESTION_BODY_MAX) expected!: string;
  @ApiProperty({ description: 'Résultat obtenu.' }) @IsString() @HasText() @MaxLength(QUESTION_BODY_MAX) actual!: string;
  @ApiProperty({ description: 'Tentatives déjà effectuées. Les quatre rubriques totalisent 20 000 caractères au plus.' }) @IsString() @HasText() @MaxLength(QUESTION_BODY_MAX) attempts!: string;
  @ApiPropertyOptional({ nullable: true, type: String, maxLength: CODE_MAX }) @IsOptional() @IsString() @MaxLength(CODE_MAX) code?: string | null;
  @ApiPropertyOptional(codeLanguageDoc) @IsOptional() @IsString() @Matches(CODE_LANGUAGE_PATTERN) codeLanguage?: string | null;
  @ApiProperty({ type: [String], minItems: 1, maxItems: 5 }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(5) @ArrayUnique() @IsUUID('all', { each: true }) technologyIds!: string[];
}

export class UpdateQuestionDto {
  @ApiPropertyOptional({ minLength: TITLE_MIN, maxLength: TITLE_MAX }) @IsOptional() @IsString() @HasText() @MinLength(TITLE_MIN) @MaxLength(TITLE_MAX) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @HasText() @MaxLength(QUESTION_BODY_MAX) context?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @HasText() @MaxLength(QUESTION_BODY_MAX) expected?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @HasText() @MaxLength(QUESTION_BODY_MAX) actual?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @HasText() @MaxLength(QUESTION_BODY_MAX) attempts?: string;
  @ApiPropertyOptional({ nullable: true, type: String, maxLength: CODE_MAX, description: 'null retire le code.' }) @IsOptional() @IsString() @MaxLength(CODE_MAX) code?: string | null;
  @ApiPropertyOptional(codeLanguageDoc) @IsOptional() @IsString() @Matches(CODE_LANGUAGE_PATTERN) codeLanguage?: string | null;
  @ApiPropertyOptional({ type: [String], minItems: 1, maxItems: 5 }) @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(5) @ArrayUnique() @IsUUID('all', { each: true }) technologyIds?: string[];
}

export class AcceptAnswerDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() answerId!: string;
}

export class CreateAnswerDto {
  @ApiProperty({ minLength: ANSWER_MIN, maxLength: ANSWER_MAX }) @IsString() @HasText() @MinLength(ANSWER_MIN) @MaxLength(ANSWER_MAX) body!: string;
  @ApiPropertyOptional({ nullable: true, type: String, maxLength: CODE_MAX }) @IsOptional() @IsString() @MaxLength(CODE_MAX) code?: string | null;
  @ApiPropertyOptional(codeLanguageDoc) @IsOptional() @IsString() @Matches(CODE_LANGUAGE_PATTERN) codeLanguage?: string | null;
}

export class UpdateAnswerDto {
  @ApiPropertyOptional({ minLength: ANSWER_MIN, maxLength: ANSWER_MAX }) @IsOptional() @IsString() @HasText() @MinLength(ANSWER_MIN) @MaxLength(ANSWER_MAX) body?: string;
  @ApiPropertyOptional({ nullable: true, type: String, maxLength: CODE_MAX }) @IsOptional() @IsString() @MaxLength(CODE_MAX) code?: string | null;
  @ApiPropertyOptional(codeLanguageDoc) @IsOptional() @IsString() @Matches(CODE_LANGUAGE_PATTERN) codeLanguage?: string | null;
}

export class OwnQuestionQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: ['all', 'resolved', 'open'], default: 'all' }) @IsOptional() @IsIn(['all', 'resolved', 'open']) status?: 'all' | 'resolved' | 'open';
}

export class AnswerWithQuestionDto extends AnswerDto {
  @ApiProperty({ description: 'Titre de la question visible à laquelle la réponse appartient.' }) questionTitle!: string;
}
