import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Product } from '../types/models';

export interface CartItem {
  product: Product;
  quantity: number;
  variantId: string | null;
  variantSize?: string | null;
  variantColor?: string | null;
}

function linePrice(product: Product): number {
  const p = product.price as number | string;
  if (typeof p === 'number' && Number.isFinite(p)) return p;
  return parseFloat(String(p ?? 0).replace(/[^0-9.-]+/g, '')) || 0;
}

function matchesLine(
  a: { product: Product; variantId: string | null },
  productId: string,
  variantId: string | null
) {
  return a.product.id === productId && (a.variantId ?? null) === (variantId ?? null);
}

type CartState = {
  items: CartItem[];
  addToCart: (
    product: Product,
    quantity?: number,
    variantId?: string | null,
    options?: { size?: string | null; color?: string | null }
  ) => void;
  removeFromCart: (productId: string, variantId: string | null) => void;
  updateQuantity: (productId: string, variantId: string | null, quantity: number) => void;
  clearCart: () => void;
  getCartCount: () => number;
  getCartTotal: () => number;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addToCart: (product, quantity = 1, variantId: string | null = null, options) => {
        const items = get().items.slice();
        const vid = variantId ?? null;
        const idx = items.findIndex((i) => matchesLine(i, product.id, vid));
        if (idx >= 0) {
          items[idx] = { ...items[idx], quantity: items[idx].quantity + quantity };
        } else {
          items.push({
            product,
            quantity,
            variantId: vid,
            variantSize: options?.size ?? null,
            variantColor: options?.color ?? null,
          });
        }
        set({ items });
      },
      removeFromCart: (productId: string, variantId: string | null) => {
        const vid = variantId ?? null;
        set((state) => ({
          items: state.items.filter((i) => !matchesLine(i, productId, vid)),
        }));
      },
      updateQuantity: (productId: string, variantId: string | null, quantity: number) => {
        const vid = variantId ?? null;
        const items = get().items.slice();
        const idx = items.findIndex((i) => matchesLine(i, productId, vid));
        if (idx < 0) return;
        if (quantity <= 0) items.splice(idx, 1);
        else items[idx] = { ...items[idx], quantity };
        set({ items });
      },
      clearCart: () => set({ items: [] }),
      getCartCount: () => get().items.reduce((s, i) => s + i.quantity, 0),
      getCartTotal: () =>
        get().items.reduce((s, i) => s + linePrice(i.product) * i.quantity, 0),
    }),
    {
      name: 'ecc_cart',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ items: state.items }),
      version: 2,
    }
  )
);

export default useCartStore;
