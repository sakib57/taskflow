import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email: email.toLowerCase() } });
  }

  async create(data: {
    email: string;
    passwordHash: string;
    name: string;
    emailVerified?: boolean;
    avatarUrl?: string;
  }): Promise<User> {
    const user = this.repo.create({
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      name: data.name,
      emailVerified: data.emailVerified ?? false,
      avatarUrl: data.avatarUrl,
    });
    return this.repo.save(user);
  }
}
