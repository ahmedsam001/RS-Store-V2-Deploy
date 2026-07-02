import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { FALLBACK_MAX_IMAGE_BYTES } from '../uploads/uploads.constants';
import { imageFileFilter } from '../uploads/upload-image.filter';
import { UploadedImageFile } from '../uploads/upload-file.type';
import { CustomOrdersService } from './custom-orders.service';
import { CreateCustomOrderDto } from './dto/create-custom-order.dto';
import { CustomOrdersQueryDto } from './dto/custom-orders-query.dto';
import { ReviewCustomOrderDto } from './dto/review-custom-order.dto';

@Controller('custom-orders')
@UseGuards(JwtAuthGuard)
export class CustomOrdersController {
  constructor(private readonly customOrdersService: CustomOrdersService) {}

  @Post()
  @RateLimit({ bucket: 'custom_orders_create', limit: 12, windowMs: 60 * 60 * 1000 })
  @UseInterceptors(
    FileInterceptor('customerImage', {
      limits: { fileSize: FALLBACK_MAX_IMAGE_BYTES, files: 1 },
      fileFilter: imageFileFilter,
    }),
  )
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCustomOrderDto,
    @UploadedFile() file?: UploadedImageFile,
  ) {
    return this.customOrdersService.create(user, dto, file);
  }

  @Get('my')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.customOrdersService.findMine(user);
  }

  @Post(':id/create-order')
  createOrder(@CurrentUser() user: AuthenticatedUser, @Param() params: IdParamDto) {
    return this.customOrdersService.createOrderFromAccepted(user, params.id);
  }

  @Get('admin/list')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  findAdmin(@Query() query: CustomOrdersQueryDto) {
    return this.customOrdersService.findAdmin(query);
  }

  @Patch(':id/review')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @UseInterceptors(
    FileInterceptor('adminImage', {
      limits: { fileSize: FALLBACK_MAX_IMAGE_BYTES, files: 1 },
      fileFilter: imageFileFilter,
    }),
  )
  review(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
    @Body() dto: ReviewCustomOrderDto,
    @UploadedFile() file?: UploadedImageFile,
  ) {
    return this.customOrdersService.review(user, params.id, dto, file);
  }
}
