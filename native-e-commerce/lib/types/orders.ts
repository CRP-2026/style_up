export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export type OrderTimelineEvent = {
  status: string;
  code?: OrderStatus | string | null;
  date: string;
  completed: boolean;
};

export type OrderLineItem = {
  id: string;
  productId?: string | null;
  variantId?: string | null;
  name: string;
  price: number;
  quantity: number;
  image: string;
  size?: string | null;
  color?: string | null;
  sku?: string | null;
};

export type OrderDetail = {
  id: string;
  code: string;
  date: string;
  status: OrderStatus;
  subtotal?: number;
  shippingFee?: number;
  discountTotal?: number;
  total: number;
  paymentStatus?: string;
  items: OrderLineItem[];
  shippingAddress: {
    name: string;
    phone: string;
    address: string;
    city: string;
  };
  paymentMethod: string;
  paymentMethodCode?: string;
  tracking: string;
  estimatedDelivery?: string;
  timeline: OrderTimelineEvent[];
};

export type OrderSummary = {
  id: string;
  code: string;
  date: string;
  status: OrderStatus;
  total: number;
  itemCount: number;
};
