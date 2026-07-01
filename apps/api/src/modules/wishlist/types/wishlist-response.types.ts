export type WishlistMoney = {
  amount: string;
  currency: string;
};

export type WishlistImage = {
  id: string;
  url: string;
  altText: string | null;
};

export type WishlistSale = {
  flashSaleId: string;
  title: string;
  discountPercent: string;
  originalPrice: WishlistMoney;
  discountAmount: WishlistMoney;
};

export type WishlistProduct = {
  id: string;
  slug: string;
  name: string;
  sku: string | null;
  price: WishlistMoney;
  originalPrice: WishlistMoney | null;
  sale: WishlistSale | null;
  primaryImage: WishlistImage | null;
};

export type WishlistItemResponse = {
  id: string;
  product: WishlistProduct;
  createdAt: string;
};

export type WishlistResponse = {
  id: string;
  items: WishlistItemResponse[];
  summary: {
    itemCount: number;
  };
};
