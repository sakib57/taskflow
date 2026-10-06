import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './organization.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly repo: Repository<Organization>,
  ) {}

  async create(data: Partial<Organization>): Promise<Organization> {
    const slug = this.generateSlug(data.name!);
    const org = this.repo.create({ ...data, slug });
    return this.repo.save(org);
  }

  async findById(id: string): Promise<Organization | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    return this.repo.findOne({ where: { slug } });
  }

  private generateSlug(name: string): string {
    return (
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') +
      '-' +
      Math.random().toString(36).slice(2, 8)
    );
  }
}
