import { Module } from '@nestjs/common';
import { AnswersController, QuestionsController, UserContributionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { ReputationModule } from '../reputation/reputation.module';
import {QuestionImagesService} from './question-images.service';
import {QuestionImagesController} from './question-images.controller';
@Module({ imports: [ReputationModule], controllers: [QuestionsController, AnswersController, UserContributionsController,QuestionImagesController], providers: [QuestionsService,QuestionImagesService], exports: [QuestionsService,QuestionImagesService] })
export class QuestionsModule {}
