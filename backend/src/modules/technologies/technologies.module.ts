import { Global, Module } from '@nestjs/common';
import { TechnologiesController } from './technologies.controller';
import { TechnologiesService } from './technologies.service';
@Global()
@Module({ controllers: [TechnologiesController], providers: [TechnologiesService], exports: [TechnologiesService] })
export class TechnologiesModule {}
