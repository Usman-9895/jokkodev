import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBadRequestResponse, ApiConflictResponse, ApiCookieAuth, ApiNotFoundResponse, ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../common/auth/auth-context';
import { CurrentUser, Public } from '../../common/auth/decorators';
import { ApiErrorDto } from '../../common/filters/api-error.filter';
import { OwnProfileDto, PublicProfileDto, UpdateProfileDto } from './dto/profile.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  // Les routes statiques /users/me sont déclarées avant /users/:reference.
  @Get('me')
  @ApiCookieAuth()
  @ApiOkResponse({ type: OwnProfileDto })
  me(@CurrentUser() user: AuthenticatedUser): Promise<OwnProfileDto> {
    return this.users.findOwn(user.id);
  }

  @Patch('me')
  @ApiCookieAuth()
  @ApiOkResponse({ type: OwnProfileDto })
  @ApiBadRequestResponse({ type: ApiErrorDto, description: 'Validation, technologie inconnue ou champ non modifiable (email, role, status).' })
  @ApiConflictResponse({ type: ApiErrorDto, description: 'USERNAME_TAKEN.' })
  update(@CurrentUser() user: AuthenticatedUser, @Body() input: UpdateProfileDto): Promise<OwnProfileDto> {
    return this.users.updateOwn(user.id, input);
  }

  @Public()
  @Get(':reference')
  @ApiParam({ name: 'reference', description: 'Identifiant ou pseudonyme.' })
  @ApiOkResponse({ type: PublicProfileDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  profile(@Param('reference') reference: string): Promise<PublicProfileDto> {
    return this.users.findPublic(reference);
  }
}
