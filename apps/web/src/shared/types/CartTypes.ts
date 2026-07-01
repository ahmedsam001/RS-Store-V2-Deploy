export type CartMoney = {
  amount: string;
  currency: string;
};

export type CartImage = {
  id: string;
  url: string;
  altText: string | null;
};

export type CartSale = {
  flashSaleId: string;
  title: string;
  discountPercent: string;
  originalPrice: CartMoney;
  discountAmount: CartMoney;
};

export type CartProduct = {
  id: string;
  slug: string;
  name: string;
  sku: string | null;
  price: CartMoney;
  originalPrice: CartMoney | null;
  sale: CartSale | null;
  primaryImage: CartImage | null;
};

export type CartVariant = {
  id: string;
  name: string;
  sku: string | null;
  price: CartMoney | null;
  originalPrice: CartMoney | null;
  sale: CartSale | null;
};

export type CartItem = {
  id: string;
  quantity: number;
  product: CartProduct;
  variant: CartVariant | null;
  unitPrice: CartMoney;
  originalUnitPrice: CartMoney | null;
  sale: CartSale | null;
  lineTotal: CartMoney;
};

export type Cart = {
  id: string;
  items: CartItem[];
  summary: {
    itemCount: number;
    subtotal: CartMoney;
  };
};

export type AddCartItemInput = {
  productId: string;
  productVariantId: string;
  quantity: number;
};
