import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Preference } from './preference.entity';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Injectable()
export class PreferencesService {
  constructor(
    @InjectRepository(Preference)
    private readonly repo: Repository<Preference>,
  ) {}

  async findByUserId(userId: string): Promise<Preference | null> {
    return this.repo.findOne({ where: { userId } });
  }

  async getOrCreate(userId: string): Promise<Preference> {
    let prefs = await this.findByUserId(userId);
    if (!prefs) {
      prefs = this.repo.create({ userId });
      prefs = await this.repo.save(prefs);
    }
    return prefs;
  }

  async update(userId: string, dto: UpdatePreferencesDto): Promise<Preference> {
    const prefs = await this.getOrCreate(userId);

    if (dto.emailNotifications !== undefined) prefs.emailNotifications = dto.emailNotifications;
    if (dto.pushNotifications !== undefined) prefs.pushNotifications = dto.pushNotifications;
    if (dto.marketingEmails !== undefined) prefs.marketingEmails = dto.marketingEmails;
    if (dto.theme !== undefined) prefs.theme = dto.theme;
    if (dto.language !== undefined) prefs.language = dto.language;

    return this.repo.save(prefs);
  }
}
