import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Project } from './project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { OutboxService } from '../../common/outbox/outbox.service';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @InjectRepository(Project)
    private readonly repo: Repository<Project>,
    private readonly dataSource: DataSource,
    private readonly outboxService: OutboxService,
  ) {}

  async create(
    dto: CreateProjectDto,
    orgId: string,
    userId: string,
  ): Promise<Project> {
    return this.dataSource.transaction(async (manager) => {
      const project = manager.create(Project, {
        orgId,
        name: dto.name,
        description: dto.description ?? null,
        createdBy: userId,
        status: 'active',
      });
      const saved = await manager.save(project);

      // Outbox event
      await this.outboxService.saveEvent(manager, {
        eventType: 'project.created',
        aggregateType: 'Project',
        aggregateId: saved.id,
        orgId,
        payload: {
          projectId: saved.id,
          name: saved.name,
          createdBy: saved.createdBy,
        },
      });

      this.logger.log(`Project created: ${saved.id}`);
      return saved;
    });
  }

  async findAll(orgId: string): Promise<Project[]> {
    return this.repo.find({
      where: { orgId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string, orgId: string): Promise<Project> {
    const project = await this.repo.findOne({ where: { id, orgId } });
    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }
    return project;
  }
}
