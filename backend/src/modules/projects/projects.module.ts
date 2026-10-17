import { Module } from '@nestjs/common';
import { ProjectsController, UserProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
@Module({ controllers: [ProjectsController, UserProjectsController], providers: [ProjectsService], exports: [ProjectsService] })
export class ProjectsModule {}
