import { Body, Controller, HttpCode, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiNoContentResponse, ApiCookieAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags, ApiTooManyRequestsResponse } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../common/auth/auth-context';
import { CurrentUser, Public } from '../../common/auth/decorators';
import { ApiErrorDto } from '../../common/filters/api-error.filter';
import { AnswerId, QuestionId, UserId } from '../../common/http/id.pipe';
import { PageOf, PageQueryDto, type Page } from '../../common/http/pagination';
import { AcceptAnswerDto, AnswerDto, AnswerWithQuestionDto, CreateAnswerDto, CreateQuestionDto, OwnQuestionQueryDto, OwnQuestionSummaryDto, QuestionDetailDto, QuestionListQueryDto, QuestionSummaryDto, UpdateAnswerDto, UpdateQuestionDto } from './questions.dto';
import { QuestionsService } from './questions.service';
import {PendingQuestionPublicationDto,QuestionPublicationResultDto} from './questions.dto';
import {ApiConflictResponse,ApiGoneResponse} from '@nestjs/swagger';

@ApiTags('questions')
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questions: QuestionsService) {}

  @Public()
  @Get()
  @ApiOkResponse({ type: PageOf(QuestionSummaryDto), description: 'Questions visibles, de la plus récente à la plus ancienne ; filtres combinables.' })
  list(@Query() query: QuestionListQueryDto): Promise<Page<QuestionSummaryDto>> {
    return this.questions.list(query);
  }

  @Post()
  @ApiCookieAuth()
  @ApiCreatedResponse({ type: QuestionDetailDto })
  @ApiBadRequestResponse({ type: ApiErrorDto, description: 'Validation ou technologie inconnue.' })
  @ApiTooManyRequestsResponse({ type: ApiErrorDto })
  create(@CurrentUser() user: AuthenticatedUser, @Body() input: CreateQuestionDto): Promise<QuestionDetailDto> {
    return this.questions.create(user, input);
  }

  @Public()
  @Get(':id')
  @ApiOkResponse({ type: QuestionDetailDto })
  @ApiNotFoundResponse({ type: ApiErrorDto, description: 'QUESTION_NOT_FOUND : inexistante, masquée ou supprimée.' })
  detail(@Param('id', QuestionId) id: string, @CurrentUser() viewer?: AuthenticatedUser): Promise<QuestionDetailDto> {
    return this.questions.detail(id, viewer);
  }

  @Post('publications')
  @ApiCookieAuth()
  @ApiConflictResponse({type:ApiErrorDto,description:'IDEMPOTENCY_CONTENT_CONFLICT : clé déjà liée à un autre contenu.'})
  @ApiGoneResponse({type:ApiErrorDto,description:'PUBLICATION_REQUEST_EXPIRED : reprise expirée après sept jours, vérifier Mes questions.'})
  @ApiCreatedResponse({type:QuestionPublicationResultDto,description:'Publication atomique ou résultat initial retrouvé. Session et CSRF requis à chaque tentative. Conflit 409 si contenu différent, 410 après sept jours.'})
  @ApiBadRequestResponse({type:ApiErrorDto})
  publishPending(@CurrentUser() user:AuthenticatedUser,@Body() input:PendingQuestionPublicationDto):Promise<QuestionPublicationResultDto>{
    return this.questions.publishPending(user,input);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiCookieAuth()
  @ApiNoContentResponse({ description: 'Suppression logique par le propriétaire, relations conservées. Répétition par ce propriétaire : 204 sans changer deletedAt.' })
  @ApiForbiddenResponse({ type: ApiErrorDto, description: 'NOT_AUTHOR : ADMIN ne reçoit aucun droit supplémentaire.' })
  @ApiNotFoundResponse({ type: ApiErrorDto, description: 'Ressource inconnue ou déjà supprimée pour un tiers.' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', QuestionId) id: string): Promise<void> {
    return this.questions.remove(user, id);
  }

  @Patch(':id')
  @ApiCookieAuth()
  @ApiOkResponse({ type: QuestionDetailDto })
  @ApiForbiddenResponse({ type: ApiErrorDto, description: 'NOT_AUTHOR.' })
  update(@CurrentUser() user: AuthenticatedUser, @Param('id', QuestionId) id: string, @Body() input: UpdateQuestionDto): Promise<QuestionDetailDto> {
    return this.questions.update(user, id, input);
  }

  @Public()
  @Get(':id/answers')
  @ApiOkResponse({ type: PageOf(AnswerDto), description: 'Réponses visibles par ordre chronologique ; la solution porte accepted = true.' })
  answers(@Param('id', QuestionId) id: string, @Query() query: PageQueryDto): Promise<Page<AnswerDto>> {
    return this.questions.answers(id, query);
  }

  @Post(':id/answers')
  @ApiCookieAuth()
  @ApiCreatedResponse({ type: AnswerDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiTooManyRequestsResponse({ type: ApiErrorDto })
  answer(@CurrentUser() user: AuthenticatedUser, @Param('id', QuestionId) id: string, @Body() input: CreateAnswerDto): Promise<AnswerDto> {
    return this.questions.createAnswer(user, id, input);
  }

  @Put(':id/accepted-answer')
  @ApiCookieAuth()
  @ApiOkResponse({ type: QuestionDetailDto, description: 'Idempotent : accepter la solution déjà retenue ne change rien.' })
  @ApiBadRequestResponse({ type: ApiErrorDto, description: 'ANSWER_NOT_ELIGIBLE : réponse inconnue, masquée ou d’une autre question.' })
  @ApiForbiddenResponse({ type: ApiErrorDto, description: 'NOT_AUTHOR : seul l’auteur de la question choisit la solution.' })
  accept(@CurrentUser() user: AuthenticatedUser, @Param('id', QuestionId) id: string, @Body() input: AcceptAnswerDto): Promise<QuestionDetailDto> {
    return this.questions.accept(user, id, input.answerId.toLowerCase());
  }

  @Delete(':id/accepted-answer')
  @ApiCookieAuth()
  @ApiOkResponse({ type: QuestionDetailDto, description: 'La question redevient non résolue.' })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  unaccept(@CurrentUser() user: AuthenticatedUser, @Param('id', QuestionId) id: string): Promise<QuestionDetailDto> {
    return this.questions.unaccept(user, id);
  }
}

@ApiTags('answers')
@Controller('answers')
export class AnswersController {
  constructor(private readonly questions: QuestionsService) {}

  @Patch(':id')
  @ApiCookieAuth()
  @ApiOkResponse({ type: AnswerDto, description: 'La question et l’auteur ne peuvent pas changer.' })
  @ApiForbiddenResponse({ type: ApiErrorDto, description: 'NOT_AUTHOR.' })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  update(@CurrentUser() user: AuthenticatedUser, @Param('id', AnswerId) id: string, @Body() input: UpdateAnswerDto): Promise<AnswerDto> {
    return this.questions.updateAnswer(user, id, input);
  }
}

@ApiTags('users')
@Controller('users')
export class UserContributionsController {
  constructor(private readonly questions: QuestionsService) {}

  @Get('me/questions')
  @ApiCookieAuth()
  @ApiOkResponse({ type: PageOf(OwnQuestionSummaryDto), description: 'Toutes les questions de la session, masquées comprises.' })
  ownQuestions(@CurrentUser() user: AuthenticatedUser, @Query() query: OwnQuestionQueryDto): Promise<Page<OwnQuestionSummaryDto>> {
    return this.questions.listOwn(user.id, query);
  }

  @Public()
  @Get(':id/questions')
  @ApiOkResponse({ type: PageOf(QuestionSummaryDto) })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  questionsOf(@Param('id', UserId) id: string, @Query() query: PageQueryDto): Promise<Page<QuestionSummaryDto>> {
    return this.questions.listByAuthor(id, query);
  }

  @Public()
  @Get(':id/answers')
  @ApiOkResponse({ type: PageOf(AnswerWithQuestionDto), description: 'Réponses visibles sur des questions visibles.' })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  answersOf(@Param('id', UserId) id: string, @Query() query: PageQueryDto): Promise<Page<AnswerWithQuestionDto>> {
    return this.questions.answersByAuthor(id, query);
  }
}
