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

  async create(data: Partial<Membership>): Promise<Membership> {
    return this.repo.save(this.repo.create(data));
  }

  async findByUser(userId: string): Promise<Membership[]> {
    return this.repo.find({ where: { userId } });
  }

  async findOne(userId: string, orgId: string): Promise<Membership | null> {
    return this.repo.findOne({ where: { userId, orgId } });
  }
}
