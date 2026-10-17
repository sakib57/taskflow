import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './profile.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Profile)
    private readonly repo: Repository<Profile>,
  ) {}

  async findByUserId(userId: string): Promise<Profile | null> {
    return this.repo.findOne({ where: { userId } });
  }

  async getOrCreate(userId: string): Promise<Profile> {
    let profile = await this.findByUserId(userId);
    if (!profile) {
      profile = this.repo.create({
        userId,
        timezone: 'UTC',
        language: 'en',
      });
      profile = await this.repo.save(profile);
    }
    return profile;
  }

  async update(userId: string, dto: UpdateProfileDto): Promise<Profile> {
    const profile = await this.getOrCreate(userId);

    if (dto.bio !== undefined) profile.bio = dto.bio;
    if (dto.avatarUrl !== undefined) profile.avatarUrl = dto.avatarUrl;
    if (dto.timezone !== undefined) profile.timezone = dto.timezone;
    if (dto.language !== undefined) profile.language = dto.language;
    if (dto.phoneNumber !== undefined) profile.phoneNumber = dto.phoneNumber;
    if (dto.dateOfBirth !== undefined) profile.dateOfBirth = new Date(dto.dateOfBirth);
    if (dto.location !== undefined) profile.location = dto.location;
    if (dto.website !== undefined) profile.website = dto.website;

    return this.repo.save(profile);
  }
}
