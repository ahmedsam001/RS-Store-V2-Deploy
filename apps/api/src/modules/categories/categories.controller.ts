import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { CategoriesService } from './categories.service';
import { CategoriesQueryDto } from './dto/categories-query.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.OWNER)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(@Query() query: CategoriesQueryDto) {
    return this.categoriesService.findAll(query);
  }

  @Get(':id')
  findById(@Param() params: IdParamDto) {
    return this.categoriesService.findById(params.id);
  }

  @Post()
  create(@Body() dto: CreateCategoryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.categoriesService.create(dto, user);
  }

  @Post(':id/subcategories')
  createSubcategory(@Param() params: IdParamDto, @Body() dto: CreateCategoryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.categoriesService.createSubcategory(params.id, dto, user);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() dto: UpdateCategoryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.categoriesService.update(params.id, dto, user);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto, @CurrentUser() user: AuthenticatedUser) {
    return this.categoriesService.remove(params.id, user);
  }
}
