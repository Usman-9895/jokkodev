import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiConflictResponse, ApiCookieAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../common/auth/auth-context';
import { CurrentUser } from '../../common/auth/decorators';
import { ApiErrorDto } from '../../common/filters/api-error.filter';
import { ApplicationId, ProjectId } from '../../common/http/id.pipe';
import { PageOf, type Page } from '../../common/http/pagination';
import { ApplicationDto, ApplicationQueryDto, CreateApplicationDto, DecideApplicationDto } from './applications.dto';
import { ApplicationsService } from './applications.service';

@ApiTags('applications')
@ApiCookieAuth()
@Controller()
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Post('projects/:id/applications')
  @ApiCreatedResponse({ type: ApplicationDto, description: 'Nouvelle demande PENDING.' })
  @ApiConflictResponse({ type: ApiErrorDto, description: 'APPLICATION_EXISTS, OWN_PROJECT, ALREADY_MEMBER ou RECRUITMENT_CLOSED.' })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  apply(@CurrentUser() user: AuthenticatedUser, @Param('id', ProjectId) projectId: string, @Body() input: CreateApplicationDto): Promise<ApplicationDto> {
    return this.applications.apply(user, projectId, input);
  }

  @Get('projects/:id/applications')
  @ApiOkResponse({ type: PageOf(ApplicationDto), description: 'Demandes reçues, plus récentes d’abord.' })
  @ApiForbiddenResponse({ type: ApiErrorDto, description: 'NOT_OWNER.' })
  received(@CurrentUser() user: AuthenticatedUser, @Param('id', ProjectId) projectId: string, @Query() query: ApplicationQueryDto): Promise<Page<ApplicationDto>> {
    return this.applications.listForProject(user, projectId, query);
  }

  @Get('users/me/applications')
  @ApiOkResponse({ type: PageOf(ApplicationDto), description: 'Demandes envoyées par la session.' })
  sent(@CurrentUser() user: AuthenticatedUser, @Query() query: ApplicationQueryDto): Promise<Page<ApplicationDto>> {
    return this.applications.listOwn(user, query);
  }

  @Get('applications/:id')
  @ApiOkResponse({ type: ApplicationDto })
  @ApiNotFoundResponse({ type: ApiErrorDto, description: 'Inexistante ou consultée par un tiers.' })
  get(@CurrentUser() user: AuthenticatedUser, @Param('id', ApplicationId) id: string): Promise<ApplicationDto> {
    return this.applications.get(user, id);
  }

  @Patch('applications/:id')
  @ApiOkResponse({ type: ApplicationDto, description: 'Répéter la décision déjà appliquée renvoie l’état courant.' })
  @ApiForbiddenResponse({ type: ApiErrorDto, description: 'TRANSITION_FORBIDDEN : la décision n’appartient pas à cette partie.' })
  @ApiConflictResponse({ type: ApiErrorDto, description: 'INVALID_TRANSITION : demande déjà traitée.' })
  decide(@CurrentUser() user: AuthenticatedUser, @Param('id', ApplicationId) id: string, @Body() input: DecideApplicationDto): Promise<ApplicationDto> {
    return this.applications.decide(user, id, input);
  }
}
