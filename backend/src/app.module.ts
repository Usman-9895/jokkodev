import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { RateLimitModule } from './common/rate-limit/rate-limit.module';
import { HealthModule } from './health/health.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { AuthModule } from './modules/auth/auth.module';
import { MailModule } from './modules/mail/mail.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { TechnologiesModule } from './modules/technologies/technologies.module';
import { UsersModule } from './modules/users/users.module';
@Module({ imports: [ConfigModule, DatabaseModule, RateLimitModule, MailModule, AuthModule, HealthModule, TechnologiesModule, UsersModule, QuestionsModule, ProjectsModule, ApplicationsModule, ModerationModule] })
export class AppModule {}
