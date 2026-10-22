import { Controller, Get, Injectable } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../common/auth/auth-context';
import { CurrentUser } from '../../common/auth/decorators';
import { DatabaseService } from '../../database/database.service';

class QuestionCountsDto {
  @ApiProperty() total!: number;
  @ApiProperty() resolved!: number;
  @ApiProperty() open!: number;
  @ApiProperty({ description: 'Masquées par la modération.' }) hidden!: number;
}
class AnswerCountsDto {
  @ApiProperty({ description: 'Réponses visibles.' }) total!: number;
  @ApiProperty({ description: 'Réponses retenues comme solution.' }) accepted!: number;
}
class ProjectCountsDto {
  @ApiProperty({ description: 'Projets dont la session est responsable.' }) owned!: number;
  @ApiProperty({ description: 'Projets rejoints comme membre.' }) joined!: number;
}
class ApplicationCountsDto {
  @ApiProperty({ description: 'Candidatures envoyées.' }) sent!: number;
  @ApiProperty({ description: 'Candidatures envoyées en attente de décision.' }) sentPending!: number;
  @ApiProperty({ description: 'Demandes reçues en attente, tous projets visibles confondus.' }) receivedPending!: number;
}
export class DashboardDto {
  @ApiProperty({ type: QuestionCountsDto }) questions!: QuestionCountsDto;
  @ApiProperty({ type: AnswerCountsDto }) answers!: AnswerCountsDto;
  @ApiProperty({ type: ProjectCountsDto }) projects!: ProjectCountsDto;
  @ApiProperty({ type: ApplicationCountsDto }) applications!: ApplicationCountsDto;
}

@Injectable()
export class DashboardService {
  constructor(private readonly database: DatabaseService) {}

  async summary(userId: string): Promise<DashboardDto> {
    const prisma = this.database.prisma;
    const [questions, resolved, hidden, answers, accepted, owned, joined, sent, sentPending, receivedPending] = await prisma.$transaction([
      prisma.question.count({ where: { authorId: userId, deletedAt: null } }),
      prisma.question.count({ where: { authorId: userId, deletedAt: null, acceptedAnswerId: { not: null } } }),
      prisma.question.count({ where: { authorId: userId, deletedAt: null, visibility: 'HIDDEN' } }),
      prisma.answer.count({ where: { authorId: userId, visibility: 'VISIBLE', question: { visibility: 'VISIBLE', deletedAt: null } } }),
      prisma.answer.count({ where: { authorId: userId, visibility: 'VISIBLE', acceptedFor: { is: { deletedAt: null, visibility: 'VISIBLE' } } } }),
      prisma.project.count({ where: { ownerId: userId, deletedAt: null } }),
      prisma.projectMember.count({ where: { userId, project: { ownerId: { not: userId }, deletedAt: null } } }),
      prisma.application.count({ where: { applicantId: userId } }),
      prisma.application.count({ where: { applicantId: userId, status: 'PENDING' } }),
      prisma.application.count({ where: { status: 'PENDING', project: { ownerId: userId, visibility: 'VISIBLE', deletedAt: null } } })
    ]);
    return {
      questions: { total: questions, resolved, open: questions - resolved, hidden },
      answers: { total: answers, accepted },
      projects: { owned, joined },
      applications: { sent, sentPending, receivedPending }
    };
  }
}

@ApiTags('users')
@ApiCookieAuth()
@Controller('users')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('me/dashboard')
  @ApiOkResponse({ type: DashboardDto, description: 'Compteurs du tableau de bord de Mon espace.' })
  summary(@CurrentUser() user: AuthenticatedUser): Promise<DashboardDto> {
    return this.dashboard.summary(user.id);
  }
}
