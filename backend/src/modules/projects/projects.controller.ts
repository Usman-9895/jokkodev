import { Body, Delete, Controller, HttpCode, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiNoContentResponse, ApiCookieAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags, ApiTooManyRequestsResponse } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../common/auth/auth-context';
import { CurrentUser, Public } from '../../common/auth/decorators';
import { ApiErrorDto } from '../../common/filters/api-error.filter';
import { ProjectId, UserId } from '../../common/http/id.pipe';
import { PageOf, PageQueryDto, type Page } from '../../common/http/pagination';
import { CreateProjectDto, MemberDto, OwnProjectQueryDto, OwnProjectSummaryDto, ProjectDetailDto, ProjectListQueryDto, ProjectSummaryDto, UpdateProjectDto } from './projects.dto';
import { ProjectsService } from './projects.service';

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Public()
  @Get()
  @ApiOkResponse({ type: PageOf(ProjectSummaryDto), description: 'Projets visibles, plus récents d’abord ; filtres combinables.' })
  list(@Query() query: ProjectListQueryDto): Promise<Page<ProjectSummaryDto>> {
    return this.projects.list(query);
  }

  @Post()
  @ApiCookieAuth()
  @ApiCreatedResponse({ type: ProjectDetailDto, description: 'Le responsable est la session ; il devient membre dans la même transaction.' })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiTooManyRequestsResponse({ type: ApiErrorDto })
  create(@CurrentUser() user: AuthenticatedUser, @Body() input: CreateProjectDto): Promise<ProjectDetailDto> {
    return this.projects.create(user, input);
  }

  @Public()
  @Get(':id')
  @ApiOkResponse({ type: ProjectDetailDto })
  @ApiNotFoundResponse({ type: ApiErrorDto, description: 'PROJECT_NOT_FOUND : inexistant, masqué ou supprimé.' })
  detail(@Param('id', ProjectId) id: string, @CurrentUser() viewer?: AuthenticatedUser): Promise<ProjectDetailDto> {
    return this.projects.detail(id, viewer);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiCookieAuth()
  @ApiNoContentResponse({ description: 'Suppression logique par le propriétaire, relations conservées. Répétition par ce propriétaire : 204 sans changer deletedAt.' })
  @ApiForbiddenResponse({ type: ApiErrorDto, description: 'NOT_OWNER : ADMIN ne reçoit aucun droit supplémentaire.' })
  @ApiNotFoundResponse({ type: ApiErrorDto, description: 'Ressource inconnue ou déjà supprimée pour un tiers.' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ProjectId) id: string): Promise<void> {
    return this.projects.remove(user, id);
  }

  @Patch(':id')
  @ApiCookieAuth()
  @ApiOkResponse({ type: ProjectDetailDto })
  @ApiForbiddenResponse({ type: ApiErrorDto, description: 'NOT_OWNER.' })
  update(@CurrentUser() user: AuthenticatedUser, @Param('id', ProjectId) id: string, @Body() input: UpdateProjectDto): Promise<ProjectDetailDto> {
    return this.projects.update(user, id, input);
  }

  @Public()
  @Get(':id/members')
  @ApiOkResponse({ type: PageOf(MemberDto), description: 'Profils publics des membres, responsable en premier.' })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  members(@Param('id', ProjectId) id: string, @Query() query: PageQueryDto): Promise<Page<MemberDto>> {
    return this.projects.members(id, query);
  }
}

@ApiTags('users')
@Controller('users')
export class UserProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get('me/projects')
  @ApiCookieAuth()
  @ApiOkResponse({ type: PageOf(OwnProjectSummaryDto), description: 'Projets créés ou rejoints par la session, masqués compris.' })
  own(@CurrentUser() user: AuthenticatedUser, @Query() query: OwnProjectQueryDto): Promise<Page<OwnProjectSummaryDto>> {
    return this.projects.listOwn(user.id, query);
  }

  @Public()
  @Get(':id/projects')
  @ApiOkResponse({ type: PageOf(ProjectSummaryDto), description: 'Projets visibles créés ou rejoints, sans doublon.' })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  ofUser(@Param('id', UserId) id: string, @Query() query: PageQueryDto): Promise<Page<ProjectSummaryDto>> {
    return this.projects.listByMember(id, query);
  }
}
