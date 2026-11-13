import {Body,Controller,Delete,Get,HttpCode,Inject,Post,Req,Res} from '@nestjs/common';
import {ApiBadRequestResponse,ApiConflictResponse,ApiCookieAuth,ApiForbiddenResponse,ApiNoContentResponse,ApiOkResponse,ApiResponse,ApiTags,ApiTooManyRequestsResponse,ApiUnauthorizedResponse} from '@nestjs/swagger';
import type {Request,Response} from 'express';
import {ENVIRONMENT} from '../../config/config.module';
import type {Environment} from '../../config/environment';
import {Public} from '../../common/auth/decorators';
import {GitHubService,GITHUB_TTL_MS,githubCookieName} from './github.service';
import {GitHubStatusDto,GitHubStartDto,GitHubStartResultDto,GitHubPendingDto,GitHubRegisterDto,GitHubLinkDto} from './github.dto';
import {AuthResultDto} from './dto/auth.dto';
import {toCurrentUser} from './auth.service';
import {CSRF} from './auth.tokens';
import type {Csrf} from './csrf';
import {openSession} from './session-cookies';
import {ApiException} from '../../common/http/api-exception';
import {ApiErrorDto} from '../../common/filters/api-error.filter';
import {reportGitHubFailure} from './github-diagnostics';
@ApiTags('auth')
@Controller('auth/github')
export class GitHubController {
 constructor(private readonly github:GitHubService,@Inject(ENVIRONMENT) private readonly env:Environment,@Inject(CSRF) private readonly csrf:Csrf){}
 private options(){return {httpOnly:true,secure:this.env.sessionCookieSecure,sameSite:'lax' as const,path:'/'};}
 private token(request:Request):string|undefined{return request.cookies?.[githubCookieName(this.env.sessionCookieSecure)];}
 @Public() @Get('status') @ApiOkResponse({type:GitHubStatusDto})
 status():GitHubStatusDto{return {enabled:!!this.env.github};}
 @Public() @Post('start') @HttpCode(200) @ApiOkResponse({type:GitHubStartResultDto})
 @ApiForbiddenResponse({type:ApiErrorDto,description:'Origine ou jeton CSRF invalide.'})
 @ApiTooManyRequestsResponse({type:ApiErrorDto})
 async start(@Body() input:GitHubStartDto,@Req() req:Request,@Res({passthrough:true}) res:Response):Promise<GitHubStartResultDto>{
  const result=await this.github.start(this.token(req),input.returnTo,req.auth,req.ip??'');
  res.cookie(githubCookieName(this.env.sessionCookieSecure),result.browserToken,{...this.options(),maxAge:GITHUB_TTL_MS});
  return {authorizationUrl:result.authorizationUrl};
 }
 @Public() @Get('callback')
 @ApiResponse({status:303,description:'Redirection vers une URL JokkoDev propre, résultat ou erreur générique ; aucun jeton GitHub dans la réponse.'})
 async callback(@Req() req:Request,@Res() res:Response):Promise<void>{
  res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');
  try{
   // Never trust Host, forwarded host, provider next/redirect parameters or raw URLs for destinations.
   const query=req.originalUrl.split('?')[1]??'';
   const url=new URL(this.env.github?.redirectUri??this.env.appOrigin+'/api/v1/auth/github/callback');url.search=query;
   const result=await this.github.callback(this.token(req),url,req.auth);
   if(result.kind==='pending'){
    res.cookie(githubCookieName(this.env.sessionCookieSecure),result.browserToken,{...this.options(),maxAge:GITHUB_TTL_MS});
    res.redirect(303,this.env.appOrigin+'/connexion/github');
   }else{
    openSession(result.sessionToken,req,res,this.env,this.csrf);res.clearCookie(githubCookieName(this.env.sessionCookieSecure),this.options());
    res.redirect(303,this.env.appOrigin+'/connexion/github?success=1&retour='+encodeURIComponent(result.returnTo));
   }
  }catch(error){
   let reason='failed';
   const code=error instanceof ApiException?(error.getResponse() as {code?:string}).code:'';
   // Protocol failures have already emitted their one sanitized stage record.
   if(code!=='GITHUB_UNAVAILABLE'&&code!=='GITHUB_NO_VERIFIED_EMAIL')reportGitHubFailure(this.env.githubDiagnosticsEnabled,'callback',error);
   if(code==='GITHUB_NO_VERIFIED_EMAIL')reason='no-email';if(code==='GITHUB_DENIED')reason='cancelled';if(code==='ACCOUNT_SUSPENDED')reason='suspended';if(code==='GITHUB_FLOW_INVALID')reason='expired';
   res.clearCookie(githubCookieName(this.env.sessionCookieSecure),this.options());
   res.redirect(303,this.env.appOrigin+'/connexion/github?error='+reason);
  }
 }
 @Public() @Get('pending') @ApiOkResponse({type:GitHubPendingDto})
 @ApiBadRequestResponse({type:ApiErrorDto,description:'GITHUB_FLOW_INVALID : capacité absente, expirée ou consommée.'})
 pending(@Req() req:Request):Promise<GitHubPendingDto>{return this.github.status(this.token(req));}
 @Public() @Post('register') @ApiOkResponse({type:AuthResultDto}) @HttpCode(200)
 @ApiBadRequestResponse({type:ApiErrorDto})
 @ApiForbiddenResponse({type:ApiErrorDto})
 @ApiConflictResponse({type:ApiErrorDto,description:'EMAIL_TAKEN, USERNAME_TAKEN ou GITHUB_ALREADY_LINKED.'})
 @ApiTooManyRequestsResponse({type:ApiErrorDto})
 async register(@Body() input:GitHubRegisterDto,@Req() req:Request,@Res({passthrough:true}) res:Response):Promise<AuthResultDto>{
  const result=await this.github.register(this.token(req),input,req.ip??'',req.auth);
  res.clearCookie(githubCookieName(this.env.sessionCookieSecure),this.options());
  return {user:toCurrentUser(result.user),csrfToken:openSession(result.sessionToken,req,res,this.env,this.csrf)};
 }
 @Post('link') @ApiCookieAuth() @ApiOkResponse({type:AuthResultDto}) @HttpCode(200)
 @ApiBadRequestResponse({type:ApiErrorDto})
 @ApiUnauthorizedResponse({type:ApiErrorDto,description:'Session absente ou mot de passe incorrect.'})
 @ApiForbiddenResponse({type:ApiErrorDto,description:'CSRF ou GITHUB_ACCOUNT_CONTROL_REQUIRED.'})
 @ApiConflictResponse({type:ApiErrorDto,description:'GITHUB_ALREADY_LINKED.'})
 @ApiTooManyRequestsResponse({type:ApiErrorDto})
 async link(@Body() input:GitHubLinkDto,@Req() req:Request,@Res({passthrough:true}) res:Response):Promise<AuthResultDto>{
  const result=await this.github.link(this.token(req),input.password,req.auth!,req.ip??'');
  res.clearCookie(githubCookieName(this.env.sessionCookieSecure),this.options());
  return {user:toCurrentUser(result.user),csrfToken:openSession(result.sessionToken,req,res,this.env,this.csrf)};
 }
 @Public() @Delete('pending') @HttpCode(204) @ApiNoContentResponse()
 async cancel(@Req() req:Request,@Res({passthrough:true}) res:Response):Promise<void>{await this.github.cancel(this.token(req));res.clearCookie(githubCookieName(this.env.sessionCookieSecure),this.options());}
}
