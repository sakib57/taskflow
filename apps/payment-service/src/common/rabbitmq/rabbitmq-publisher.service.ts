import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;
type AmqpChannel = Awaited<ReturnType<AmqpConnection['createChannel']>>;

@Injectable()
export class RabbitMQPublisher implements OnModuleInit {
  private readonly logger = new Logger(RabbitMQPublisher.name);
  private connection: AmqpConnection | null = null;
  private channel: AmqpChannel | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  private async connect(retries = 5): Promise<void> {
    const url = this.config.get<string>('rabbitmq.url');
    if (!url) {
      this.logger.error('RABBITMQ_URL not set');
      return;
    }

    for (let i = 0; i < retries; i++) {
      try {
        const conn = await amqp.connect(url);
        const ch = await conn.createChannel();

        // Assert main exchange
        await ch.assertExchange('taskflow.events', 'topic', {
          durable: true,
        });

        conn.on('error', (err: any) => {
          this.logger.error('RabbitMQ connection error', err);
        });

        conn.on('close', () => {
          this.logger.warn('RabbitMQ connection closed, reconnecting...');
          setTimeout(() => this.connect(), 5000);
        });

        this.connection = conn;
        this.channel = ch;

        this.logger.log('✅ Connected to RabbitMQ');
        return;
      } catch (err: any) {
        this.logger.error(
          `Failed to connect to RabbitMQ (attempt ${i + 1}/${retries}): ${err.message}`,
        );
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }

  async publish(eventType: string, payload: Record<string, any>): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    const buffer = Buffer.from(JSON.stringify(payload));

    this.channel.publish('taskflow.events', eventType, buffer, {
      persistent: true,
      contentType: 'application/json',
      timestamp: Date.now(),
      messageId: payload.id,
    });

    this.logger.debug(`Published: ${eventType}`);
  }

  async close(): Promise<void> {
    try {
      await this.channel?.close();
    } catch (err) {
      // ignore
    }
    try {
      await this.connection?.close();
    } catch (err) {
      // ignore
    }
  }
}
