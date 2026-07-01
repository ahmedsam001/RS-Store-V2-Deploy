import { IsString, Matches, MaxLength } from 'class-validator';

export class OrderNumberParamDto {
  @IsString()
  @MaxLength(40)
  @Matches(/^RS-[A-Z0-9-]+$/)
  orderNumber!: string;
}
