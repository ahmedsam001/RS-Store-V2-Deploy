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

export type CartItemType = 'PRODUCT' | 'CUSTOM_ORDER';

export type CartCustomOrder = {
  id: string;
  productUrl: string;
  title: string;
  imageUrl: string | null;
  requestedColor: string | null;
  requestedSize: string | null;
  adminNote: string | null;
};

export type CartItemResponse = {
  id: string;
  type: CartItemType;
  quantity: number;
  product: CartProduct | null;
  variant: CartVariant | null;
  customOrder?: CartCustomOrder | null;
  unitPrice: CartMoney;
  originalUnitPrice: CartMoney | null;
  sale: CartSale | null;
  lineTotal: CartMoney;
};

export type CartResponse = {
  id: string;
  items: CartItemResponse[];
  summary: {
    itemCount: number;
    subtotal: CartMoney;
  };
};
