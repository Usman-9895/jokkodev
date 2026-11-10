import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import { ApiAcceptedResponse, ApiBadRequestResponse, ApiConflictResponse, ApiCookieAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiNoContentResponse, ApiOkResponse, ApiTags, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { CookieOptions, Request, Response } from 'express';
import { ENVIRONMENT } from '../../config/config.module';
import type { Environment } from '../../config/environment';
import { ApiErrorDto } from '../../common/filters/api-error.filter';
import { CurrentUser, Public } from '../../common/auth/decorators';
import type { AuthenticatedUser } from '../../common/auth/auth-context';
import { cookieNames, type CookieNames } from './auth.constants';
import {openSession} from './session-cookies';
import {GoogleService,googleCookieName} from './google.service';
import { AuthService, toCurrentUser } from './auth.service';
import { CSRF } from './auth.tokens';
import type { Csrf } from './csrf';
import { AuthResultDto, CsrfTokenDto, CurrentUserDto, ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto, VerifyEmailDto } from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly names: CookieNames;
  private readonly cookie: CookieOptions;

  constructor(private readonly auth: AuthService, @Inject(CSRF) private readonly csrf: Csrf, @Inject(ENVIRONMENT) private readonly env: Environment,private readonly google:GoogleService) {
    this.names = cookieNames(env.sessionCookieSecure);
    this.cookie = { httpOnly: true, secure: env.sessionCookieSecure, sameSite: 'lax', path: '/' };
  }

  @Public()
  @Get('csrf')
  @ApiOkResponse({ type: CsrfTokenDto })
  token(@Req() request: Request, @Res({ passthrough: true }) response: Response): CsrfTokenDto {
    return { csrfToken: this.csrf.issue(request, response) };
  }

  @Public()
  @Post('register')
  @ApiCreatedResponse({ type: AuthResultDto, description: 'Compte MEMBER créé, session ouverte et email de vérification envoyé.' })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiConflictResponse({ type: ApiErrorDto, description: 'EMAIL_TAKEN ou USERNAME_TAKEN.' })
  @ApiTooManyRequestsResponse({ type: ApiErrorDto })
  async register(@Body() input: RegisterDto, @Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<AuthResultDto> {
    const { user, sessionToken } = await this.auth.register(input, request.ip ?? '');
    return { user: toCurrentUser(user), csrfToken: this.openSession(sessionToken, request, response) };
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOkResponse({ type: AuthResultDto })
  @ApiUnauthorizedResponse({ type: ApiErrorDto, description: 'INVALID_CREDENTIALS.' })
  @ApiForbiddenResponse({ type: ApiErrorDto, description: 'ACCOUNT_SUSPENDED, CSRF_ORIGIN_REJECTED ou CSRF_TOKEN_INVALID.' })
  @ApiTooManyRequestsResponse({ type: ApiErrorDto, description: 'RATE_LIMITED, avec Retry-After.' })
  async login(@Body() input: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<AuthResultDto> {
    const { user, sessionToken } = await this.auth.login(input, request.ip ?? '');
    if (request.auth) await this.auth.logout(request.auth.sessionId);
    return { user: toCurrentUser(user), csrfToken: this.openSession(sessionToken, request, response) };
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Session révoquée côté serveur et cookies effacés, même si la session avait déjà expiré.' })
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<void> {
    await this.auth.logout(request.auth?.sessionId);
    await this.google.cancel(request.cookies?.[googleCookieName(this.env.sessionCookieSecure)]);
    response.clearCookie(googleCookieName(this.env.sessionCookieSecure),this.cookie);
    response.clearCookie(this.names.session, this.cookie);
    response.clearCookie(this.names.csrf, this.cookie);
  }

  @Get('me')
  @ApiCookieAuth()
  @ApiOkResponse({ type: CurrentUserDto })
  @ApiUnauthorizedResponse({ type: ApiErrorDto })
  me(@CurrentUser() user: AuthenticatedUser): CurrentUserDto {
    return toCurrentUser(user);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(202)
  @ApiAcceptedResponse({ description: 'Réponse identique que le compte existe ou non.' })
  @ApiTooManyRequestsResponse({ type: ApiErrorDto })
  async forgotPassword(@Body() input: ForgotPasswordDto, @Req() request: Request): Promise<void> {
    await this.auth.forgotPassword(input, request.ip ?? '');
  }

  @Public()
  @Post('reset-password')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Mot de passe changé et toutes les sessions du compte révoquées.' })
  @ApiBadRequestResponse({ type: ApiErrorDto, description: 'TOKEN_INVALID : lien inconnu, expiré ou déjà utilisé.' })
  async resetPassword(@Body() input: ResetPasswordDto, @Req() request: Request): Promise<void> {
    await this.auth.resetPassword(input, request.ip ?? '');
  }

  @Public()
  @Post('verify-email')
  @HttpCode(204)
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ type: ApiErrorDto, description: 'TOKEN_INVALID.' })
  async verifyEmail(@Body() input: VerifyEmailDto, @Req() request: Request): Promise<void> {
    await this.auth.verifyEmail(input.token, request.ip ?? '');
  }

  @Post('resend-verification')
  @HttpCode(202)
  @ApiCookieAuth()
  @ApiAcceptedResponse({ description: 'Nouvel email envoyé si l’adresse n’est pas encore vérifiée.' })
  @ApiTooManyRequestsResponse({ type: ApiErrorDto })
  async resendVerification(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.auth.resendVerification(user);
  }

  /** Pose le cookie de la nouvelle session et renvoie un jeton CSRF lié à celle-ci. */
  private openSession(sessionToken: string, request: Request, response: Response): string {
    return openSession(sessionToken,request,response,this.env,this.csrf);
  }
}
