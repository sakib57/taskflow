import { Module, Global } from '@nestjs/common';
import { RabbitMQPublisher } from './rabbitmq-publisher.service';

@Global()
@Module({
  providers: [RabbitMQPublisher],
  exports: [RabbitMQPublisher],
})
export class RabbitMQModule {}
