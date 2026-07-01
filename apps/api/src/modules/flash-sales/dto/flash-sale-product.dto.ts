import { IsUUID } from 'class-validator';

export class FlashSaleProductDto {
  @IsUUID()
  productId!: string;
}
