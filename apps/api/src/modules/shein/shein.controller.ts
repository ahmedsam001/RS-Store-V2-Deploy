import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ProductStatus, UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { ApproveSheinImportDto } from './dto/approve-shein-import.dto';
import { CreateSheinImportDto } from './dto/create-shein-import.dto';
import { ReviewSheinImportDto } from './dto/review-shein-import.dto';
import { SheinImportsQueryDto } from './dto/shein-imports-query.dto';
import { UpdateSheinImportDto } from './dto/update-shein-import.dto';
import { UpdateSheinMarketplaceSettingsDto } from './dto/update-shein-marketplace-settings.dto';
import { SheinService } from './shein.service';

@Controller('shein')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.OWNER)
export class SheinController {
  constructor(private readonly sheinService: SheinService) {}

  @Get('marketplace-settings')
  getMarketplaceSettings() {
    return this.sheinService.getMarketplaceSettings();
  }

  @Patch('marketplace-settings')
  updateMarketplaceSettings(
    @Body() dto: UpdateSheinMarketplaceSettingsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sheinService.updateMarketplaceSettings(dto, user);
  }

  @Post('imports/assist')
  startV1AssistedImport(@Body() dto: CreateSheinImportDto, @CurrentUser() user: AuthenticatedUser) {
    return this.sheinService.startV1AssistedImport(dto, user);
  }

  @Get('imports/assist/:jobId')
  findV1AssistedImport(@Param('jobId') jobId: string) {
    return this.sheinService.findV1AssistedImport(jobId);
  }

  @Post('imports/assist/:jobId/continue')
  continueV1AssistedImport(@Param('jobId') jobId: string) {
    return this.sheinService.continueV1AssistedImport(jobId);
  }

  @Post('imports')
  create(@Body() dto: CreateSheinImportDto, @CurrentUser() user: AuthenticatedUser) {
    return this.sheinService.create(dto, user);
  }

  @Get('imports')
  findAll(@Query() query: SheinImportsQueryDto) {
    return this.sheinService.findAll(query);
  }

  @Get('imports/:id')
  findById(@Param() params: IdParamDto) {
    return this.sheinService.findById(params.id);
  }

  @Patch('imports/:id')
  update(
    @Param() params: IdParamDto,
    @Body() dto: UpdateSheinImportDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sheinService.update(params.id, dto, user);
  }

  @Post('imports/:id/review')
  markReviewing(
    @Param() params: IdParamDto,
    @Body() dto: ReviewSheinImportDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sheinService.markReviewing(params.id, dto, user);
  }

  @Post('imports/:id/approve')
  approve(
    @Param() params: IdParamDto,
    @Body() dto: ApproveSheinImportDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sheinService.approve(params.id, dto, user);
  }

  @Post('imports/:id/create-product')
  createProduct(
    @Param() params: IdParamDto,
    @Body() dto: ApproveSheinImportDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sheinService.createProduct(params.id, dto, user);
  }

  @Post('imports/:id/publish')
  publish(
    @Param() params: IdParamDto,
    @Body() dto: ApproveSheinImportDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sheinService.createProduct(
      params.id,
      { ...dto, publishStatus: ProductStatus.ACTIVE },
      user,
    );
  }

  @Post('imports/:id/retry')
  retry(@Param() params: IdParamDto, @CurrentUser() user: AuthenticatedUser) {
    return this.sheinService.retry(params.id, user);
  }
}
