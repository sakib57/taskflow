import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './payment.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { RabbitMQModule } from '../../common/rabbitmq/rabbitmq.module';

@Module({
  imports: [TypeOrmModule.forFeature([Payment]), RabbitMQModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
