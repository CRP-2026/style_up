import type { OrderDetail, OrderStatus } from '~/lib/types/orders';

import { apiDelete, apiFetch, apiGet, apiPatch, apiPost } from '~/lib/api/client';
import { Platform } from 'react-native';

export type AdminOrderSummary = {
  id: string;
  code: string;
  userId: string;
  shipName: string;
  date: string;
  status: OrderStatus;
  paymentStatus: string;
  total: number;
  itemCount: number;
};

export type AdminVariantStock = {
  id: string;
  productId: string;
  size: string | null;
  color: string | null;
  stock: number;
};

export async function adminListOrders(status?: string): Promise<AdminOrderSummary[]> {
  let path = 'admin/orders';
  if (status && status !== 'all') path += `?status=${encodeURIComponent(status)}`;
  return apiGet<AdminOrderSummary[]>(path);
}

export async function adminListOrdersAdvanced(query: {
  status?: string;
  paymentStatus?: string;
  code?: string;
  receiver?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}): Promise<AdminOrderSummary[]> {
  const q = new URLSearchParams();
  if (query.status) q.set('status', query.status);
  if (query.paymentStatus) q.set('payment_status', query.paymentStatus);
  if (query.code) q.set('code', query.code);
  if (query.receiver) q.set('receiver', query.receiver);
  if (query.fromDate) q.set('from_date', query.fromDate);
  if (query.toDate) q.set('to_date', query.toDate);
  if (query.limit != null) q.set('limit', String(query.limit));
  if (query.offset != null) q.set('offset', String(query.offset));
  const suffix = q.toString();
  return apiGet<AdminOrderSummary[]>(`admin/orders${suffix ? `?${suffix}` : ''}`);
}

export async function adminGetOrder(orderId: string): Promise<OrderDetail> {
  return apiGet<OrderDetail>(`admin/orders/${encodeURIComponent(orderId)}`);
}

export async function adminUpdateOrderStatus(
  orderId: string,
  payload: { status: OrderStatus; note?: string; trackingNumber?: string }
): Promise<OrderDetail> {
  return apiPatch<OrderDetail>(`admin/orders/${encodeURIComponent(orderId)}/status`, payload);
}

export async function adminSetVariantStock(
  variantId: string,
  stock: number,
  reason?: string
): Promise<AdminVariantStock> {
  return apiPatch<AdminVariantStock>(`admin/variants/${encodeURIComponent(variantId)}/stock`, {
    stock,
    reason,
  });
}

export async function adminBulkSetVariantStock(
  items: { variantId: string; stock: number; reason?: string }[]
) {
  return apiPost<{ updatedCount: number }>('admin/variants/bulk-stock', { items });
}

export async function adminToggleProductActive(
  productId: string,
  isActive: boolean
): Promise<{ id: string; isActive: boolean }> {
  return apiPatch<{ id: string; isActive: boolean }>(
    `admin/products/${encodeURIComponent(productId)}/active`,
    { isActive }
  );
}

export type AdminProductRow = {
  id: string;
  name: string;
  slug: string;
  categoryId?: string | null;
  basePrice: number;
  totalStock: number;
  isActive: boolean;
  defaultImage: string;
  brand?: string | null;
  updatedAt: string;
};

export type AdminProductVariant = {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  price: number | null;
  stock: number;
  image: string | null;
};

export type AdminProductDetail = {
  id: string;
  name: string;
  slug: string;
  description: string;
  defaultImage: string;
  basePrice: number;
  categoryId?: string | null;
  brand?: string | null;
  isActive: boolean;
  totalStock: number;
  variants: AdminProductVariant[];
};

export async function adminListProducts(params?: {
  q?: string;
  categoryId?: string;
  isActive?: boolean;
  lowStock?: boolean;
  limit?: number;
  offset?: number;
}): Promise<AdminProductRow[]> {
  const q = new URLSearchParams();
  if (params?.q) q.set('q', params.q);
  if (params?.categoryId) q.set('category_id', params.categoryId);
  if (params?.isActive != null) q.set('is_active', String(params.isActive));
  if (params?.lowStock != null) q.set('low_stock', String(params.lowStock));
  if (params?.limit != null) q.set('limit', String(params.limit));
  if (params?.offset != null) q.set('offset', String(params.offset));
  const suffix = q.toString();
  return apiGet<AdminProductRow[]>(`admin/products${suffix ? `?${suffix}` : ''}`);
}

export async function adminGetProduct(productId: string): Promise<AdminProductDetail> {
  return apiGet<AdminProductDetail>(`admin/products/${encodeURIComponent(productId)}`);
}

export async function adminCreateProduct(payload: {
  id: string;
  name: string;
  slug: string;
  description: string;
  defaultImage: string;
  basePrice: number;
  categoryId?: string | null;
  shortDescription?: string | null;
  brand?: string | null;
  isActive?: boolean;
}): Promise<{ id: string }> {
  return apiPost<{ id: string }>('admin/products', payload);
}

export async function adminUpdateProduct(
  productId: string,
  payload: Partial<{
    name: string;
    slug: string;
    description: string;
    defaultImage: string;
    basePrice: number;
    categoryId: string | null;
    shortDescription: string | null;
    brand: string | null;
    isActive: boolean;
  }>
): Promise<{ id: string }> {
  return apiPatch<{ id: string }>(`admin/products/${encodeURIComponent(productId)}`, payload);
}

export async function adminDeleteProduct(
  productId: string
): Promise<{ id: string; deleted: boolean }> {
  return apiDelete<{ id: string; deleted: boolean }>(
    `admin/products/${encodeURIComponent(productId)}`
  );
}

export async function adminCreateVariant(
  productId: string,
  payload: {
    id: string;
    sku: string;
    size?: string | null;
    color?: string | null;
    price?: number | null;
    stock: number;
    image?: string | null;
  }
): Promise<{ id: string }> {
  return apiPost<{ id: string }>(
    `admin/products/${encodeURIComponent(productId)}/variants`,
    payload
  );
}

export async function adminUpdateVariant(
  variantId: string,
  payload: Partial<{
    sku: string;
    size: string | null;
    color: string | null;
    price: number | null;
    stock: number;
    image: string | null;
  }>
): Promise<{ id: string }> {
  return apiPatch<{ id: string }>(`admin/variants/${encodeURIComponent(variantId)}`, payload);
}

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  bio?: string | null;
  is_active: boolean;
  role: 'user' | 'staff' | 'admin';
};

export async function adminListUsers(params?: {
  role?: 'user' | 'staff' | 'admin';
  isActive?: boolean;
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<AdminUserRow[]> {
  const q = new URLSearchParams();
  if (params?.role) q.set('role', params.role);
  if (params?.isActive != null) q.set('is_active', String(params.isActive));
  if (params?.q) q.set('q', params.q);
  if (params?.limit != null) q.set('limit', String(params.limit));
  if (params?.offset != null) q.set('offset', String(params.offset));
  const suffix = q.toString();
  return apiGet<AdminUserRow[]>(`admin/users${suffix ? `?${suffix}` : ''}`);
}

export async function adminSetUserRole(
  userId: string,
  role: 'user' | 'staff' | 'admin'
): Promise<AdminUserRow> {
  return apiPatch<AdminUserRow>(`admin/users/${encodeURIComponent(userId)}/role`, { role });
}

export async function adminSetUserStatus(userId: string, isActive: boolean): Promise<AdminUserRow> {
  return apiPatch<AdminUserRow>(`admin/users/${encodeURIComponent(userId)}/status`, {
    is_active: isActive,
  });
}

export type PromoRow = {
  id: string;
  code: string;
  discountType: 'fixed' | 'percent';
  discountValue: number;
  maxDiscount?: number | null;
  minOrderTotal: number;
  usageLimit?: number | null;
  usedCount: number;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
};

export async function adminListPromos(): Promise<PromoRow[]> {
  return apiGet<PromoRow[]>('admin/promos');
}

export async function adminCreatePromo(payload: {
  code: string;
  discountType: 'fixed' | 'percent';
  discountValue: number;
  maxDiscount?: number;
  minOrderTotal?: number;
  usageLimit?: number;
  startsAt?: string;
  endsAt?: string;
  isActive?: boolean;
}): Promise<{ id: string }> {
  return apiPost<{ id: string }>('admin/promos', payload);
}

export async function adminUpdatePromo(
  promoId: string,
  payload: Partial<{
    discountType: 'fixed' | 'percent';
    discountValue: number;
    maxDiscount: number | null;
    minOrderTotal: number;
    usageLimit: number | null;
    startsAt: string | null;
    endsAt: string | null;
    isActive: boolean;
  }>
): Promise<{ id: string }> {
  return apiPatch<{ id: string }>(`admin/promos/${encodeURIComponent(promoId)}`, payload);
}

export async function adminSetPromoActive(
  promoId: string,
  isActive: boolean
): Promise<{ id: string; isActive: boolean }> {
  return apiPatch<{ id: string; isActive: boolean }>(
    `admin/promos/${encodeURIComponent(promoId)}/active`,
    { isActive }
  );
}

export async function adminArchivePromo(
  promoId: string
): Promise<{ id: string; archived: boolean }> {
  return apiPost<{ id: string; archived: boolean }>(
    `admin/promos/${encodeURIComponent(promoId)}/archive`,
    {}
  );
}

export async function adminDeletePromo(
  promoId: string
): Promise<{ id: string; deleted: boolean; archived?: boolean }> {
  return apiDelete<{ id: string; deleted: boolean; archived?: boolean }>(
    `admin/promos/${encodeURIComponent(promoId)}`
  );
}

export type PromoUsageRow = {
  id: string;
  orderId: string;
  orderCode: string;
  userId: string;
  discountApplied: number;
  createdAt: string;
};

export async function adminPromoUsages(
  promoId: string,
  params?: { limit?: number; offset?: number }
): Promise<PromoUsageRow[]> {
  const q = new URLSearchParams();
  if (params?.limit != null) q.set('limit', String(params.limit));
  if (params?.offset != null) q.set('offset', String(params.offset));
  const suffix = q.toString();
  return apiGet<PromoUsageRow[]>(
    `admin/promos/${encodeURIComponent(promoId)}/usages${suffix ? `?${suffix}` : ''}`
  );
}

export type AdminCategoryRow = {
  id: string;
  label: string;
  slug: string;
  image?: string;
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function adminListCategories(): Promise<AdminCategoryRow[]> {
  return apiGet<AdminCategoryRow[]>('admin/categories');
}

export async function adminCreateCategory(payload: {
  id: string;
  label: string;
  slug: string;
  image?: string;
  parentId?: string | null;
}): Promise<{ id: string }> {
  return apiPost<{ id: string }>('admin/categories', payload);
}

export async function adminUpdateCategory(
  categoryId: string,
  payload: Partial<{
    label: string;
    slug: string;
    image: string | null;
    parentId: string | null;
  }>
): Promise<{ id: string }> {
  return apiPatch<{ id: string }>(`admin/categories/${encodeURIComponent(categoryId)}`, payload);
}

export async function adminDeleteCategory(
  categoryId: string
): Promise<{ id: string; deleted: boolean }> {
  return apiDelete<{ id: string; deleted: boolean }>(
    `admin/categories/${encodeURIComponent(categoryId)}`
  );
}

export async function adminUploadMedia(
  file: {
    uri: string;
    name?: string;
    type?: string;
  },
  folder = 'products'
): Promise<{ url: string; path: string }> {
  const formData = new FormData();
  const fileName = file.name ?? `upload-${Date.now()}.jpg`;
  const fileType = file.type ?? 'image/jpeg';

  if (Platform.OS === 'web') {
    const response = await fetch(file.uri);
    const blob = await response.blob();
    const uploadBlob = blob.type ? blob : blob.slice(0, blob.size, fileType);
    formData.append('file', uploadBlob, fileName);
  } else {
    formData.append('file', {
      uri: file.uri,
      name: fileName,
      type: fileType,
    } as unknown as Blob);
  }

  const q = encodeURIComponent(folder);
  return apiFetch<{ url: string; path: string }>(`admin/media/upload?folder=${q}`, {
    method: 'POST',
    body: formData,
  });
}

export async function adminDashboardSummary(): Promise<{
  totalOrders: number;
  revenue: number;
  activeProducts: number;
  lowStockVariants: number;
}> {
  return apiGet('admin/dashboard/summary');
}

export async function adminDashboardRevenue(
  days = 7
): Promise<{ day: string; revenue: number; orders: number }[]> {
  return apiGet(`admin/dashboard/revenue?days=${days}`);
}

export async function adminDashboardTopProducts(
  limit = 5
): Promise<{ productId: string; name: string; quantity: number; revenue: number }[]> {
  return apiGet(`admin/dashboard/top-products?limit=${limit}`);
}
