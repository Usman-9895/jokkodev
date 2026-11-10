import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ENVIRONMENT } from '../../config/config.module';
import type { Environment } from '../../config/environment';
import { AccountTokensService } from './account-tokens.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CSRF } from './auth.tokens';
import { createCsrf } from './csrf';
import { PasswordService } from './passwords.service';
import { SessionGuard } from './session.guard';
import { SessionsService } from './sessions.service';
import {GoogleController} from './google.controller';
import {GoogleService} from './google.service';
import {GoogleOidc} from './google.oidc';

@Global()
@Module({
  controllers: [AuthController,GoogleController],
  providers: [
    AuthService, PasswordService, SessionsService, AccountTokensService,GoogleService,GoogleOidc,
    { provide: CSRF, inject: [ENVIRONMENT], useFactory: (env: Environment) => createCsrf(env) },
    { provide: APP_GUARD, useClass: SessionGuard }
  ],
  exports: [SessionsService, PasswordService, CSRF]
})
export class AuthModule {}
