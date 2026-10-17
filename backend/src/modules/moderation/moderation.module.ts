import { Module } from '@nestjs/common';
import { AdminController, ReportsController } from './moderation.controller';
import { ModerationService } from './moderation.service';
@Module({ controllers: [ReportsController, AdminController], providers: [ModerationService] })
export class ModerationModule {}
