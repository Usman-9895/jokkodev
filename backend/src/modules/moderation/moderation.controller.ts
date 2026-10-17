import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiConflictResponse, ApiCookieAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags, ApiTooManyRequestsResponse } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../common/auth/auth-context';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import { ApiErrorDto } from '../../common/filters/api-error.filter';
import { ReportId } from '../../common/http/id.pipe';
import { PageOf, PageQueryDto, type Page } from '../../common/http/pagination';
import { CreatedReportDto, CreateReportDto, DirectActionDto, ModerationActionDto, ReportDetailDto, ReportDto, ReportQueryDto, ResolveReportDto } from './moderation.dto';
import { ModerationService } from './moderation.service';

@ApiTags('reports')
@ApiCookieAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly moderation: ModerationService) {}

  @Post()
  @ApiCreatedResponse({ type: CreatedReportDto, description: 'Signalement ouvert ; le contenu reste visible tant qu’aucune action ne le masque.' })
  @ApiNotFoundResponse({ type: ApiErrorDto, description: 'TARGET_NOT_FOUND : cible inexistante ou déjà non publique.' })
  @ApiConflictResponse({ type: ApiErrorDto, description: 'REPORT_ALREADY_OPEN.' })
  @ApiTooManyRequestsResponse({ type: ApiErrorDto })
  create(@CurrentUser() user: AuthenticatedUser, @Body() input: CreateReportDto): Promise<CreatedReportDto> {
    return this.moderation.report(user, input);
  }
}

@ApiTags('admin')
@ApiCookieAuth()
@ApiForbiddenResponse({ type: ApiErrorDto, description: 'Réservé au rôle ADMIN.' })
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly moderation: ModerationService) {}

  @Get('reports')
  @ApiOkResponse({ type: PageOf(ReportDto), description: 'Plus récents d’abord, filtrables par état.' })
  reports(@Query() query: ReportQueryDto): Promise<Page<ReportDto>> {
    return this.moderation.reports(query);
  }

  @Get('reports/:id')
  @ApiOkResponse({ type: ReportDetailDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  report(@Param('id', ReportId) id: string): Promise<ReportDetailDto> {
    return this.moderation.reportDetail(id);
  }

  @Post('reports/:id/resolve')
  @HttpCode(200)
  @ApiOkResponse({ type: ReportDetailDto, description: 'Action appliquée, historique écrit et signalement clôturé atomiquement.' })
  @ApiConflictResponse({ type: ApiErrorDto, description: 'REPORT_ALREADY_CLOSED ou CANNOT_SUSPEND_ADMIN.' })
  resolve(@CurrentUser() admin: AuthenticatedUser, @Param('id', ReportId) id: string, @Body() input: ResolveReportDto): Promise<ReportDetailDto> {
    return this.moderation.resolve(admin, id, input);
  }

  @Post('moderation-actions')
  @ApiCreatedResponse({ type: ModerationActionDto })
  @ApiConflictResponse({ type: ApiErrorDto, description: 'ALREADY_HIDDEN, ALREADY_SUSPENDED ou CANNOT_SUSPEND_ADMIN.' })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  act(@CurrentUser() admin: AuthenticatedUser, @Body() input: DirectActionDto): Promise<ModerationActionDto> {
    return this.moderation.act(admin, input);
  }

  @Get('moderation-actions')
  @ApiOkResponse({ type: PageOf(ModerationActionDto), description: 'Historique complet, plus récent d’abord.' })
  actions(@Query() query: PageQueryDto): Promise<Page<ModerationActionDto>> {
    return this.moderation.actions(query);
  }
}
