import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { AddSheinBatchItemDto } from './dto/add-shein-batch-item.dto';
import { AvailableOrderItemsQueryDto } from './dto/available-order-items-query.dto';
import { BulkAddSheinBatchItemsDto } from './dto/bulk-add-shein-batch-items.dto';
import { CreateSheinBatchDto } from './dto/create-shein-batch.dto';
import { SheinBatchesQueryDto } from './dto/shein-batches-query.dto';
import { UpdateSheinBatchStatusDto } from './dto/update-shein-batch-status.dto';
import { UpdateSheinBatchDto } from './dto/update-shein-batch.dto';
import { UpdateSheinBatchItemWhatsappDto } from './dto/update-shein-batch-item-whatsapp.dto';
import { UpdateSheinBatchItemStatusDto } from './dto/update-shein-batch-item-status.dto';
import { SheinBatchesService } from './shein-batches.service';

@Controller('shein-batches')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.OWNER)
export class SheinBatchesController {
  constructor(private readonly sheinBatchesService: SheinBatchesService) {}

  @Get('available-order-items')
  findAvailableOrderItems(@Query() query: AvailableOrderItemsQueryDto) {
    return this.sheinBatchesService.findAvailableOrderItems(query);
  }

  @Get()
  findAll(@Query() query: SheinBatchesQueryDto) {
    return this.sheinBatchesService.findAll(query);
  }

  @Get(':id')
  findById(@Param() params: IdParamDto) {
    return this.sheinBatchesService.findById(params.id);
  }

  @Post()
  create(@Body() dto: CreateSheinBatchDto, @CurrentUser() user: AuthenticatedUser) {
    return this.sheinBatchesService.create(dto, user);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() dto: UpdateSheinBatchDto, @CurrentUser() user: AuthenticatedUser) {
    return this.sheinBatchesService.update(params.id, dto, user);
  }

  @Get(':id/notifications/whatsapp')
  whatsappNotifications(@Param() params: IdParamDto) {
    return this.sheinBatchesService.whatsappNotifications(params.id);
  }

  @Post(':id/notifications/whatsapp/regenerate')
  regenerateWhatsappNotifications(@Param() params: IdParamDto, @CurrentUser() user: AuthenticatedUser) {
    return this.sheinBatchesService.regenerateWhatsappMessages(params.id, user);
  }

  @Patch(':id/status')
  updateStatus(@Param() params: IdParamDto, @Body() dto: UpdateSheinBatchStatusDto, @CurrentUser() user: AuthenticatedUser) {
    return this.sheinBatchesService.updateStatus(params.id, dto, user);
  }

  @Post(':id/items')
  addItem(@Param() params: IdParamDto, @Body() dto: AddSheinBatchItemDto, @CurrentUser() user: AuthenticatedUser) {
    return this.sheinBatchesService.addItem(params.id, dto, user);
  }

  @Post(':id/items/bulk')
  addItems(@Param() params: IdParamDto, @Body() dto: BulkAddSheinBatchItemsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.sheinBatchesService.addItems(params.id, dto, user);
  }


  @Patch(':id/items/:itemId/status')
  updateItemStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Body() dto: UpdateSheinBatchItemStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sheinBatchesService.updateItemStatus(id, itemId, dto, user);
  }

  @Patch(':id/items/:itemId/whatsapp-message')
  updateItemWhatsappMessage(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Body() dto: UpdateSheinBatchItemWhatsappDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sheinBatchesService.updateItemWhatsappMessage(id, itemId, dto.message, user);
  }

  @Delete(':id/items/:itemId')
  removeItem(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sheinBatchesService.removeItem(id, itemId, user);
  }

  @Post(':id/recalculate')
  recalculate(@Param() params: IdParamDto, @CurrentUser() user: AuthenticatedUser) {
    return this.sheinBatchesService.recalculate(params.id, user);
  }
}
