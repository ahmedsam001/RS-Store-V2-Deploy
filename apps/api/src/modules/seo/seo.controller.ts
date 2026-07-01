import { Controller, Get, Header } from '@nestjs/common';
import { SeoService } from './seo.service';

@Controller('seo')
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  sitemapXml() {
    return this.seoService.sitemapXml();
  }

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  robotsTxt() {
    return this.seoService.robotsTxt();
  }
}
