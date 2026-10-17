import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@taskflow/auth-lib';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';

@ApiTags('projects')
@ApiBearerAuth('access-token')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create new project' })
  @ApiResponse({ status: 201, description: 'Project created' })
  async create(
    @Body() dto: CreateProjectDto,
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.projectsService.create(dto, orgId, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List all projects in current organization' })
  async findAll(@CurrentUser('orgId') orgId: string) {
    return this.projectsService.findAll(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.projectsService.findById(id, orgId);
  }
}
