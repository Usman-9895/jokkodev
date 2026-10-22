import { Controller, Delete, Get, HttpCode, Param, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiCookieAuth, ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { AuthenticatedUser } from '../../common/auth/auth-context';
import { CurrentUser, Public } from '../../common/auth/decorators';
import { PhotosService } from './photos.service';
export class PhotoDto { @ApiProperty({nullable:true,type:String}) photoUrl!: string | null; }
@ApiTags('users')
@Controller('users')
export class PhotosController {
 constructor(private readonly photos:PhotosService) {}
 @Post('me/photo')
 @HttpCode(200)
 @ApiCookieAuth()
 @ApiConsumes('multipart/form-data')
 @ApiBody({schema:{type:'object',required:['file'],properties:{file:{type:'string',format:'binary',description:'JPEG, PNG ou WebP non animé, 2 Mio maximum ; 4096 px par dimension et 4 millions de pixels.'}}}})
 @ApiOkResponse({type:PhotoDto})
 @UseInterceptors(FileInterceptor('file',{limits:{fileSize:2*1024*1024,files:1,fields:0,parts:2}}))
 upload(@CurrentUser() user:AuthenticatedUser,@UploadedFile() file?:{buffer:Buffer}) { return this.photos.replace(user.id,file?.buffer); }
 @Delete('me/photo') @ApiCookieAuth() @ApiOkResponse({type:PhotoDto})
 remove(@CurrentUser() user:AuthenticatedUser) { return this.photos.remove(user.id); }
 @Get('photos/:key') @Public()
 @ApiOkResponse({schema:{type:'string',format:'binary'},description:'JPEG normalisé uniquement, clé encore référencée, no-store.'})
 async read(@Param('key') key:string,@Res() response:Response) { const bytes=await this.photos.read(key);response.setHeader('Content-Type','image/jpeg');response.setHeader('Content-Disposition','inline');response.send(bytes); }
}
