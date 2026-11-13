import 'reflect-metadata';
import 'dotenv/config';
import path from 'node:path';
import {NestFactory} from '@nestjs/core';
import {AppModule} from '../app.module';
import {ENVIRONMENT} from '../config/config.module';
import type {Environment} from '../config/environment';
import {QuestionImagesService} from '../modules/questions/question-images.service';
async function main() {
  const app=await NestFactory.createApplicationContext(AppModule,{logger:false});
  try {
    const env=app.get<Environment>(ENVIRONMENT),args=process.argv.slice(2);
    const expected=args[1],database=args[3];
    if(args[0]!=='--confirm-dir'||!env.questionImageDir||!expected||path.resolve(expected)!==path.resolve(env.questionImageDir)||args[2]!=='--confirm-database'||!database||decodeURIComponent(new URL(env.databaseUrl).pathname.slice(1))!==database||args.slice(4).some(v=>v!=='--execute'))throw Error('destination');
    console.log(JSON.stringify({event:'question_images_cleanup',...await app.get(QuestionImagesService).cleanup(args.includes('--execute'))}));
  } finally {await app.close();}
}
void main().catch(()=>{console.error('Nettoyage refusé ou incomplet : vérifier la destination et les permissions.');process.exitCode=1;});
