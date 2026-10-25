export interface CustomerSummary {
  uid: string;
  displayName: string;
  email: string;
  phoneNumber?: string;
  city?: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
  registeredAt: string;
  status: 'active' | 'suspended';
}
