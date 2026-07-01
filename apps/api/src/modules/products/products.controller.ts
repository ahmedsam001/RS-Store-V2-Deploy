import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole, ProductStatus } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { AddProductImageDto } from './dto/add-product-image.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateProductVariantDto, UpdateProductVariantDto } from './dto/product-variant.dto';
import { ProductsQueryDto } from './dto/products-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { BulkProductDiscountDto } from './dto/bulk-product-discount.dto';
import { ProductsService } from './products.service';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.OWNER)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query() query: ProductsQueryDto) {
    return this.productsService.findAll(query);
  }

  @Patch('bulk/discount')
  applyBulkDiscount(@Body() dto: BulkProductDiscountDto, @CurrentUser() user: AuthenticatedUser) {
    return this.productsService.applyBulkDiscount(dto.discount, user);
  }

  @Get(':id')
  findById(@Param() params: IdParamDto) {
    return this.productsService.findById(params.id);
  }

  @Post()
  create(@Body() dto: CreateProductDto, @CurrentUser() user: AuthenticatedUser) {
    return this.productsService.create(dto, user);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() dto: UpdateProductDto, @CurrentUser() user: AuthenticatedUser) {
    return this.productsService.update(params.id, dto, user);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto, @CurrentUser() user: AuthenticatedUser) {
    return this.productsService.remove(params.id, user);
  }

  @Patch(':id/status')
  changeStatus(
    @Param() params: IdParamDto,
    @Body() dto: { status: ProductStatus },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.changeStatus(params.id, dto.status, user);
  }

  @Post(':id/images')
  addImage(@Param() params: IdParamDto, @Body() dto: AddProductImageDto, @CurrentUser() user: AuthenticatedUser) {
    return this.productsService.addImage(params.id, dto, user);
  }

  @Patch(':id/images/:imageId/primary')
  setPrimaryImage(@Param('id') id: string, @Param('imageId') imageId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.productsService.setPrimaryImage(id, imageId, user);
  }

  @Delete('images/:id')
  removeImage(@Param() params: IdParamDto, @CurrentUser() user: AuthenticatedUser) {
    return this.productsService.removeImage(params.id, user);
  }

  @Post(':id/variants')
  addVariant(@Param() params: IdParamDto, @Body() dto: CreateProductVariantDto, @CurrentUser() user: AuthenticatedUser) {
    return this.productsService.addVariant(params.id, dto, user);
  }

  @Patch(':id/variants/:variantId')
  updateVariant(@Param('id') id: string, @Param('variantId') variantId: string, @Body() dto: UpdateProductVariantDto, @CurrentUser() user: AuthenticatedUser) {
    return this.productsService.updateVariant(id, variantId, dto, user);
  }

  @Delete(':id/variants/:variantId')
  removeVariant(@Param('id') id: string, @Param('variantId') variantId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.productsService.removeVariant(id, variantId, user);
  }
}
