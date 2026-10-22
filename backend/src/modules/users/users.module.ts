import { CollaborationController } from './collaboration';
import { PhotosController } from './photos.controller';
import { PhotosService } from './photos.service';
import { Module } from '@nestjs/common';
import { DashboardController, DashboardService } from './dashboard';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
@Module({ controllers: [PhotosController, CollaborationController, DashboardController, UsersController], providers: [PhotosService, UsersService, DashboardService], exports: [UsersService] })
export class UsersModule {}
