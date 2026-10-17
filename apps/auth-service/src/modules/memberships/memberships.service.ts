import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Membership } from './membership.entity';

@Injectable()
export class MembershipsService {
  constructor(
    @InjectRepository(Membership)
    private readonly repo: Repository<Membership>,
  ) {}

  async create(data: {
    userId: string;
    orgId: string;
    role: string;
  }): Promise<Membership> {
    const membership = this.repo.create({
      userId: data.userId,
      orgId: data.orgId,
      role: data.role,
    });
    return this.repo.save(membership);
  }

  async findByUser(userId: string): Promise<Membership[]> {
    return this.repo.find({ where: { userId } });
  }

  async findOne(userId: string, orgId: string): Promise<Membership | null> {
    return this.repo.findOne({ where: { userId, orgId } });
  }
}
