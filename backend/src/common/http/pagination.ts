import type { Type as Constructor } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

export class PageQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10_000) page?: number;
  @ApiPropertyOptional({ minimum: 1, maximum: MAX_PAGE_SIZE, default: DEFAULT_PAGE_SIZE }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(MAX_PAGE_SIZE) pageSize?: number;
}

export class PageMetaDto {
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty({ description: 'Total après application des mêmes filtres et restrictions de visibilité que la liste.' }) total!: number;
}

export interface Page<T> { data: T[]; meta: PageMetaDto }

export function pageWindow(query: PageQueryDto): { page: number; pageSize: number; skip: number; take: number } {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

/** Classe OpenAPI { data: T[], meta } nommée d'après l'élément, pour un contrat lisible côté frontend. */
export function PageOf<T>(item: Constructor<T>): Constructor<Page<T>> {
  class PageDto { @ApiProperty({ type: [item] }) data!: T[]; @ApiProperty({ type: PageMetaDto }) meta!: PageMetaDto; }
  Object.defineProperty(PageDto, 'name', { value: `${item.name.replace(/Dto$/, '')}PageDto` });
  return PageDto;
}
