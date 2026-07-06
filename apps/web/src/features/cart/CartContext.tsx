import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { toUserMessage } from '@/shared/api/api-error';
import { useAuth } from '@/features/auth';
import { cartApi } from '@/features/cart/api/cart-api';
import type { AddCartItemInput, Cart } from '@/shared/types/CartTypes';

type CartContextValue = {
  cart: Cart | null;
  itemCount: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addItem: (input: AddCartItemInput) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { status, csrfToken } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stateOptions = useCallback(() => ({ csrfToken }), [csrfToken]);

  const refresh = useCallback(async () => {
    if (status === 'loading') {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setCart(await cartApi.getCart(stateOptions()));
    } catch (caughtError) {
      setError(toUserMessage(caughtError, 'Failed to load cart'));
    } finally {
      setIsLoading(false);
    }
  }, [stateOptions, status]);

  const applyCartMutation = useCallback(async (mutation: () => Promise<Cart>) => {
    try {
      setError(null);
      setCart(await mutation());
    } catch (caughtError) {
      setError(toUserMessage(caughtError, 'Failed to update cart'));
      throw caughtError;
    }
  }, []);

  const addItem = useCallback(
    async (input: AddCartItemInput) => {
      await applyCartMutation(() => cartApi.addItem(input, stateOptions()));
    },
    [applyCartMutation, stateOptions],
  );

  const updateItem = useCallback(
    async (itemId: string, quantity: number) => {
      await applyCartMutation(() => cartApi.updateItem(itemId, quantity, stateOptions()));
    },
    [applyCartMutation, stateOptions],
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      await applyCartMutation(() => cartApi.removeItem(itemId, stateOptions()));
    },
    [applyCartMutation, stateOptions],
  );

  const clearCart = useCallback(async () => {
    await applyCartMutation(() => cartApi.clearCart(stateOptions()));
  }, [applyCartMutation, stateOptions]);

  useEffect(() => {
    if (status === 'loading') {
      return undefined;
    }

    const runRefresh = () => {
      void refresh();
    };

    if ('requestIdleCallback' in window) {
      const idleCallbackId = window.requestIdleCallback(runRefresh);
      return () => window.cancelIdleCallback(idleCallbackId);
    }

    const timeoutId = globalThis.setTimeout(runRefresh, 150);
    return () => globalThis.clearTimeout(timeoutId);
  }, [refresh]);

  const value = useMemo(
    () => ({
      cart,
      itemCount: cart?.summary.itemCount ?? 0,
      isLoading,
      error,
      refresh,
      addItem,
      updateItem,
      removeItem,
      clearCart,
    }),
    [addItem, cart, clearCart, error, isLoading, refresh, removeItem, updateItem],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used inside CartProvider');
  }

  return context;
}
