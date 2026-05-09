import type { Product } from '../types/models';
import type { ProductVariant } from '../types/products';

export function getDefaultVariant(product: Product): ProductVariant {
  if (product.variants.length > 0) {
    return product.variants[0];
  }

  return {
    id: `default-${product.id}`,
    price: product.price,
    stock: 0,
  };
}

export function getVariantById(product: Product, variantId: string): ProductVariant | undefined {
  return product.variants.find((variant) => variant.id === variantId);
}
