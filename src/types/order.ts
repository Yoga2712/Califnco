import { Product } from './product';

export type AddressType = 'Home' | 'Office' | 'Commercial';

export interface ShippingAddress {
  fullName: string;
  phoneNumber: string;
  addressLine: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  addressType: AddressType;
}

export interface DeliverySlot {
  id: string;
  title: string;
  timeWindow: string;
  sublabel: string;
  isExpress?: boolean;
}

export type PaymentMethodId = 'cod' | 'upi' | 'card' | 'netbanking';

export interface PaymentMethodOption {
  id: PaymentMethodId;
  title: string;
  subtitle: string;
  badge?: string;
  icon: string;
}

export interface OrderItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

import { PaymentStatus } from './payment';
export type { PaymentStatus };

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'processing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: string;
  orderNumber: string;
  userId?: string;
  items: OrderItem[];
  totalCount: number;
  subtotal: number;
  deliveryFee: number;
  installationFee: number;
  totalAmount: number;
  shippingAddress: ShippingAddress;
  deliverySlot: DeliverySlot;
  paymentMethod: PaymentMethodId;
  paymentStatus: PaymentStatus;
  paymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
  paidAt?: string;
  status: OrderStatus;
  createdAt: string;
  estimatedDeliveryDate: string;
  isDealerOrder?: boolean;
  dealerCompanyName?: string;
  dealerGstin?: string;
  tierDiscount?: number;
  gstAmount?: number;
}

export interface CreateOrderInput {
  userId?: string;
  items: { product: Product; quantity: number; unitPrice?: number }[];
  shippingAddress: ShippingAddress;
  deliverySlot: DeliverySlot;
  paymentMethod: PaymentMethodId;
  paymentStatus?: PaymentStatus;
  paymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
  paidAt?: string;
  isDealerOrder?: boolean;
  dealerCompanyName?: string;
  dealerGstin?: string;
  tierDiscount?: number;
  gstAmount?: number;
  customOrderNumber?: string;
}


