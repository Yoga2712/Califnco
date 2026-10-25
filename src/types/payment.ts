export type PaymentStatus = 'paid' | 'pending' | 'failed';

export interface RazorpaySuccessPayload {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

export interface RazorpayFailurePayload {
  code?: string;
  description?: string;
  source?: string;
  step?: string;
  reason?: string;
  metadata?: {
    order_id?: string;
    payment_id?: string;
  };
}

export interface RazorpayPrefill {
  name?: string;
  email?: string;
  contact?: string;
}

export interface RazorpayOptions {
  key: string;
  amount: number; // in paise (₹1 = 100 paise)
  currency: string;
  name: string;
  description: string;
  image?: string;
  prefill?: RazorpayPrefill;
  theme?: {
    color?: string;
    backdrop_color?: string;
  };
  notes?: Record<string, string>;
}

export type PaymentState =
  | 'idle'
  | 'initiating'
  | 'processing'
  | 'success'
  | 'failed'
  | 'cancelled';
