import 'reflect-metadata';
import 'dotenv/config';
import path from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ENVIRONMENT } from '../config/config.module';
import type { Environment } from '../config/environment';
import { PhotosService } from '../modules/users/photos.service';
async function main(){const app=await NestFactory.createApplicationContext(AppModule,{logger:false});try{const env=app.get<Environment>(ENVIRONMENT);if(!env.avatarDir||process.argv[2]!=='--confirm-dir'||!process.argv[3]||path.resolve(process.argv[3])!==path.resolve(env.avatarDir))throw Error('Confirm dedicated storage directory');const removed=await app.get(PhotosService).cleanup();console.log(JSON.stringify({event:'avatar_orphans_cleaned',removed}));}finally{await app.close();}}
void main().catch(()=>{console.error('Nettoyage refusé ou incomplet. Vérifier la destination et les permissions.');process.exitCode=1;});
