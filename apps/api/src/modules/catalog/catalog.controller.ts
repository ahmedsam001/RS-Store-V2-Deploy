import { Controller, Get, Param, Query } from '@nestjs/common';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { SlugParamDto } from '../../common/dto/slug-param.dto';
import { CatalogService } from './catalog.service';
import { CatalogCategoriesQueryDto } from './dto/catalog-categories-query.dto';
import { CatalogProductsQueryDto } from './dto/catalog-products-query.dto';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('categories')
  @RateLimit({ bucket: 'catalog_categories', limit: 120, windowMs: 60 * 1000 })
  findCategories(@Query() query: CatalogCategoriesQueryDto) {
    return this.catalogService.findCategories(query);
  }

  @Get('categories/:slug')
  findCategoryBySlug(@Param() params: SlugParamDto) {
    return this.catalogService.findCategoryBySlug(params.slug);
  }

  @Get('products')
  @RateLimit({ bucket: 'catalog_search', limit: 120, windowMs: 60 * 1000 })
  findProducts(@Query() query: CatalogProductsQueryDto) {
    return this.catalogService.findProducts(query);
  }

  @Get('products/:slug')
  findProductBySlug(@Param() params: SlugParamDto) {
    return this.catalogService.findProductBySlug(params.slug);
  }

  @Get('subcategories/featured')
  @RateLimit({ bucket: 'catalog_subcategories', limit: 120, windowMs: 60 * 1000 })
  findFeaturedSubCategories() {
    return this.catalogService.findFeaturedSubCategories();
  }
}
