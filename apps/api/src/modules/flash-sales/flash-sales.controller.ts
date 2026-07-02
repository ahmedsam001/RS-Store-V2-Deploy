import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { CreateFlashSaleDto } from './dto/create-flash-sale.dto';
import { FlashSaleProductDto } from './dto/flash-sale-product.dto';
import { FlashSalesQueryDto } from './dto/flash-sales-query.dto';
import { UpdateFlashSaleDto } from './dto/update-flash-sale.dto';
import { FlashSalesService } from './flash-sales.service';

@Controller('flash-sales')
export class FlashSalesController {
  constructor(private readonly flashSalesService: FlashSalesService) {}

  @Get('admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  findAllForAdmin(@Query() query: FlashSalesQueryDto) {
    return this.flashSalesService.findAllForAdmin(query);
  }

  @Get()
  findAll(@Query() query: FlashSalesQueryDto) {
    return this.flashSalesService.findAll(query);
  }

  @Get(':id')
  findById(@Param() params: IdParamDto) {
    return this.flashSalesService.findById(params.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  create(@Body() dto: CreateFlashSaleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.flashSalesService.create(dto, user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  update(
    @Param() params: IdParamDto,
    @Body() dto: UpdateFlashSaleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.flashSalesService.update(params.id, dto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  remove(@Param() params: IdParamDto, @CurrentUser() user: AuthenticatedUser) {
    return this.flashSalesService.remove(params.id, user);
  }

  @Post(':id/products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  addProduct(
    @Param() params: IdParamDto,
    @Body() dto: FlashSaleProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.flashSalesService.addProduct(params.id, dto, user);
  }

  @Delete(':id/products/:productId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  removeProduct(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.flashSalesService.removeProduct(id, productId, user);
  }
}
