import type { OrderDetail, OrderSummary } from '~/lib/types/orders';

import { apiGet, apiPost } from '~/lib/api/client';

export type PlaceOrderPayload = {
  items: { productId: string; variantId: string | null; quantity: number }[];
  shippingAddressId: string;
  paymentMethod: string;
  shippingFee?: number;
  discountTotal?: number;
  note?: string;
  promoCode?: string;
};

export async function fetchOrderSummaries(status?: string): Promise<OrderSummary[]> {
  let path = 'orders/';
  if (status && status !== 'all') path += `?status=${encodeURIComponent(status)}`;
  return apiGet<OrderSummary[]>(path);
}

export async function fetchOrderDetail(orderId: string): Promise<OrderDetail> {
  return apiGet<OrderDetail>(`orders/${encodeURIComponent(orderId)}`);
}

export async function placeOrder(payload: PlaceOrderPayload): Promise<OrderDetail> {
  return apiPost<OrderDetail>('orders/', {
    items: payload.items.map((i) => ({
      productId: i.productId,
      variantId: i.variantId,
      quantity: i.quantity,
    })),
    shippingAddressId: payload.shippingAddressId,
    paymentMethod: payload.paymentMethod,
    note: payload.note,
    promoCode: payload.promoCode,
  });
}

export async function cancelOrder(orderId: string, note?: string): Promise<OrderDetail> {
  return apiPost<OrderDetail>(`orders/${encodeURIComponent(orderId)}/cancel`, {
    note,
  });
}
