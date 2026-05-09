import { Product } from './models';
export interface ProductVariant {
  id: string;
  color?: string | null;
  size?: string | null;
  sku?: string;
  price: number;
  stock: number;
  image?: string | null;
}

export interface ProductDetail extends Product {
  images?: string[];
  description: string;
  shortDescription?: string | null;
  currency?: string;
  attributes?: Record<string, unknown> | null;
  brand?: string | null;
  shoeType?: string | null;
  genderTarget?: string | null;
  season?: string | null;
  usageType?: string | null;
  soleMaterial?: string | null;
  upperMaterial?: string | null;
  closureType?: string | null;
  totalStock?: number;
}

/** List card + catalog list response (subset of ProductDetail allowed). */
export type ProductSummary = Pick<
  ProductDetail,
  'id' | 'name' | 'image' | 'description' | 'price' | 'rating' | 'reviews' | 'discount' | 'variants'
> & {
  categoryId?: string;
  brand?: string | null;
  shoeType?: string | null;
  genderTarget?: string | null;
  totalStock?: number;
};

/** GET /products — phân trang catalog */
export type ProductListPage = {
  items: ProductSummary[];
  total: number;
  limit: number;
  offset: number;
};

export type ImageSearchResult = {
  product_id: string;
  name: string;
  image?: string | null;
  price?: number | null;
  score: number;
};

export type ProductSort = 'newest' | 'price_asc' | 'price_desc' | 'rating_desc' | 'name_asc';

export type ProductFilter = {
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  size?: string;
  color?: string;
  inStock?: boolean;
  sort?: ProductSort;
  /** API pagination; storefront home defaults to 500 in catalog client */
  limit?: number;
  offset?: number;
};
