import { IsInt, IsUUID, Max, Min } from 'class-validator';

export class AddCartItemDto {
  @IsUUID()
  productId!: string;

  @IsUUID()
  productVariantId!: string;

  @IsInt()
  @Min(1)
  @Max(99)
  quantity: number = 1;
}
