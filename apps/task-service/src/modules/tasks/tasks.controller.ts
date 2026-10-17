import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@taskflow/auth-lib';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@ApiTags('tasks')
@ApiBearerAuth('access-token')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create new task' })
  async create(
    @Body() dto: CreateTaskDto,
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.tasksService.create(dto, orgId, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.tasksService.findById(id, orgId);
  }

  @Get()
  @ApiOperation({ summary: 'List tasks by project' })
  async findAll(
    @Query('projectId') projectId: string,
    @CurrentUser('orgId') orgId: string,
  ) {
    return this.tasksService.findByProject(projectId, orgId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update task' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.tasksService.update(id, dto, orgId, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete task' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('sub') userId: string,
  ) {
    await this.tasksService.delete(id, orgId, userId);
  }
}
