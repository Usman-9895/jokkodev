import { Module } from '@nestjs/common';
import { DashboardController, DashboardService } from './dashboard';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
@Module({ controllers: [DashboardController, UsersController], providers: [UsersService, DashboardService], exports: [UsersService] })
export class UsersModule {}
