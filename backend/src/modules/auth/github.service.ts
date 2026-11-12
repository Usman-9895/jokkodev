import {Inject,Injectable} from '@nestjs/common';
import {ENVIRONMENT} from '../../config/config.module';
import type {Environment} from '../../config/environment';
import {DatabaseService} from '../../database/database.service';
import {RateLimiter} from '../../common/rate-limit/rate-limiter.service';
import {AuthService} from './auth.service';
import {SessionsService} from './sessions.service';
import {PasswordService} from './passwords.service';
import {ExternalAuthService,EXTERNAL_TTL_MS,externalReturnPath} from './external-auth.service';
import {GitHubOAuth} from './github.oauth';
export const GITHUB_TTL_MS=EXTERNAL_TTL_MS;
export const githubCookieName=(secure:boolean)=>(secure?'__Host-':'')+'jokkodev_github';
export const githubReturnPath=externalReturnPath;
@Injectable()
export class GitHubService extends ExternalAuthService {
 constructor(@Inject(ENVIRONMENT) env:Environment,db:DatabaseService,protocol:GitHubOAuth,auth:AuthService,sessions:SessionsService,passwords:PasswordService,limiter:RateLimiter){super(env,db,protocol,auth,sessions,passwords,limiter,'github');}
}
