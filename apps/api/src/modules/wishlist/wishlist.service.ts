import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { Request, Response } from 'express';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { ShopperContextService } from '../shopper-context/shopper-context.service';
import { ProductPricingService } from '../pricing/product-pricing.service';
import { ShopperContext } from '../shopper-context/shopper-context.types';
import { AddWishlistItemDto } from './dto/add-wishlist-item.dto';
import { mapWishlist, wishlistItemInclude } from './mappers/wishlist.mapper';
import { WishlistResponse } from './types/wishlist-response.types';

type PrismaClientLike = PrismaService | Prisma.TransactionClient;
type WishlistOwner = { userId: string } | { guestKey: string };

const maxWriteRetries = 2;
const visibleProductWhere = {
  status: ProductStatus.ACTIVE,
  deletedAt: null,
  category: { isActive: true, deletedAt: null },
} satisfies Prisma.ProductWhereInput;

@Injectable()
export class WishlistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shopperContextService: ShopperContextService,
    private readonly pricingService: ProductPricingService,
  ) {}

  async findCurrentWishlist(request: Request, response: Response): Promise<WishlistResponse> {
    const context = await this.resolveAndMerge(request, response);
    const payload = await this.runWishlistWrite(async (tx) => {
      const wishlist = await this.getOrCreateWishlist(context, tx);
      return this.getWishlistPayload(wishlist.id, tx);
    });

    return mapWishlist(payload, this.pricingService);
  }

  async addItem(
    request: Request,
    response: Response,
    dto: AddWishlistItemDto,
  ): Promise<WishlistResponse> {
    const context = await this.resolveAndMerge(request, response);
    const payload = await this.runWishlistWrite(async (tx) => {
      const wishlist = await this.getOrCreateWishlist(context, tx);
      await this.assertCatalogProduct(tx, dto.productId);
      await this.addWishlistItem(tx, wishlist.id, dto.productId);
      return this.getWishlistPayload(wishlist.id, tx);
    });

    return mapWishlist(payload, this.pricingService);
  }

  async removeItem(
    request: Request,
    response: Response,
    params: IdParamDto,
  ): Promise<WishlistResponse> {
    const context = await this.resolveAndMerge(request, response);
    const payload = await this.runWishlistWrite(async (tx) => {
      const wishlist = await this.getOrCreateWishlist(context, tx);
      await this.assertWishlistItem(tx, wishlist.id, params.id);
      await tx.wishlistItem.delete({ where: { id: params.id } });
      return this.getWishlistPayload(wishlist.id, tx);
    });

    return mapWishlist(payload, this.pricingService);
  }

  async removeProduct(
    request: Request,
    response: Response,
    params: IdParamDto,
  ): Promise<WishlistResponse> {
    const context = await this.resolveAndMerge(request, response);
    const payload = await this.runWishlistWrite(async (tx) => {
      const wishlist = await this.getOrCreateWishlist(context, tx);
      await tx.wishlistItem.deleteMany({
        where: { wishlistId: wishlist.id, productId: params.id },
      });
      return this.getWishlistPayload(wishlist.id, tx);
    });

    return mapWishlist(payload, this.pricingService);
  }

  private async resolveAndMerge(request: Request, response: Response): Promise<ShopperContext> {
    const context = await this.shopperContextService.resolve(request, response);

    if (context.userId && context.guestKey) {
      await this.mergeGuestWishlist(context.userId, context.guestKey);
    }

    return context;
  }

  private async getOrCreateWishlist(
    context: ShopperContext,
    client: PrismaClientLike,
  ): Promise<{ id: string }> {
    const owner = this.wishlistOwner(context);
    const existing = await client.wishlist.findFirst({ where: owner, select: { id: true } });

    if (existing) {
      return existing;
    }

    return client.wishlist.create({ data: owner, select: { id: true } });
  }

  private wishlistOwner(context: ShopperContext): WishlistOwner {
    if (context.userId) {
      return { userId: context.userId };
    }

    if (!context.guestKey) {
      throw new BadRequestException('Guest identity is required');
    }

    return { guestKey: context.guestKey };
  }

  private getWishlistPayload(wishlistId: string, client: PrismaClientLike) {
    return client.wishlist.findUniqueOrThrow({
      where: { id: wishlistId },
      include: {
        items: {
          where: { product: visibleProductWhere },
          include: wishlistItemInclude,
          orderBy: [{ createdAt: 'desc' }],
        },
      },
    });
  }

  private async addWishlistItem(
    client: Prisma.TransactionClient,
    wishlistId: string,
    productId: string,
  ): Promise<void> {
    const existing = await client.wishlistItem.findUnique({
      where: { wishlistId_productId: { wishlistId, productId } },
      select: { id: true },
    });

    if (!existing) {
      await client.wishlistItem.create({ data: { wishlistId, productId } });
    }
  }

  private async assertCatalogProduct(client: PrismaClientLike, productId: string): Promise<void> {
    const product = await client.product.findFirst({
      where: { id: productId, ...visibleProductWhere },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Product is not available');
    }
  }

  private async assertWishlistItem(
    client: PrismaClientLike,
    wishlistId: string,
    itemId: string,
  ): Promise<void> {
    const item = await client.wishlistItem.findFirst({
      where: { id: itemId, wishlistId },
      select: { id: true },
    });

    if (!item) {
      throw new NotFoundException('Wishlist item not found');
    }
  }

  private async mergeGuestWishlist(userId: string, guestKey: string): Promise<void> {
    await this.runWishlistWrite(async (tx) => {
      const [guestWishlist, userWishlist] = await Promise.all([
        tx.wishlist.findUnique({ where: { guestKey }, include: { items: true } }),
        tx.wishlist.findUnique({ where: { userId }, select: { id: true } }),
      ]);

      if (!guestWishlist) {
        return;
      }

      if (!userWishlist) {
        await tx.wishlist.update({
          where: { id: guestWishlist.id },
          data: { userId, guestKey: null },
        });
        return;
      }

      for (const item of guestWishlist.items) {
        await this.addWishlistItem(tx, userWishlist.id, item.productId);
      }

      await tx.wishlist.delete({ where: { id: guestWishlist.id } });
    });
  }

  private async runWishlistWrite<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 0; attempt <= maxWriteRetries; attempt += 1) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (attempt === maxWriteRetries || !this.isRetryablePrismaError(error)) {
          throw error;
        }
      }
    }

    throw new BadRequestException('Unable to update wishlist');
  }

  private isRetryablePrismaError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      ['P2002', 'P2034'].includes(error.code)
    );
  }
}
