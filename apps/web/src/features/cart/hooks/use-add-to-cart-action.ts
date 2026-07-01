import { useCallback, useRef, useState } from 'react';
import { toUserMessage } from '@/shared/api/api-error';
import { useCart } from '@/features/cart/CartContext';
import type { AddCartItemInput } from '@/shared/types/CartTypes';

type AddToCartActionOptions = {
  successMessage?: string;
  errorMessage?: string;
};

type AddToCartActionState = {
  isAdding: boolean;
  error: string | null;
  success: string | null;
  clearFeedback: () => void;
  addToCart: (input: AddCartItemInput) => Promise<boolean>;
};

export function useAddToCartAction(options: AddToCartActionOptions = {}): AddToCartActionState {
  const { addItem } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const addingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const clearFeedback = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  const addToCart = useCallback(
    async (input: AddCartItemInput) => {
      if (addingRef.current) return false;

      try {
        addingRef.current = true;
        setIsAdding(true);
        setError(null);
        setSuccess(null);
        await addItem(input);
        setSuccess(options.successMessage ?? 'Product added to cart');
        return true;
      } catch (caughtError) {
        setError(
          toUserMessage(
            caughtError,
            options.errorMessage ?? 'Unable to add product to cart. Please try again.',
          ),
        );
        return false;
      } finally {
        addingRef.current = false;
        setIsAdding(false);
      }
    },
    [addItem, options.errorMessage, options.successMessage],
  );

  return { isAdding, error, success, clearFeedback, addToCart };
}
