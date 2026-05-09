import { ProductVariant } from './products';
export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  addresses?: Address[];
}

export interface Product {
  id: string;
  name: string;
  image: string;
  description: string;
  price: number;
  variants: ProductVariant[];
  rating: number;
  reviews: number;
  categoryId?: string;
  discount?: string;
  compareAtPrice?: number;
  images?: string[];
}

export interface Address {
  id: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  isDefault: boolean;
}

export interface Category {
  id: string;
  label: string;
  image: string;
}
