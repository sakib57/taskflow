import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { join } from 'path';
import { JwtAuthGuard } from '@taskflow/auth-lib';
import configuration from './config/configuration';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { PreferencesModule } from './modules/preferences/preferences.module';
import { Profile } from './modules/profiles/profile.entity';
import { Preference } from './modules/preferences/preference.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: [
        join(process.cwd(), 'apps/user-service/.env'),
        '.env',
      ],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('database.url'),
        entities: [Profile, Preference],
        synchronize: config.get<string>('nodeEnv') === 'development',
        logging: false,
      }),
    }),
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
    ProfilesModule,
    PreferencesModule,
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
