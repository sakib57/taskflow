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
import { TasksModule } from './modules/tasks/tasks.module';
import { Task } from './modules/tasks/task.entity';
import { OutboxEvent } from './common/outbox/outbox.entity';
import { OutboxModule } from './common/outbox/outbox.module';
import { RabbitMQModule } from './common/rabbitmq/rabbitmq.module';
import { Project } from './modules/projects/project.entity';
import { ProjectsModule } from './modules/projects/projects.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: [join(process.cwd(), 'apps/task-service/.env'), '.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('database.url'),
        entities: [Task, Project, OutboxEvent],
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
    RabbitMQModule,
    OutboxModule,
    ProjectsModule,
    TasksModule,
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
