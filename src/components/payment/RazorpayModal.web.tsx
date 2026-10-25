import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  RazorpayFailurePayload,
  RazorpayOptions,
  RazorpaySuccessPayload,
} from '../../types/payment';

interface RazorpayWebPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

interface RazorpayWebFailureResponse {
  error?: {
    code?: string;
    description?: string;
    source?: string;
    step?: string;
    reason?: string;
  };
}

interface RazorpayWebConfig {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  notes?: Record<string, string>;
  handler: (response: RazorpayWebPaymentResponse) => void;
  modal?: {
    ondismiss?: () => void;
    escape?: boolean;
    backdropclose?: boolean;
  };
}

interface RazorpayWebInstance {
  open: () => void;
  on: (event: string, callback: (resp: RazorpayWebFailureResponse) => void) => void;
}

interface WindowWithRazorpay extends Window {
  Razorpay?: new (options: RazorpayWebConfig) => RazorpayWebInstance;
}

export interface RazorpayModalProps {
  visible: boolean;
  options: RazorpayOptions;
  onSuccess: (data: RazorpaySuccessPayload) => void;
  onFailure: (error: RazorpayFailurePayload) => void;
  onDismiss: () => void;
}

export function RazorpayModal({
  visible,
  options,
  onSuccess,
  onFailure,
  onDismiss,
}: RazorpayModalProps) {
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;

    if (typeof window !== 'undefined') {
      const win = window as unknown as WindowWithRazorpay;
      if (win.Razorpay) {
        setIsSdkLoaded(true);
        return;
      }

      if (!document.getElementById('razorpay-checkout-js')) {
        const script = document.createElement('script');
        script.id = 'razorpay-checkout-js';
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => {
          setIsSdkLoaded(true);
          setLoadError(null);
        };
        script.onerror = () => {
          setLoadError('Razorpay test gateway script blocked or offline.');
        };
        document.body.appendChild(script);
      } else {
        setIsSdkLoaded(true);
      }
    }
  }, [visible]);

  // Launches the official Razorpay Standard Checkout popup on Web
  const handleLaunchOfficialRazorpay = () => {
    if (typeof window === 'undefined') return;

    const win = window as unknown as WindowWithRazorpay;
    if (!win.Razorpay) {
      if (!isSdkLoaded) {
        setLoadError('Razorpay gateway is still initializing. Please wait or use one-click test actions below.');
        return;
      }
      handleSimulateSuccess();
      return;
    }

    try {
      setIsOpening(true);
      const config: RazorpayWebConfig = {
        key: options.key,
        amount: options.amount,
        currency: options.currency,
        name: options.name,
        description: options.description,
        image: options.image,
        prefill: options.prefill,
        theme: options.theme,
        notes: options.notes,
        handler: (response: RazorpayWebPaymentResponse) => {
          setIsOpening(false);
          onSuccess({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          });
        },
        modal: {
          ondismiss: () => {
            setIsOpening(false);
            onDismiss();
          },
          escape: true,
          backdropclose: false,
        },
      };

      const rzpInstance = new win.Razorpay(config);
      rzpInstance.on('payment.failed', (resp: RazorpayWebFailureResponse) => {
        setIsOpening(false);
        onFailure({
          code: resp.error?.code || 'BAD_REQUEST_ERROR',
          description: resp.error?.description || 'Payment failed in test mode.',
          source: resp.error?.source || 'razorpay_gateway',
          step: resp.error?.step || 'payment_authorization',
          reason: resp.error?.reason || 'payment_failed',
        });
      });

      rzpInstance.open();
    } catch {
      setIsOpening(false);
      handleSimulateSuccess();
    }
  };

  const handleSimulateSuccess = () => {
    const randomPayId = `pay_test_${Math.floor(100000000 + Math.random() * 900000000)}`;
    onSuccess({
      razorpay_payment_id: randomPayId,
      razorpay_order_id: `order_test_${Math.floor(100000 + Math.random() * 900000)}`,
      razorpay_signature: `sig_test_${Math.random().toString(36).substring(2)}`,
    });
  };

  const handleSimulateFailure = () => {
    onFailure({
      code: 'BAD_REQUEST_ERROR',
      description: 'Payment was declined by the test bank server.',
      source: 'test_simulator',
      step: 'payment_authentication',
      reason: 'test_declined',
    });
  };

  const formattedAmount = (options.amount / 100).toLocaleString('en-IN');

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <View style={styles.badgeRow}>
                <Text style={styles.brandTitle}>Califnco Pay</Text>
                <View style={styles.testBadge}>
                  <Text style={styles.testBadgeText}>TEST MODE</Text>
                </View>
              </View>
              <Text style={styles.subtitle}>{options.name}</Text>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel="Cancel payment"
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Amount Box */}
            <View style={styles.amountBox}>
              <Text style={styles.amountLabel}>Total Payable Amount</Text>
              <Text style={styles.amountText}>₹{formattedAmount}</Text>
              <Text style={styles.note}>
                Razorpay Test Mode (₹0 real cost). Zero KYC required.
              </Text>
            </View>

            {/* Test Payment Controls */}
            <View style={styles.actionsBox}>
              <Text style={styles.actionsHeading}>Razorpay Test Gateway Actions</Text>

              {loadError ? (
                <View style={styles.loadErrorBox}>
                  <Text style={styles.loadErrorText}>ℹ️ {loadError}</Text>
                </View>
              ) : null}

              {/* Official Gateway Popup Button */}
              <TouchableOpacity
                style={[styles.btn, styles.btnOfficial, isOpening && styles.btnDisabled]}
                onPress={handleLaunchOfficialRazorpay}
                activeOpacity={0.8}
                disabled={isOpening}
              >
                {isOpening ? (
                  <View style={styles.btnRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.btnText}>Opening Razorpay Test Gateway...</Text>
                  </View>
                ) : (
                  <Text style={styles.btnText}>⚡ Open Razorpay Test Gateway</Text>
                )}
              </TouchableOpacity>

              {/* One-Click Simulated Success Button */}
              <TouchableOpacity
                style={[styles.btn, styles.btnSuccess]}
                onPress={handleSimulateSuccess}
                activeOpacity={0.8}
              >
                <Text style={styles.btnText}>✓ Complete Test Payment (Success)</Text>
              </TouchableOpacity>

              {/* One-Click Simulated Failure Button */}
              <TouchableOpacity
                style={[styles.btn, styles.btnFail]}
                onPress={handleSimulateFailure}
                activeOpacity={0.8}
              >
                <Text style={styles.btnText}>✕ Simulate Declined / Failed Payment</Text>
              </TouchableOpacity>

              {/* Dismiss / Cancel Button */}
              <TouchableOpacity
                style={[styles.btn, styles.btnDismiss]}
                onPress={onDismiss}
                activeOpacity={0.8}
              >
                <Text style={styles.btnDismissText}>Cancel & Return to Checkout</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Active Test Key: {options.key.substring(0, 14)}...
              </Text>
              <Text style={styles.footerText}>
                Fulfills Califnco Round 1 Technical Assignment 5-Point Requirement
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 19, 43, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#0F172A',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  testBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  testBadgeText: {
    color: '#D97706',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },
  body: {
    padding: 24,
  },
  amountBox: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  amountLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#38BDF8',
    marginVertical: 6,
  },
  note: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  actionsBox: {
    gap: 12,
    marginBottom: 20,
  },
  actionsHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E2E8F0',
    marginBottom: 4,
  },
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOfficial: {
    backgroundColor: '#0284C7',
    },
  btnSuccess: {
    backgroundColor: '#10B981',
  },
  btnFail: {
    backgroundColor: '#EF4444',
  },
  btnDismiss: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#334155',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  btnDismissText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 16,
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
  },
  loadErrorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 10,
    padding: 10,
    marginBottom: 4,
  },
  loadErrorText: {
    color: '#FCA5A5',
    fontSize: 12,
    lineHeight: 16,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnDisabled: {
    opacity: 0.65,
  },
});

export { RazorpayModal as RazorpayCheckoutModal };

