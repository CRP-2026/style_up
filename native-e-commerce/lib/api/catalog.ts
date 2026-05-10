import type { Category } from '~/lib/types/models';
import type {
  ImageSearchResult,
  ProductDetail,
  ProductFilter,
  ProductListPage,
} from '~/lib/types/products';

import { apiGet, apiPost } from '~/lib/api/client';
import { API_BASE_URL } from '~/lib/config/env';

/** Kích thước trang catalog (lưới 2–4 cột chia hết 24) */
export const CATALOG_PAGE_SIZE = 24;

function normalizeCategoryImageUrl(image: string): string {
  const value = image.trim();
  if (!value) return '';
  if (/^(https?:|data:|file:|content:)/i.test(value)) return value;
  try {
    return new URL(value, `${API_BASE_URL}/`).toString();
  } catch {
    return value;
  }
}

function buildProductsQuery(filter?: ProductFilter): string {
  const q = new URLSearchParams();
  if (filter?.categoryId) q.set('category_id', filter.categoryId);
  if (filter?.minPrice != null) q.set('min_price', String(filter.minPrice));
  if (filter?.maxPrice != null) q.set('max_price', String(filter.maxPrice));
  if (filter?.search) q.set('search', filter.search);
  if (filter?.size) q.set('size', filter.size);
  if (filter?.color) q.set('color', filter.color);
  if (filter?.inStock) q.set('in_stock', 'true');
  if (filter?.sort) q.set('sort', filter.sort);
  q.set('limit', String(filter?.limit ?? CATALOG_PAGE_SIZE));
  q.set('offset', String(filter?.offset ?? 0));
  const s = q.toString();
  return s ? `?${s}` : '';
}

export async function fetchCategories(): Promise<Category[]> {
  const categories = await apiGet<Category[]>('categories');
  return categories.map((category) => ({
    ...category,
    image: normalizeCategoryImageUrl(category.image),
  }));
}

export async function fetchProducts(filter?: ProductFilter): Promise<ProductListPage> {
  const q = buildProductsQuery(filter);
  return apiGet<ProductListPage>(`products${q}`);
}

export async function fetchProductById(id: string): Promise<ProductDetail> {
  return apiGet<ProductDetail>(`products/${encodeURIComponent(id)}`);
}

export async function searchProductsByImage(
  imageBase64: string,
  topK = 10
): Promise<ImageSearchResult[]> {
  const body = await apiPost<{ items: ImageSearchResult[] } | ImageSearchResult[]>(
    `products/search-by-image`,
    { image_base64: imageBase64, top_k: topK }
  );
  return Array.isArray(body) ? body : (body.items ?? []);
}
