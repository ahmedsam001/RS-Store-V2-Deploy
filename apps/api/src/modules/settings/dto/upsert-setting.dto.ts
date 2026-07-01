import { SettingScope } from '@prisma/client';
import { Allow, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpsertSettingDto {
  @Allow()
  value?: unknown;

  @IsOptional()
  @IsEnum(SettingScope)
  scope?: SettingScope;

  @IsOptional()
  @IsString()
  description?: string;
}
