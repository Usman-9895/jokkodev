import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/auth/decorators';
import { TechnologyListDto, TechnologyQueryDto } from './technologies.dto';
import { TechnologiesService } from './technologies.service';

@Public()
@ApiTags('technologies')
@Controller('technologies')
export class TechnologiesController {
  constructor(private readonly technologies: TechnologiesService) {}

  @Get()
  @ApiOkResponse({ type: TechnologyListDto, description: 'Catalogue commun trié par nom.' })
  async list(@Query() query: TechnologyQueryDto): Promise<TechnologyListDto> {
    return { data: await this.technologies.list(query) };
  }
}
