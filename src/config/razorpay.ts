/**
 * Razorpay Configuration Module
 * 
 * IMPORTANT:
 * - This assignment strictly requires Razorpay TEST MODE only.
 * - Test mode keys always start with 'rzp_test_'.
 * - NEVER use or commit live/production keys.
 * - Key ID is loaded from the EXPO_PUBLIC_RAZORPAY_KEY_ID environment variable.
 */

const DEFAULT_TEST_KEY_ID = 'rzp_test_Trol5xND5RnfAg'; // Assigned Califnco Razorpay test key

export const RAZORPAY_CONFIG = {
  /**
   * Razorpay Test Mode Key ID.
   * Prioritizes environment variable, falls back to standard test key.
   */
  keyId: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || DEFAULT_TEST_KEY_ID,

  /**
   * Currency code for Indian Rupee transactions.
   */
  currency: 'INR' as const,

  /**
   * Merchant business name displayed on test checkout.
   */
  merchantName: 'Califnco Water Systems',

  /**
   * Brand description shown in test checkout.
   */
  description: 'Water Purifier Order - Test Mode Payment',

  /**
   * Primary brand theme color (Califnco Blue).
   */
  themeColor: '#0284C7',

  /**
   * Califnco Brand Logo URL for test checkout header.
   */
  logoUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=128&q=80',
};

/**
 * Validates that the active Razorpay key is strictly a TEST MODE key.
 * Guaranteed to prevent accidental production key deployment.
 */
export function isRazorpayTestKey(key: string): boolean {
  return key.startsWith('rzp_test_');
}

/**
 * Ensures runtime safety check before launching checkout.
 */
export function validateRazorpayConfig(): { isValid: boolean; error?: string } {
  if (!RAZORPAY_CONFIG.keyId) {
    return { isValid: false, error: 'Razorpay Key ID is not configured.' };
  }
  if (!isRazorpayTestKey(RAZORPAY_CONFIG.keyId)) {
    return {
      isValid: false,
      error: 'CRITICAL: Only Razorpay TEST keys (starting with rzp_test_) are allowed for this assignment.',
    };
  }
  return { isValid: true };
}
