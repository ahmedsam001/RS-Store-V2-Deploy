import { IsNumber, Max, Min } from 'class-validator';

export class BulkProductDiscountDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  discount!: number;
}
