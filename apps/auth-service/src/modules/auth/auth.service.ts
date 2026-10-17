import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import * as bcrypt from 'bcrypt';
import { JwtPayload, AuthTokens } from '@taskflow/shared-types';
import { UsersService } from '../users/users.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { MembershipsService } from '../memberships/memberships.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly BCRYPT_ROUNDS = 12;

  constructor(
    private readonly usersService: UsersService,
    private readonly orgsService: OrganizationsService,
    private readonly membershipsService: MembershipsService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);

    const user = await this.usersService.create({
      email: dto.email,
      name: dto.name,
      passwordHash,
    });

    const org = await this.orgsService.create({
      name: dto.orgName,
      ownerId: user.id,
    });

    await this.membershipsService.create({
      userId: user.id,
      orgId: org.id,
      role: 'owner',
    });

    return this.generateTokens(user.id, user.email, org.id);
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const memberships = await this.membershipsService.findByUser(user.id);
    const defaultOrgId = memberships[0]?.orgId;

    return this.generateTokens(user.id, user.email, defaultOrgId);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
        algorithms: ['HS256'],
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const key = `refresh:${payload.sub}:${refreshToken}`;
    const exists = await this.redis.get(key);
    if (!exists) {
      throw new UnauthorizedException('Token revoked');
    }

    await this.redis.del(key);

    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException('User not found');

    return this.generateTokens(user.id, user.email, payload.orgId);
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    const key = `refresh:${userId}:${refreshToken}`;
    await this.redis.del(key);
  }

  async getMe(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();

    const memberships = await this.membershipsService.findByUser(userId);
    const orgs = await Promise.all(
      memberships.map(async (m) => {
        const org = await this.orgsService.findById(m.orgId);
        return org ? { ...org, role: m.role } : null;
      }),
    );

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      organizations: orgs.filter(Boolean),
    };
  }

  private async generateTokens(
    userId: string,
    email: string,
    orgId?: string,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: userId,
      email,
      orgId,
      type: 'access',
    };

    const accessSecret = this.config.get<string>('jwt.accessSecret') || 'default-access-secret-change-me';
    const refreshSecret = this.config.get<string>('jwt.refreshSecret') || 'default-refresh-secret-change-me';
    const accessExpiresIn = this.config.get<string>('jwt.accessExpiresIn') || '15m';
    const refreshExpiresIn = this.config.get<string>('jwt.refreshExpiresIn') || '30d';

    const accessOptions: JwtSignOptions = {
      secret: accessSecret,
      expiresIn: accessExpiresIn as any,
    };

    const refreshOptions: JwtSignOptions = {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn as any,
    };

    const accessToken = this.jwtService.sign({ ...payload } as any, accessOptions);

    const refreshToken = this.jwtService.sign(
      { ...payload, type: 'refresh' } as any,
      refreshOptions,
    );

    const key = `refresh:${userId}:${refreshToken}`;
    await this.redis.setex(key, 30 * 24 * 3600, 'valid');

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
    };
  }
}
