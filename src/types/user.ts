export type UserRole = 'customer' | 'dealer' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  role: UserRole;
  fcmToken?: string;
  companyName?: string;
  gstin?: string;
  isApprovedDealer?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DealerProfile extends UserProfile {
  role: 'dealer';
  companyName: string;
  gstin?: string;
  isApprovedDealer: boolean;
  dealerDiscountPercentage?: number;
}

export interface AdminProfile extends UserProfile {
  role: 'admin';
  department?: string;
  accessLevel: 'full' | 'support' | 'operations';
}

export interface AuthResponse {
  success: boolean;
  user?: UserProfile;
  error?: string;
  errorCode?: string;
}
