import {Body,Controller,Delete,Get,HttpCode,Inject,Post,Req,Res} from '@nestjs/common';
import {ApiBadRequestResponse,ApiConflictResponse,ApiCookieAuth,ApiForbiddenResponse,ApiNoContentResponse,ApiOkResponse,ApiResponse,ApiTags,ApiTooManyRequestsResponse,ApiUnauthorizedResponse} from '@nestjs/swagger';
import type {Request,Response} from 'express';
import {ENVIRONMENT} from '../../config/config.module';
import type {Environment} from '../../config/environment';
import {Public} from '../../common/auth/decorators';
import {GoogleService,GOOGLE_TTL_MS,googleCookieName} from './google.service';
import {GoogleStatusDto,GoogleStartDto,GoogleStartResultDto,GooglePendingDto,GoogleRegisterDto,GoogleLinkDto} from './google.dto';
import {AuthResultDto} from './dto/auth.dto';
import {toCurrentUser} from './auth.service';
import {CSRF} from './auth.tokens';
import type {Csrf} from './csrf';
import {openSession} from './session-cookies';
import {ApiException} from '../../common/http/api-exception';
import {ApiErrorDto} from '../../common/filters/api-error.filter';
@ApiTags('auth')
@Controller('auth/google')
export class GoogleController {
 constructor(private readonly google:GoogleService,@Inject(ENVIRONMENT) private readonly env:Environment,@Inject(CSRF) private readonly csrf:Csrf){}
 private options(){return {httpOnly:true,secure:this.env.sessionCookieSecure,sameSite:'lax' as const,path:'/'};}
 private token(request:Request):string|undefined{return request.cookies?.[googleCookieName(this.env.sessionCookieSecure)];}
 @Public() @Get('status') @ApiOkResponse({type:GoogleStatusDto})
 status():GoogleStatusDto{return {enabled:!!this.env.google};}
 @Public() @Post('start') @HttpCode(200) @ApiOkResponse({type:GoogleStartResultDto})
 @ApiForbiddenResponse({type:ApiErrorDto,description:'Origine ou jeton CSRF invalide.'})
 @ApiTooManyRequestsResponse({type:ApiErrorDto})
 async start(@Body() input:GoogleStartDto,@Req() req:Request,@Res({passthrough:true}) res:Response):Promise<GoogleStartResultDto>{
  const result=await this.google.start(this.token(req),input.returnTo,req.auth,req.ip??'');
  res.cookie(googleCookieName(this.env.sessionCookieSecure),result.browserToken,{...this.options(),maxAge:GOOGLE_TTL_MS});
  return {authorizationUrl:result.authorizationUrl};
 }
 @Public() @Get('callback')
 @ApiResponse({status:303,description:'Redirection vers une URL JokkoDev propre, résultat ou erreur générique ; aucun jeton Google dans la réponse.'})
 async callback(@Req() req:Request,@Res() res:Response):Promise<void>{
  res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');
  try{
   // Never trust Host, forwarded host, provider next/redirect parameters or raw URLs for destinations.
   const query=req.originalUrl.split('?')[1]??'';
   const url=new URL(this.env.google?.redirectUri??this.env.appOrigin+'/api/v1/auth/google/callback');url.search=query;
   const result=await this.google.callback(this.token(req),url,req.auth);
   if(result.kind==='pending'){
    res.cookie(googleCookieName(this.env.sessionCookieSecure),result.browserToken,{...this.options(),maxAge:GOOGLE_TTL_MS});
    res.redirect(303,this.env.appOrigin+'/connexion/google');
   }else{
    openSession(result.sessionToken,req,res,this.env,this.csrf);res.clearCookie(googleCookieName(this.env.sessionCookieSecure),this.options());
    res.redirect(303,this.env.appOrigin+'/connexion/google?success=1&retour='+encodeURIComponent(result.returnTo));
   }
  }catch(error){
   let reason='failed';
   const code=error instanceof ApiException?(error.getResponse() as {code?:string}).code:'';
   if(code==='GOOGLE_DENIED')reason='cancelled';if(code==='ACCOUNT_SUSPENDED')reason='suspended';if(code==='GOOGLE_FLOW_INVALID')reason='expired';
   res.clearCookie(googleCookieName(this.env.sessionCookieSecure),this.options());
   res.redirect(303,this.env.appOrigin+'/connexion/google?error='+reason);
  }
 }
 @Public() @Get('pending') @ApiOkResponse({type:GooglePendingDto})
 @ApiBadRequestResponse({type:ApiErrorDto,description:'GOOGLE_FLOW_INVALID : capacité absente, expirée ou consommée.'})
 pending(@Req() req:Request):Promise<GooglePendingDto>{return this.google.status(this.token(req));}
 @Public() @Post('register') @ApiOkResponse({type:AuthResultDto}) @HttpCode(200)
 @ApiBadRequestResponse({type:ApiErrorDto})
 @ApiForbiddenResponse({type:ApiErrorDto})
 @ApiConflictResponse({type:ApiErrorDto,description:'EMAIL_TAKEN, USERNAME_TAKEN ou GOOGLE_ALREADY_LINKED.'})
 @ApiTooManyRequestsResponse({type:ApiErrorDto})
 async register(@Body() input:GoogleRegisterDto,@Req() req:Request,@Res({passthrough:true}) res:Response):Promise<AuthResultDto>{
  const result=await this.google.register(this.token(req),input,req.ip??'',req.auth);
  res.clearCookie(googleCookieName(this.env.sessionCookieSecure),this.options());
  return {user:toCurrentUser(result.user),csrfToken:openSession(result.sessionToken,req,res,this.env,this.csrf)};
 }
 @Post('link') @ApiCookieAuth() @ApiOkResponse({type:AuthResultDto}) @HttpCode(200)
 @ApiBadRequestResponse({type:ApiErrorDto})
 @ApiUnauthorizedResponse({type:ApiErrorDto,description:'Session absente ou mot de passe incorrect.'})
 @ApiForbiddenResponse({type:ApiErrorDto,description:'CSRF ou GOOGLE_ACCOUNT_CONTROL_REQUIRED.'})
 @ApiConflictResponse({type:ApiErrorDto,description:'GOOGLE_ALREADY_LINKED.'})
 @ApiTooManyRequestsResponse({type:ApiErrorDto})
 async link(@Body() input:GoogleLinkDto,@Req() req:Request,@Res({passthrough:true}) res:Response):Promise<AuthResultDto>{
  const result=await this.google.link(this.token(req),input.password,req.auth!,req.ip??'');
  res.clearCookie(googleCookieName(this.env.sessionCookieSecure),this.options());
  return {user:toCurrentUser(result.user),csrfToken:openSession(result.sessionToken,req,res,this.env,this.csrf)};
 }
 @Public() @Delete('pending') @HttpCode(204) @ApiNoContentResponse()
 async cancel(@Req() req:Request,@Res({passthrough:true}) res:Response):Promise<void>{await this.google.cancel(this.token(req));res.clearCookie(googleCookieName(this.env.sessionCookieSecure),this.options());}
}
