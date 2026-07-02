import { Body, Controller, Delete, Get, Param, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { AddWishlistItemDto } from './dto/add-wishlist-item.dto';
import { WishlistService } from './wishlist.service';

@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  findCurrentWishlist(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return this.wishlistService.findCurrentWishlist(request, response);
  }

  @Post('items')
  addItem(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() dto: AddWishlistItemDto,
  ) {
    return this.wishlistService.addItem(request, response, dto);
  }

  @Delete('items/:id')
  removeItem(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param() params: IdParamDto,
  ) {
    return this.wishlistService.removeItem(request, response, params);
  }

  @Delete('products/:id')
  removeProduct(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param() params: IdParamDto,
  ) {
    return this.wishlistService.removeProduct(request, response, params);
  }
}
