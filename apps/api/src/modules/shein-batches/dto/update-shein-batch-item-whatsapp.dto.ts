import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateSheinBatchItemWhatsappDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1200)
  message!: string;
}
