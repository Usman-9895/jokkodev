import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiProperty, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { DatabaseService } from '../database/database.service';
import { ApiErrorDto } from '../common/filters/api-error.filter';
import { Public } from '../common/auth/decorators';
export class HealthDto { @ApiProperty({ enum: ['ok'] }) status!: 'ok'; }
@Public()
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseService) {}
  @Get('live')
  @ApiOkResponse({ type: HealthDto })
  live(): HealthDto { return { status: 'ok' }; }
  @Get('ready')
  @ApiOkResponse({ type: HealthDto })
  @ApiServiceUnavailableResponse({ type: ApiErrorDto })
  async ready(): Promise<HealthDto> { try { await this.database.ping(); return { status: 'ok' }; } catch { throw new ServiceUnavailableException(); } }
}
