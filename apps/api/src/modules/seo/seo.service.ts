import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProductStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class SeoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async sitemapXml(): Promise<string> {
    const siteUrl = this.siteUrl();
    const [products, categories] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where: { status: ProductStatus.ACTIVE, deletedAt: null },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 5000,
      }),
      this.prisma.category.findMany({
        where: { isActive: true, deletedAt: null },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 1000,
      }),
    ]);
    const urls = [
      this.urlEntry(siteUrl, '/', new Date()),
      ...categories.map((category) =>
        this.urlEntry(siteUrl, `/categories/${category.slug}`, category.updatedAt),
      ),
      ...products.map((product) =>
        this.urlEntry(siteUrl, `/products/${product.slug}`, product.updatedAt),
      ),
    ];
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;
  }

  robotsTxt(): string {
    const apiPrefix = this.configService.get<string>('API_PREFIX') ?? 'api/v1';
    return [
      'User-agent: *',
      'Allow: /',
      'Disallow: /admin',
      'Disallow: /checkout',
      `Sitemap: ${this.siteUrl()}/${apiPrefix}/seo/sitemap.xml`,
    ].join('\n');
  }

  private siteUrl(): string {
    return (this.configService.get<string>('FRONTEND_ORIGIN') ?? 'http://localhost:5173').replace(
      /\/+$/,
      '',
    );
  }

  private urlEntry(siteUrl: string, path: string, updatedAt: Date): string {
    return `  <url><loc>${escapeXml(`${siteUrl}${path}`)}</loc><lastmod>${updatedAt.toISOString()}</lastmod></url>`;
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
