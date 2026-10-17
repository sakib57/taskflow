import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@taskflow/auth-lib';
import { PreferencesService } from './preferences.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@ApiTags('preferences')
@ApiBearerAuth('access-token')
@Controller('preferences')
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user preferences' })
  async getMyPreferences(@CurrentUser('sub') userId: string) {
    return this.preferencesService.getOrCreate(userId);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user preferences' })
  async updateMyPreferences(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.preferencesService.update(userId, dto);
  }
}
