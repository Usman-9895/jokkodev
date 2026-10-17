import { Module } from '@nestjs/common';
import { AnswersController, QuestionsController, UserContributionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
@Module({ controllers: [QuestionsController, AnswersController, UserContributionsController], providers: [QuestionsService], exports: [QuestionsService] })
export class QuestionsModule {}
