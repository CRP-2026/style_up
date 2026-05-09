/** Backend uses a synthetic `{productId}-default` variant when none exist — POST /orders must send `null`. */
export function variantIdForOrderApi(productId: string, variantId: string | null | undefined): string | null {
  if (variantId == null || variantId === '') return null;
  if (variantId === `${productId}-default`) return null;
  return variantId;
}
