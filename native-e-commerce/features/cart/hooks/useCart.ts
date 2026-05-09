import { useCartStore } from '~/lib/store/cartStore';

import type { Product } from '~/lib/types/models';
import { useCallback } from 'react';

export function useCart() {
  const items = useCartStore((s) => s.items);
  const addToCart = useCartStore((s) => s.addToCart);
  const removeFromCart = useCartStore((s) => s.removeFromCart);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);
  const getCartCount = useCartStore((s) => s.getCartCount);
  const getCartTotal = useCartStore((s) => s.getCartTotal);

  const add = useCallback(
    (
      product: Product,
      qty = 1,
      variantId: string | null = null,
      options?: { size?: string | null; color?: string | null }
    ) => addToCart(product, qty, variantId, options),
    [addToCart]
  );

  return {
    items,
    addToCart: add,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartCount,
    getCartTotal,
  };
}

export default useCart;
