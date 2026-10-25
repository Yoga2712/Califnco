import { Product } from './product';
import { ShippingAddress } from './order';

export interface DealerCartItem {
  product: Product;
  quantity: number;
  wholesaleUnitPrice: number;
  subtotal: number;
}

export interface DealerBulkOrderSummary {
  wholesaleSubtotal: number;
  retailValue: number;
  marginSavings: number;
  marginPercentage: number;
  tierDiscount: number;
  taxableAmount: number;
  gstAmount: number;
  freightFee: number;
  finalTotalAmount: number;
}

export interface PlaceDealerOrderInput {
  dealerId: string;
  companyName: string;
  gstin?: string;
  contactPerson: string;
  phoneNumber: string;
  shippingAddress: ShippingAddress;
  deliverySlotTimeWindow?: string;
  paymentMethod: 'upi' | 'card' | 'netbanking' | 'cod';
  paymentId?: string;
  paymentStatus?: 'paid' | 'pending';
  notes?: string;
}
