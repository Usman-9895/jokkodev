import {Controller,Delete,Get,HttpCode,Param,ParseUUIDPipe,Post,Res,UploadedFile,UseInterceptors} from '@nestjs/common';
import {FileInterceptor} from '@nestjs/platform-express';
import {ApiBody,ApiConsumes,ApiCookieAuth,ApiCreatedResponse,ApiNoContentResponse,ApiOkResponse,ApiTags} from '@nestjs/swagger';
import type {Response} from 'express';
import {CurrentUser,Public} from '../../common/auth/decorators';
import type {AuthenticatedUser} from '../../common/auth/auth-context';
import {QuestionImagesService,QUESTION_IMAGE_MAX_BYTES} from './question-images.service';
import {PreparedQuestionImageDto} from './question-images.dto';
@ApiTags('questions')
@Controller('question-images')
export class QuestionImagesController {
  constructor(private readonly images:QuestionImagesService) {}
  @Post() @ApiCookieAuth() @ApiConsumes('multipart/form-data')
  @ApiBody({schema:{type:'object',required:['file'],properties:{file:{type:'string',format:'binary',description:'PNG, JPEG ou WebP non animé, 5 Mo (5 Mio), 4096 px par dimension, 4 millions de pixels.'}}}})
  @ApiCreatedResponse({type:PreparedQuestionImageDto})
  @UseInterceptors(FileInterceptor('file',{limits:{fileSize:QUESTION_IMAGE_MAX_BYTES,files:1,fields:0,parts:2}}))
  prepare(@CurrentUser() user:AuthenticatedUser,@UploadedFile() file?:{buffer:Buffer}) {return this.images.prepare(user.id,file?.buffer);}
  @Delete(':id') @HttpCode(204) @ApiCookieAuth() @ApiNoContentResponse({description:'Retire une préparation privée appartenant à la session. Une capture publiée se retire par modification de la question.'})
  remove(@CurrentUser() user:AuthenticatedUser,@Param('id',new ParseUUIDPipe()) id:string) {return this.images.removePrepared(user.id,id);}
  @Get(':id') @Public() @ApiOkResponse({schema:{type:'string',format:'binary'},description:'JPEG réencodé sans métadonnées. Préparation : auteur uniquement ; publication : question visible non supprimée. Toujours private, no-store.'})
  async read(@Param('id',new ParseUUIDPipe()) id:string,@CurrentUser() user:AuthenticatedUser|undefined,@Res() res:Response) {
    res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('Vary','Cookie');
    const bytes=await this.images.read(id,user?.id);
    res.setHeader('Content-Type','image/jpeg');res.setHeader('Content-Disposition','inline');res.send(bytes);
  }
}
