import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductStatus, ProductVariantStatus } from '@prisma/client';
import { Request, Response } from 'express';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { ShopperContextService } from '../shopper-context/shopper-context.service';
import { ProductPricingService } from '../pricing/product-pricing.service';
import { ShopperContext } from '../shopper-context/shopper-context.types';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { cartItemInclude, mapCart } from './mappers/cart.mapper';
import { CartResponse } from './types/cart-response.types';

type CartOwner = { userId: string } | { guestKey: string };
type PrismaClientLike = PrismaService | Prisma.TransactionClient;

const maxWriteRetries = 2;
const visibleProductWhere = {
  status: ProductStatus.ACTIVE,
  deletedAt: null,
  category: { isActive: true, deletedAt: null },
} satisfies Prisma.ProductWhereInput;

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shopperContextService: ShopperContextService,
    private readonly pricingService: ProductPricingService,
  ) {}

  async findCurrentCart(request: Request, response: Response): Promise<CartResponse> {
    const context = await this.resolveAndMerge(request, response);
    const cart = await this.getOrCreateCart(context, this.prisma);
    const payload = await this.getCartPayload(cart.id, this.prisma);

    return mapCart(payload, this.pricingService);
  }

  async prepareCheckoutCart(request: Request, response: Response): Promise<void> {
    await this.resolveAndMerge(request, response);
  }

  async addItem(request: Request, response: Response, dto: AddCartItemDto): Promise<CartResponse> {
    const context = await this.resolveAndMerge(request, response);
    const payload = await this.runCartWrite(async (tx) => {
      const cart = await this.getOrCreateCart(context, tx);
      await this.assertCartQuantityAvailable(
        tx,
        cart.id,
        dto.productId,
        dto.productVariantId,
        dto.quantity,
      );
      await this.addOrIncrementItem(tx, cart.id, dto);
      return this.getCartPayload(cart.id, tx);
    });

    return mapCart(payload, this.pricingService);
  }

  async updateItem(
    request: Request,
    response: Response,
    itemId: string,
    dto: UpdateCartItemDto,
  ): Promise<CartResponse> {
    const context = await this.resolveAndMerge(request, response);
    const payload = await this.runCartWrite(async (tx) => {
      const cart = await this.getOrCreateCart(context, tx);
      const item = await this.assertCartItem(tx, cart.id, itemId);
      await this.assertCartQuantityAvailable(
        tx,
        cart.id,
        item.productId,
        item.productVariantId ?? undefined,
        dto.quantity,
        item.id,
      );
      await tx.cartItem.update({ where: { id: itemId }, data: { quantity: dto.quantity } });
      return this.getCartPayload(cart.id, tx);
    });

    return mapCart(payload, this.pricingService);
  }

  async removeItem(request: Request, response: Response, itemId: string): Promise<CartResponse> {
    const context = await this.resolveAndMerge(request, response);
    const payload = await this.runCartWrite(async (tx) => {
      const cart = await this.getOrCreateCart(context, tx);
      await this.assertCartItem(tx, cart.id, itemId);
      await tx.cartItem.delete({ where: { id: itemId } });
      return this.getCartPayload(cart.id, tx);
    });

    return mapCart(payload, this.pricingService);
  }

  async clearCart(request: Request, response: Response): Promise<CartResponse> {
    const context = await this.resolveAndMerge(request, response);
    const payload = await this.runCartWrite(async (tx) => {
      const cart = await this.getOrCreateCart(context, tx);
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return this.getCartPayload(cart.id, tx);
    });

    return mapCart(payload, this.pricingService);
  }

  private async resolveAndMerge(request: Request, response: Response): Promise<ShopperContext> {
    const context = await this.shopperContextService.resolve(request, response);

    if (context.userId && context.guestKey) {
      await this.mergeGuestCart(context.userId, context.guestKey);
    }

    return context;
  }

  private async getOrCreateCart(
    context: ShopperContext,
    client: PrismaClientLike,
  ): Promise<{ id: string }> {
    const owner = this.cartOwner(context);
    const existing = await client.cart.findFirst({ where: owner, select: { id: true } });

    if (existing) {
      return existing;
    }

    return client.cart.create({ data: owner, select: { id: true } });
  }

  private cartOwner(context: ShopperContext): CartOwner {
    if (context.userId) {
      return { userId: context.userId };
    }

    if (!context.guestKey) {
      throw new BadRequestException('Guest identity is required');
    }

    return { guestKey: context.guestKey };
  }

  private getCartPayload(cartId: string, client: PrismaClientLike) {
    return client.cart.findUniqueOrThrow({
      where: { id: cartId },
      include: {
        items: {
          where: {
            product: visibleProductWhere,
            productVariantId: { not: null },
            productVariant: {
              isActive: true,
              status: ProductVariantStatus.ACTIVE,
              deletedAt: null,
            },
          },
          include: cartItemInclude,
          orderBy: [{ createdAt: 'asc' }],
        },
      },
    });
  }

  private async addOrIncrementItem(
    client: Prisma.TransactionClient,
    cartId: string,
    dto: AddCartItemDto,
  ): Promise<void> {
    const existing = await client.cartItem.findFirst({
      where: this.cartItemIdentity(cartId, dto.productId, dto.productVariantId),
    });

    if (existing) {
      await client.cartItem.update({
        where: { id: existing.id },
        data: { quantity: Math.min(99, existing.quantity + dto.quantity) },
      });
      return;
    }

    await client.cartItem.create({
      data: {
        cartId,
        productId: dto.productId,
        productVariantId: dto.productVariantId,
        quantity: dto.quantity,
      },
    });
  }

  private async assertCartQuantityAvailable(
    client: PrismaClientLike,
    cartId: string,
    productId: string,
    productVariantId?: string,
    requestedQuantity = 1,
    currentItemId?: string,
  ): Promise<void> {
    const product = await client.product.findFirst({
      where: { id: productId, ...visibleProductWhere },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Product is not available');
    }

    if (!productVariantId) {
      throw new BadRequestException('Please select a product option before adding it to cart');
    }

    const variant = await client.productVariant.findFirst({
      where: {
        id: productVariantId,
        productId,
        isActive: true,
        status: ProductVariantStatus.ACTIVE,
        deletedAt: null,
      },
      select: { id: true, stockQuantity: true, reservedQuantity: true },
    });

    if (!variant) {
      throw new BadRequestException('Product variant is not available');
    }

    const availableStock = Math.max(0, variant.stockQuantity - variant.reservedQuantity);
    const existing = await client.cartItem.findFirst({
      where: {
        cartId,
        productId,
        productVariantId,
        id: currentItemId ? { not: currentItemId } : undefined,
      },
      select: { quantity: true },
    });
    const finalQuantity = requestedQuantity + (existing?.quantity ?? 0);

    if (finalQuantity > availableStock) {
      throw new BadRequestException(`Only ${availableStock} left for this option.`);
    }
  }

  private async assertCartItem(
    client: PrismaClientLike,
    cartId: string,
    itemId: string,
  ): Promise<{ id: string; productId: string; productVariantId: string | null }> {
    const item = await client.cartItem.findFirst({
      where: { id: itemId, cartId },
      select: { id: true, productId: true, productVariantId: true },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    return item;
  }

  private cartItemIdentity(
    cartId: string,
    productId: string,
    productVariantId?: string,
  ): Prisma.CartItemWhereInput {
    return productVariantId
      ? { cartId, productId, productVariantId }
      : { cartId, productId, productVariantId: null };
  }

  private async mergeGuestCart(userId: string, guestKey: string): Promise<void> {
    await this.runCartWrite(async (tx) => {
      const [guestCart, userCart] = await Promise.all([
        tx.cart.findUnique({ where: { guestKey }, include: { items: true } }),
        tx.cart.findUnique({ where: { userId }, select: { id: true } }),
      ]);

      if (!guestCart) {
        return;
      }

      if (!userCart) {
        await tx.cartItem.deleteMany({ where: { cartId: guestCart.id, productVariantId: null } });
        await tx.cart.update({ where: { id: guestCart.id }, data: { userId, guestKey: null } });
        return;
      }

      for (const item of guestCart.items) {
        await this.mergeGuestCartItem(tx, userCart.id, item);
      }

      await tx.cart.delete({ where: { id: guestCart.id } });
    });
  }

  private async mergeGuestCartItem(
    client: Prisma.TransactionClient,
    cartId: string,
    item: { productId: string; productVariantId: string | null; quantity: number },
  ): Promise<void> {
    if (!item.productVariantId) {
      return;
    }

    await this.assertCartQuantityAvailable(
      client,
      cartId,
      item.productId,
      item.productVariantId,
      item.quantity,
    );

    const existing = await client.cartItem.findFirst({
      where: this.cartItemIdentity(cartId, item.productId, item.productVariantId),
    });

    if (existing) {
      await client.cartItem.update({
        where: { id: existing.id },
        data: { quantity: Math.min(99, existing.quantity + item.quantity) },
      });
      return;
    }

    await client.cartItem.create({
      data: {
        cartId,
        productId: item.productId,
        productVariantId: item.productVariantId,
        quantity: item.quantity,
      },
    });
  }

  private async runCartWrite<T>(
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

    throw new BadRequestException('Unable to update cart');
  }

  private isRetryablePrismaError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      ['P2002', 'P2034'].includes(error.code)
    );
  }
}
