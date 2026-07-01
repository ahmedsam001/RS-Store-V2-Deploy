import { apiRequest } from '@/shared/api/http-client';
import type { AddCartItemInput, Cart } from '@/shared/types/CartTypes';

type StateRequestOptions = {
  csrfToken?: string | null;
  signal?: AbortSignal;
};

export const cartApi = {
  getCart(options: StateRequestOptions = {}) {
    return apiRequest<Cart>('/cart', { signal: options.signal });
  },

  addItem(input: AddCartItemInput, options: StateRequestOptions = {}) {
    return apiRequest<Cart>('/cart/items', {
      method: 'POST',
      body: input,
      csrfToken: options.csrfToken,
    });
  },

  updateItem(itemId: string, quantity: number, options: StateRequestOptions = {}) {
    return apiRequest<Cart>(`/cart/items/${itemId}`, {
      method: 'PATCH',
      body: { quantity },
      csrfToken: options.csrfToken,
    });
  },

  removeItem(itemId: string, options: StateRequestOptions = {}) {
    return apiRequest<Cart>(`/cart/items/${itemId}`, {
      method: 'DELETE',
      csrfToken: options.csrfToken,
    });
  },

  clearCart(options: StateRequestOptions = {}) {
    return apiRequest<Cart>('/cart', { method: 'DELETE', csrfToken: options.csrfToken });
  },
};
