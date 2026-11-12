import {Inject,Injectable} from '@nestjs/common';
import {ENVIRONMENT} from '../../config/config.module';
import type {Environment} from '../../config/environment';
import {DatabaseService} from '../../database/database.service';
import {RateLimiter} from '../../common/rate-limit/rate-limiter.service';
import {AuthService} from './auth.service';
import {SessionsService} from './sessions.service';
import {PasswordService} from './passwords.service';
import {ExternalAuthService,EXTERNAL_TTL_MS,externalReturnPath} from './external-auth.service';
import {GoogleOidc} from './google.oidc';
export const GOOGLE_TTL_MS=EXTERNAL_TTL_MS;
export const googleCookieName=(secure:boolean)=>(secure?'__Host-':'')+'jokkodev_google';
export const googleReturnPath=externalReturnPath;
@Injectable()
export class GoogleService extends ExternalAuthService {
 constructor(@Inject(ENVIRONMENT) env:Environment,db:DatabaseService,protocol:GoogleOidc,auth:AuthService,sessions:SessionsService,passwords:PasswordService,limiter:RateLimiter){super(env,db,protocol,auth,sessions,passwords,limiter,'google');}
}
