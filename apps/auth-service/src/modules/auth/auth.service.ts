import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis'; // need to install
import { UsersService } from '../users/users.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { MembershipsService } from '../memberships/memberships.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload, AuthTokens } from '@taskflow/shared-types';
import { User } from '../users/user.entity';

@Injectable()
export class AuthService {
  private readonly BCRYPT_ROUNDS = 12;

  constructor(
    private usersService: UsersService,
    private orgsService: OrganizationsService,
    private membershipsService: MembershipsService,
    private jwtService: JwtService,
    private config: ConfigService,
    @InjectRedis() private redis: Redis,
  ) {}

  // ============================================
  // Register
  // ============================================
  async register(dto: RegisterDto): Promise<AuthTokens> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Password hash
    const passwordHash = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);

    // User create
    const user = await this.usersService.create({
      email: dto.email,
      name: dto.name,
      passwordHash,
    });

    // Organization create
    const org = await this.orgsService.create({
      name: dto.orgName,
      ownerId: user.id,
    });

    // Membership (owner)
    await this.membershipsService.create({
      userId: user.id,
      orgId: org.id,
      role: 'owner',
    });

    return this.generateTokens(user, org.id);
  }

  // ============================================
  // Login
  // ============================================
  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Default org (first membership)
    const memberships = await this.membershipsService.findByUser(user.id);
    const defaultOrgId = memberships[0]?.orgId;

    return this.generateTokens(user, defaultOrgId);
  }

  // ============================================
  // Refresh
  // ============================================
  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('jwt.refreshSecret'),
        algorithms: ['HS256'],
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Redis-এ token আছে কিনা
    const key = `refresh:${payload.sub}:${refreshToken}`;
    const exists = await this.redis.get(key);
    if (!exists) {
      throw new UnauthorizedException('Token revoked');
    }

    // Rotation: পুরোনো delete
    await this.redis.del(key);

    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException('User not found');

    return this.generateTokens(user, payload.orgId);
  }

  // ============================================
  // Logout
  // ============================================
  async logout(userId: string, refreshToken: string): Promise<void> {
    const key = `refresh:${userId}:${refreshToken}`;
    await this.redis.del(key);
  }

  // ============================================
  // Get User Profile with Orgs
  // ============================================
  async getMe(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();

    const memberships = await this.membershipsService.findByUser(userId);
    const orgs = await Promise.all(
      memberships.map(async (m) => {
        const org = await this.orgsService.findById(m.orgId);
        return { ...org, role: m.role };
      }),
    );

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      organizations: orgs,
    };
  }

  // ============================================
  // Helper: Generate Tokens
  // ============================================
  private async generateTokens(
    user: User,
    orgId?: string,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      orgId,
      type: 'access',
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get('jwt.accessSecret'),
      expiresIn: this.config.get('jwt.accessExpiresIn'),
    });

    const refreshToken = this.jwtService.sign(
      { ...payload, type: 'refresh' },
      {
        secret: this.config.get('jwt.refreshSecret'),
        expiresIn: this.config.get('jwt.refreshExpiresIn'),
      },
    );

    // Refresh token Redis-এ store (30 days)
    const key = `refresh:${user.id}:${refreshToken}`;
    await this.redis.setex(key, 30 * 24 * 3600, 'valid');

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 min in seconds
    };
  }
}
