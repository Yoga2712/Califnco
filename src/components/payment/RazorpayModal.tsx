import React, { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import {
  RazorpayFailurePayload,
  RazorpayOptions,
  RazorpaySuccessPayload,
} from '../../types/payment';

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
  const [isLoading, setIsLoading] = useState(true);

  // Generates self-contained HTML that executes Razorpay Test Mode checkout
  const htmlContent = useMemo(() => {
    const formattedAmount = (options.amount / 100).toLocaleString('en-IN');
    const safeOptionsJson = JSON.stringify(options);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: #0B132B;
            color: #FFFFFF;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 24px;
            text-align: center;
          }
          .card {
            background: #1C2541;
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 20px;
            padding: 28px 24px;
            width: 100%;
            max-width: 420px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.4);
          }
          .badge {
            display: inline-block;
            background: #FEF3C7;
            color: #D97706;
            font-size: 11px;
            font-weight: 800;
            padding: 4px 12px;
            border-radius: 12px;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin-bottom: 12px;
          }
          .brand-title {
            font-size: 20px;
            font-weight: 700;
            color: #FFFFFF;
            margin-bottom: 4px;
          }
          .amount-tag {
            font-size: 32px;
            font-weight: 800;
            color: #38BDF8;
            margin: 16px 0 6px 0;
          }
          .subtext {
            font-size: 13px;
            color: #94A3B8;
            line-height: 1.5;
            margin-bottom: 24px;
          }
          .spinner {
            border: 3px solid rgba(56, 189, 248, 0.2);
            border-top: 3px solid #38BDF8;
            border-radius: 50%;
            width: 36px;
            height: 36px;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px auto;
          }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          .actions {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-top: 20px;
          }
          .btn {
            padding: 14px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 700;
            border: none;
            cursor: pointer;
            transition: opacity 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }
          .btn:active { opacity: 0.85; }
          .btn-success { background: #10B981; color: #FFFFFF; }
          .btn-fail { background: #EF4444; color: #FFFFFF; }
          .btn-dismiss { background: #334155; color: #E2E8F0; }
          .divider {
            height: 1px;
            background: rgba(255,255,255,0.08);
            margin: 20px 0;
          }
          .instructions {
            font-size: 11px;
            color: #64748B;
            line-height: 1.4;
          }
        </style>
        <!-- Razorpay Official Checkout SDK -->
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      </head>
      <body>
        <div class="card">
          <div class="badge">Razorpay Test Mode</div>
          <div class="brand-title">${options.name}</div>
          <div class="amount-tag">₹${formattedAmount}</div>
          <div class="subtext">
            Test mode enabled. In this environment, zero real money is transacted.
          </div>

          <div id="loadingBox">
            <div class="spinner"></div>
            <div style="font-size: 12px; color: #94A3B8;">Launching Razorpay Gateway...</div>
          </div>

          <div class="divider"></div>

          <div class="actions">
            <button class="btn btn-success" onclick="triggerTestSuccess()">
              ✓ Complete Test Payment (Success)
            </button>
            <button class="btn btn-fail" onclick="triggerTestFailure()">
              ✕ Simulate Payment Failure
            </button>
            <button class="btn btn-dismiss" onclick="triggerTestDismiss()">
              Dismiss / Cancel Payment
            </button>
          </div>

          <div class="divider"></div>
          <div class="instructions">
            Key: ${options.key.substring(0, 12)}...<br/>
            Safe test transaction for Califnco Round 1 Assignment.
          </div>
        </div>

        <script>
          const razorpayOptions = ${safeOptionsJson};

          function sendEvent(type, payload) {
            const message = JSON.stringify({ type: type, data: payload });
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(message);
            }
          }

          function triggerTestSuccess() {
            const randomPayId = 'pay_test_' + Math.floor(100000000 + Math.random() * 900000000);
            sendEvent('SUCCESS', {
              razorpay_payment_id: randomPayId,
              razorpay_order_id: 'order_test_' + Math.floor(100000 + Math.random() * 900000),
              razorpay_signature: 'sig_test_' + Math.random().toString(36).substring(2),
            });
          }

          function triggerTestFailure() {
            sendEvent('FAILURE', {
              code: 'BAD_REQUEST_ERROR',
              description: 'Payment was declined by the test bank server.',
              source: 'test_simulator',
              step: 'payment_authentication',
              reason: 'test_declined',
            });
          }

          function triggerTestDismiss() {
            sendEvent('DISMISSED', {});
          }

          // Automatically launch Razorpay SDK if checkout.js is available
          window.addEventListener('load', function() {
            try {
              if (typeof Razorpay !== 'undefined') {
                const config = Object.assign({}, razorpayOptions, {
                  handler: function(response) {
                    sendEvent('SUCCESS', response);
                  },
                  modal: {
                    ondismiss: function() {
                      sendEvent('DISMISSED', {});
                    },
                    escape: true,
                    backdropclose: false
                  }
                });

                const rzp = new Razorpay(config);
                rzp.on('payment.failed', function(resp) {
                  sendEvent('FAILURE', resp.error || {});
                });
                rzp.open();
                document.getElementById('loadingBox').style.display = 'none';
              }
            } catch (err) {
              console.log('Razorpay automated open note: using test actions', err);
            }
          });
        </script>
      </body>
      </html>
    `;
  }, [options]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const rawData = event.nativeEvent.data;
      const parsed = JSON.parse(rawData) as {
        type: 'SUCCESS' | 'FAILURE' | 'DISMISSED';
        data?: RazorpaySuccessPayload | RazorpayFailurePayload;
      };

      if (parsed.type === 'SUCCESS') {
        const successData = (parsed.data as RazorpaySuccessPayload) || {
          razorpay_payment_id: `pay_test_${Date.now()}`,
        };
        onSuccess(successData);
      } else if (parsed.type === 'FAILURE') {
        const failureData = (parsed.data as RazorpayFailurePayload) || {
          code: 'PAYMENT_FAILED',
          description: 'Payment could not be completed in test mode.',
        };
        onFailure(failureData);
      } else if (parsed.type === 'DISMISSED') {
        onDismiss();
      }
    } catch {
      onDismiss();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onDismiss}
    >
      <SafeAreaView style={styles.container}>
        {/* Custom Header Bar */}
        <View style={styles.header}>
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.brandTitle}>Califnco Pay</Text>
              <View style={styles.testBadge}>
                <Text style={styles.testBadgeText}>TEST MODE</Text>
              </View>
            </View>
            <Text style={styles.keyLabel}>Zero KYC Test Gateway</Text>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Close payment window"
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* WebView Container */}
        <View style={styles.webviewWrapper}>
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#0284C7" />
              <Text style={styles.loadingText}>Initializing Razorpay Secure Portal...</Text>
            </View>
          )}

          <WebView
            originWhitelist={['*']}
            source={{ html: htmlContent }}
            style={styles.webview}
            onLoadEnd={() => setIsLoading(false)}
            onMessage={handleMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            mixedContentMode="always"
            allowsInlineMediaPlayback={true}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B132B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  titleRow: {
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
  keyLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#CBD5E1',
    fontSize: 16,
    fontWeight: '700',
  },
  webviewWrapper: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0B132B',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 14,
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
});

export { RazorpayModal as RazorpayCheckoutModal };

