import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { join } from 'path';
import { JwtAuthGuard } from '@taskflow/auth-lib';
import configuration from './config/configuration';
import { OutboxEvent } from './common/outbox/outbox.entity';
import { OutboxModule } from './common/outbox/outbox.module';
import { RabbitMQModule } from './common/rabbitmq/rabbitmq.module';
import { Payment } from './modules/payments/payment.entity';
import { PaymentsModule } from './modules/payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: [join(process.cwd(), 'apps/payment-service/.env'), '.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('database.url'),
        entities: [Payment, OutboxEvent],
        synchronize: config.get<string>('nodeEnv') === 'development',
        logging: false,
      }),
    }),
    ScheduleModule.forRoot(),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.accessSecret') || 'default-secret',
        signOptions: {
          expiresIn: (config.get<string>('jwt.accessExpiresIn') || '15m') as any,
        },
      }),
    }),
    // RabbitMQModule,
    // OutboxModule,
    PaymentsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useFactory: (jwtService: JwtService, reflector: Reflector) =>
        new JwtAuthGuard(jwtService, reflector),
      inject: [JwtService, Reflector],
    },
  ],
})
export class AppModule {}
