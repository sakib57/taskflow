import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePreferencesDto {
  @ApiPropertyOptional({ description: 'Email notifications enabled' })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Push notifications enabled' })
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Marketing emails enabled' })
  @IsOptional()
  @IsBoolean()
  marketingEmails?: boolean;

  @ApiPropertyOptional({ description: 'UI theme (light/dark)' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  theme?: string;

  @ApiPropertyOptional({ description: 'Language code' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;
}
