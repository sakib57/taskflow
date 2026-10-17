import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { Redis } from 'ioredis';
import { JwtAuthGuard } from '@taskflow/auth-lib';
import configuration from './config/configuration';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { User } from './modules/users/user.entity';
import { Organization } from './modules/organizations/organization.entity';
import { Membership } from './modules/memberships/membership.entity';

// Redis Global Module
const RedisProvider = {
  provide: 'REDIS_CLIENT',
  useFactory: (config: ConfigService) => {
    return new Redis(config.get<string>('redis.url') || '');
  },
  inject: [ConfigService],
};

@Global()
@Module({
  providers: [RedisProvider],
  exports: [RedisProvider],
})
class RedisModule {}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: 'apps/auth-service/.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('database.url'),
        entities: [User, Organization, Membership],
        synchronize: config.get<string>('nodeEnv') === 'development',
        logging: false,
      }),
    }),
    RedisModule,
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
    AuthModule,
    UsersModule,
    OrganizationsModule,
    MembershipsModule,
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
