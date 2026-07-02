import { Body, Controller, Delete, Get, Param, Patch, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartService } from './cart.service';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  findCurrentCart(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return this.cartService.findCurrentCart(request, response);
  }

  @Post('items')
  addItem(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() dto: AddCartItemDto,
  ) {
    return this.cartService.addItem(request, response, dto);
  }

  @Patch('items/:id')
  updateItem(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param() params: IdParamDto,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(request, response, params.id, dto);
  }

  @Delete('items/:id')
  removeItem(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param() params: IdParamDto,
  ) {
    return this.cartService.removeItem(request, response, params.id);
  }

  @Delete()
  clearCart(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return this.cartService.clearCart(request, response);
  }
}
