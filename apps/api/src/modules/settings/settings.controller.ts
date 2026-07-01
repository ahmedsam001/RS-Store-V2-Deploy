import { Body, Controller, Delete, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { SettingKeyParamDto } from './dto/setting-key-param.dto';
import { SettingsQueryDto } from './dto/settings-query.dto';
import { UpsertSettingDto } from './dto/upsert-setting.dto';
import { SettingsService } from './settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.OWNER)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  findAll(@Query() query: SettingsQueryDto) {
    return this.settingsService.findAll(query);
  }

  @Get('definitions')
  findDefinitions() {
    return this.settingsService.findDefinitions();
  }

  @Get(':key')
  findByKey(@Param() params: SettingKeyParamDto) {
    return this.settingsService.findByKey(params.key);
  }

  @Put(':key')
  @Roles(UserRole.OWNER)
  upsert(
    @Param() params: SettingKeyParamDto,
    @Body() dto: UpsertSettingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.settingsService.upsert(params.key, dto, user);
  }

  @Delete(':key')
  @Roles(UserRole.OWNER)
  remove(@Param() params: SettingKeyParamDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.remove(params.key, user);
  }
}
