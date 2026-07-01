import { IsString, Matches, MaxLength } from 'class-validator';

export class SettingKeyParamDto {
  @IsString()
  @MaxLength(120)
  @Matches(/^[a-zA-Z0-9_.:-]+$/)
  key!: string;
}
