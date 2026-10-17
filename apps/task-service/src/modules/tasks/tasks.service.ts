import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Task } from './task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { OutboxService } from '../../common/outbox/outbox.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Task)
    private readonly repo: Repository<Task>,
    private readonly dataSource: DataSource,
    private readonly outboxService: OutboxService,
  ) {}

  async create(
    dto: CreateTaskDto,
    orgId: string,
    userId: string,
  ): Promise<Task> {
    return this.dataSource.transaction(async (manager) => {
      const task = manager.create(Task, {
        orgId,
        projectId: dto.projectId,
        title: dto.title,
        description: dto.description ?? null,
        status: dto.status ?? 'todo',
        priority: dto.priority ?? 'medium',
        assigneeId: dto.assigneeId ?? null,
        createdBy: userId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      });
      const saved = await manager.save(task);

      // Save event to outbox (same transaction!)
      await this.outboxService.saveEvent(manager, {
        eventType: 'task.created',
        aggregateType: 'Task',
        aggregateId: saved.id,
        orgId,
        payload: {
          taskId: saved.id,
          projectId: saved.projectId,
          title: saved.title,
          status: saved.status,
          priority: saved.priority,
          assigneeId: saved.assigneeId,
          createdBy: saved.createdBy,
        },
      });

      this.logger.log(`Task created: ${saved.id}`);
      return saved;
    });
  }

  async findById(id: string, orgId: string): Promise<Task> {
    const task = await this.repo.findOne({ where: { id, orgId } });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return task;
  }

  async findByProject(projectId: string, orgId: string): Promise<Task[]> {
    return this.repo.find({
      where: { projectId, orgId },
      order: { createdAt: 'DESC' },
    });
  }

  async update(
    id: string,
    dto: UpdateTaskDto,
    orgId: string,
    userId: string,
  ): Promise<Task> {
    return this.dataSource.transaction(async (manager) => {
      const task = await manager.findOne(Task, { where: { id, orgId } });
      if (!task) throw new NotFoundException(`Task ${id} not found`);

      const previousAssignee = task.assigneeId;

      if (dto.title !== undefined) task.title = dto.title;
      if (dto.description !== undefined) task.description = dto.description;
      if (dto.status !== undefined) task.status = dto.status;
      if (dto.priority !== undefined) task.priority = dto.priority;
      if (dto.assigneeId !== undefined) task.assigneeId = dto.assigneeId;
      if (dto.dueDate !== undefined) task.dueDate = new Date(dto.dueDate);

      const saved = await manager.save(task);

      // Task updated event
      await this.outboxService.saveEvent(manager, {
        eventType: 'task.updated',
        aggregateType: 'Task',
        aggregateId: saved.id,
        orgId,
        payload: {
          taskId: saved.id,
          changes: dto,
          updatedBy: userId,
        },
      });

      // If assignee changed, emit task.assigned event
      if (
        dto.assigneeId !== undefined &&
        dto.assigneeId !== previousAssignee
      ) {
        await this.outboxService.saveEvent(manager, {
          eventType: 'task.assigned',
          aggregateType: 'Task',
          aggregateId: saved.id,
          orgId,
          payload: {
            taskId: saved.id,
            projectId: saved.projectId,
            title: saved.title,
            previousAssignee,
            newAssignee: saved.assigneeId,
            assignedBy: userId,
          },
        });
      }

      return saved;
    });
  }

  async delete(id: string, orgId: string, userId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const task = await manager.findOne(Task, { where: { id, orgId } });
      if (!task) throw new NotFoundException(`Task ${id} not found`);

      await manager.remove(task);

      await this.outboxService.saveEvent(manager, {
        eventType: 'task.deleted',
        aggregateType: 'Task',
        aggregateId: id,
        orgId,
        payload: {
          taskId: id,
          projectId: task.projectId,
          deletedBy: userId,
        },
      });
    });
  }
}
