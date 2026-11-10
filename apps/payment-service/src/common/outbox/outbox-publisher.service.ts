import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OutboxService } from './outbox.service';
import { RabbitMQPublisher } from '../rabbitmq/rabbitmq-publisher.service';

@Injectable()
export class OutboxPublisher {
  private readonly logger = new Logger(OutboxPublisher.name);
  private isRunning = false;

  constructor(
    private readonly outboxService: OutboxService,
    private readonly publisher: RabbitMQPublisher,
  ) {}

  /**
   * Poll outbox table every 2 seconds, publish pending events.
   */
  @Cron(CronExpression.EVERY_5_SECONDS)
  async publishPendingEvents(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const events = await this.outboxService.fetchPending(50);
      if (events.length === 0) return;

      this.logger.debug(`Found ${events.length} pending events`);

      for (const event of events) {
        try {
          await this.publisher.publish(event.eventType, {
            id: event.id,
            type: event.eventType,
            aggregateType: event.aggregateType,
            aggregateId: event.aggregateId,
            orgId: event.orgId,
            payload: event.payload,
            timestamp: event.createdAt.toISOString(),
          });

          await this.outboxService.markSent(event.id);
        } catch (err: any) {
          this.logger.error(
            `Failed to publish event ${event.id}: ${err.message}`,
          );
          await this.outboxService.markFailed(event.id, err.message);
        }
      }
    } finally {
      this.isRunning = false;
    }
  }
}
