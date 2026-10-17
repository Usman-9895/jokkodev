import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class TechnologyDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'TypeScript' }) name!: string;
  @ApiProperty({ example: 'typescript' }) slug!: string;
}

export class TechnologyListDto {
  @ApiProperty({ type: [TechnologyDto] }) data!: TechnologyDto[];
}

export class TechnologyQueryDto {
  @ApiPropertyOptional({ maxLength: 50, description: 'Recherche dans le nom, sans tenir compte de la casse.' }) @IsOptional() @IsString() @MaxLength(50) q?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 200 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}

export const technologySelect = { id: true, name: true, slug: true } as const;
