import { Module, Global } from '@nestjs/common';
import { RabbitMQPublisher } from './rabbitmq-publisher.service';
import { ClientsModule } from '@nestjs/microservices';

@Global()
@Module({
  imports: [ClientsModule.register([{ name: 'RABBITMQ_SERVICE' }])],
  providers: [RabbitMQPublisher],
  exports: [RabbitMQPublisher, ClientsModule],
})
export class RabbitMQModule {}
