export type NotificationEventType =
  | 'order_placed'
  | 'order_confirmed'
  | 'processing'
  | 'out_for_delivery'
  | 'delivered'
  | 'dealer_registered'
  | 'dealer_approved'
  | 'system_alert';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  eventType: NotificationEventType;
  orderId?: string;
  orderNumber?: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, string>;
}

export interface FcmTokenRegistration {
  userId: string;
  token: string;
  platform: 'web' | 'android' | 'ios';
  updatedAt: string;
}
