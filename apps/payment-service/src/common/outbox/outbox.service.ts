import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, DataSource } from 'typeorm';
import { OutboxEvent } from './outbox.entity';

export interface CreateOutboxEventDto {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  orgId?: string | null;
  payload: Record<string, any>;
}

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    @InjectRepository(OutboxEvent)
    private readonly repo: Repository<OutboxEvent>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Save event to outbox within the same transaction.
   * Call this inside your business transaction.
   */
  async saveEvent(
    manager: EntityManager,
    dto: CreateOutboxEventDto,
  ): Promise<OutboxEvent> {
    const event = manager.create(OutboxEvent, {
      eventType: dto.eventType,
      aggregateType: dto.aggregateType,
      aggregateId: dto.aggregateId,
      orgId: dto.orgId ?? null,
      payload: dto.payload,
      status: 'pending',
    });
    return manager.save(event);
  }

  /**
   * Fetch batch of pending events for publishing.
   */
  async fetchPending(limit = 50): Promise<OutboxEvent[]> {
    return this.repo
      .createQueryBuilder('event')
      .where('event.status = :status', { status: 'pending' })
      .andWhere('event.attempts < :maxAttempts', { maxAttempts: 5 })
      .orderBy('event.createdAt', 'ASC')
      .take(limit)
      .getMany();
  }

  async markSent(id: string): Promise<void> {
    await this.repo.update(id, {
      status: 'sent',
      sentAt: new Date(),
    });
  }

  async markFailed(id: string, error: string): Promise<void> {
    const event = await this.repo.findOne({ where: { id } });
    if (!event) return;

    const attempts = event.attempts + 1;
    const status = attempts >= 5 ? 'failed' : 'pending';

    await this.repo.update(id, {
      status: status as any,
      attempts,
      error,
    });
  }
}
