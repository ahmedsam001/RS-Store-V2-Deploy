import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { CartService } from '../cart/cart.service';
import { FALLBACK_MAX_IMAGE_BYTES } from '../uploads/uploads.constants';
import { imageFileFilter } from '../uploads/upload-image.filter';
import { UploadedImageFile } from '../uploads/upload-file.type';
import { CheckoutOrderDto } from './dto/checkout-order.dto';
import { OrderNumberParamDto } from './dto/order-number-param.dto';
import { OrdersQueryDto } from './dto/orders-query.dto';
import { ReviewPaymentProofDto } from './dto/review-payment-proof.dto';
import { ReviewFinalPaymentDto, SubmitFinalPaymentDto } from './dto/submit-final-payment.dto';
import { UpdateOrderItemStatusDto } from './dto/update-order-item-status.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly cartService: CartService,
  ) {}

  @Post('checkout-with-deposit-proof')
  @RateLimit({ bucket: 'orders_checkout_with_deposit_proof', limit: 10, windowMs: 60 * 60 * 1000 })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: FALLBACK_MAX_IMAGE_BYTES, files: 1 },
      fileFilter: imageFileFilter,
    }),
  )
  async checkoutWithDepositProof(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CheckoutOrderDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @UploadedFile() file: UploadedImageFile | undefined,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    await this.cartService.prepareCheckoutCart(request, response);
    return this.ordersService.checkoutWithDepositProof(user, dto, file, idempotencyKey);
  }

  @Post('checkout')
  async checkout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CheckoutOrderDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    await this.cartService.prepareCheckoutCart(request, response);
    return this.ordersService.checkout(user, dto, idempotencyKey);
  }

  @Get('my')
  findMyOrders(@CurrentUser() user: AuthenticatedUser, @Query() query: OrdersQueryDto) {
    return this.ordersService.findMyOrders(user, query);
  }

  @Get('my/:id')
  findMyOrderById(@CurrentUser() user: AuthenticatedUser, @Param() params: IdParamDto) {
    return this.ordersService.findMyOrderById(user, params.id);
  }

  @Get('track/:orderNumber')
  trackMyOrder(@CurrentUser() user: AuthenticatedUser, @Param() params: OrderNumberParamDto) {
    return this.ordersService.trackMyOrder(user, params.orderNumber);
  }

  @Post(':id/deposit-proof')
  @RateLimit({ bucket: 'orders_deposit_proof', limit: 10, windowMs: 60 * 60 * 1000 })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: FALLBACK_MAX_IMAGE_BYTES, files: 1 },
      fileFilter: imageFileFilter,
    }),
  )
  uploadDepositProof(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
    @UploadedFile() file: UploadedImageFile | undefined,
  ) {
    return this.ordersService.uploadDepositProof(user, params.id, file);
  }

  @Post(':id/final-payment-proof')
  @RateLimit({ bucket: 'orders_final_payment_proof', limit: 10, windowMs: 60 * 60 * 1000 })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: FALLBACK_MAX_IMAGE_BYTES, files: 1 },
      fileFilter: imageFileFilter,
    }),
  )
  uploadFinalPaymentProof(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
    @UploadedFile() file: UploadedImageFile | undefined,
    @Body() dto: SubmitFinalPaymentDto,
  ) {
    return this.ordersService.uploadFinalPaymentProof(user, params.id, file, dto);
  }

  @Post(':id/final-payment')
  submitFinalPaymentChoice(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
    @Body() dto: SubmitFinalPaymentDto,
  ) {
    return this.ordersService.submitFinalPaymentChoice(user, params.id, dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  findAll(@Query() query: OrdersQueryDto) {
    return this.ordersService.findAll(query);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  findById(@Param() params: IdParamDto) {
    return this.ordersService.findById(params.id);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(params.id, dto, user);
  }

  @Patch('items/:id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  updateItemStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
    @Body() dto: UpdateOrderItemStatusDto,
  ) {
    return this.ordersService.updateItemStatus(params.id, dto, user);
  }

  @Patch(':id/final-payment')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  reviewFinalPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
    @Body() dto: ReviewFinalPaymentDto,
  ) {
    return this.ordersService.reviewFinalPayment(user, params.id, dto);
  }

  @Patch('payment-proofs/:id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  reviewPaymentProof(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
    @Body() dto: ReviewPaymentProofDto,
  ) {
    return this.ordersService.reviewPaymentProof(user, params.id, dto);
  }
}
