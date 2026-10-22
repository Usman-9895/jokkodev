import { Module } from '@nestjs/common';
import { AdminController, ReportsController } from './moderation.controller';
import { ModerationService } from './moderation.service';
import { ReputationModule } from '../reputation/reputation.module';
@Module({ imports: [ReputationModule], controllers: [ReportsController, AdminController], providers: [ModerationService] })
export class ModerationModule {}
