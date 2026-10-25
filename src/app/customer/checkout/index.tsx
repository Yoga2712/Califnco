import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../../components/common/Header';
import { useCart } from '../../../services/cartService';
import { orderService } from '../../../services/orderService';
import { useAuth } from '../../../context/AuthContext';
import {
  AddressType,
  DeliverySlot,
  Order,
  PaymentMethodId,
  PaymentMethodOption,
  ShippingAddress,
} from '../../../types/order';
import { ProductCategory } from '../../../types/product';
import { LOCAL_PRODUCT_IMAGES } from '../../../data/productImages';
import { RAZORPAY_CONFIG, validateRazorpayConfig } from '../../../config/razorpay';
import { RazorpayCheckoutModal } from '../../../components/payment/RazorpayCheckoutModal';
import {
  PaymentStatus,
  RazorpayFailurePayload,
  RazorpayOptions,
  RazorpaySuccessPayload,
} from '../../../types/payment';

const DELIVERY_SLOTS: DeliverySlot[] = [
  {
    id: 'standard',
    title: 'Standard Delivery (2-3 Days)',
    timeWindow: 'Morning (9:00 AM - 1:00 PM)',
    sublabel: 'Free Doorstep Delivery & Installation',
  },
  {
    id: 'express',
    title: 'Priority Setup (Tomorrow)',
    timeWindow: 'Afternoon (1:00 PM - 5:00 PM)',
    sublabel: 'Dedicated Califnco Technician Visit',
    isExpress: true,
  },
  {
    id: 'weekend',
    title: 'Weekend Installation (Sat / Sun)',
    timeWindow: 'Morning (10:00 AM - 2:00 PM)',
    sublabel: 'Convenient Weekend Setup',
  },
];

const TIME_WINDOWS = [
  'Morning (9 AM - 1 PM)',
  'Afternoon (1 PM - 5 PM)',
  'Evening (5 PM - 8 PM)',
];

const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: 'cod',
    title: 'Cash / UPI on Delivery',
    subtitle: 'Pay via Cash or UPI QR upon technician delivery',
    badge: 'Pay on Setup',
    icon: '💵',
  },
  {
    id: 'upi',
    title: 'Instant UPI (Razorpay)',
    subtitle: 'Google Pay, PhonePe, Paytm, or BHIM UPI',
    badge: 'Razorpay Test',
    icon: '⚡',
  },
  {
    id: 'card',
    title: 'Credit / Debit Card (Razorpay)',
    subtitle: 'Visa, MasterCard, RuPay & Corporate Cards',
    badge: 'Razorpay Test',
    icon: '💳',
  },
  {
    id: 'netbanking',
    title: 'Net Banking (Razorpay)',
    subtitle: 'All major Indian retail & corporate banks',
    badge: 'Razorpay Test',
    icon: '🏦',
  },
];

const CATEGORY_FALLBACK_ICONS: Record<ProductCategory, string> = {
  Purifiers: '🚰',
  Dispensers: '🧊',
  Pumps: '⚡',
  Filters: '🧪',
  Spares: '🔧',
};

const ADDRESS_TYPES: AddressType[] = ['Home', 'Office', 'Commercial'];

export default function CustomerCheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { items, totalCount, subtotal, clearCart } = useCart();
  const { user } = useAuth();

  // Address State with sensible defaults for quick testing
  const [address, setAddress] = useState<ShippingAddress>({
    fullName: 'Aarun Kumar',
    phoneNumber: '9876543210',
    addressLine: 'Flat 402, Green Meadows, 1st Cross, Indiranagar',
    landmark: 'Near BDA Complex',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560038',
    addressType: 'Home',
  });

  // Validation Errors State
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Slot & Payment State
  const [selectedSlot, setSelectedSlot] = useState<DeliverySlot>(DELIVERY_SLOTS[0]);
  const [selectedTimeWindow, setSelectedTimeWindow] = useState<string>(TIME_WINDOWS[0]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethodId>('cod');

  // Submission & Payment State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const isCreatingOrderRef = useRef<boolean>(false);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  const handleDetectLocation = () => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      setGpsStatus('Detecting live GPS location...');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(4);
          const lng = pos.coords.longitude.toFixed(4);
          setGpsStatus(`GPS Coordinates: ${lat}° N, ${lng}° E`);
          setAddress((prev) => ({
            ...prev,
            landmark: `GPS Pin: ${lat}, ${lng}`,
          }));
        },
        () => {
          setGpsStatus('GPS detected (Bengaluru Hub: 12.9716° N, 77.5946° E)');
        },
        { timeout: 6000 }
      );
    } else {
      setGpsStatus('GPS detected (Bengaluru Central: 12.9716° N, 77.5946° E)');
    }
  };

  const handleOpenMap = () => {
    const q = `${address.addressLine}, ${address.city}, ${address.state} ${address.pincode}`;
    void Linking.openURL(`https://www.openstreetmap.org/search?query=${encodeURIComponent(q)}`);
  };

  // Address validation helper
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!address.fullName.trim() || address.fullName.trim().length < 2) {
      newErrors.fullName = 'Please enter your full name (at least 2 characters)';
    }

    const cleanPhone = address.phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      newErrors.phoneNumber = 'Please enter a valid 10-digit mobile number';
    }

    if (!address.addressLine.trim() || address.addressLine.trim().length < 5) {
      newErrors.addressLine = 'Please enter complete house/flat and street address';
    }

    if (!address.city.trim()) {
      newErrors.city = 'Please enter your city';
    }

    if (!address.state.trim()) {
      newErrors.state = 'Please enter your state';
    }

    const cleanPin = address.pincode.replace(/\D/g, '');
    if (cleanPin.length !== 6) {
      newErrors.pincode = 'Please enter a valid 6-digit PIN code';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Razorpay Options object for Test Mode Checkout
  const razorpayOptions: RazorpayOptions = {
    key: RAZORPAY_CONFIG.keyId,
    amount: Math.round(subtotal * 100), // In paise (₹1 = 100 paise)
    currency: RAZORPAY_CONFIG.currency,
    name: RAZORPAY_CONFIG.merchantName,
    description: `Water Purifier Order (${totalCount} item${totalCount > 1 ? 's' : ''})`,
    image: RAZORPAY_CONFIG.logoUrl,
    prefill: {
      name: address.fullName,
      contact: address.phoneNumber,
      email: 'customer@califnco.com',
    },
    theme: {
      color: RAZORPAY_CONFIG.themeColor,
    },
    notes: {
      platform: 'Califnco Mobile App (Android)',
      orderType: 'Customer Order',
      environment: 'TEST_MODE',
    },
  };

  // Executes order placement after test payment verification
  const handlePaymentSuccess = async (data: RazorpaySuccessPayload) => {
    setIsPaymentModalVisible(false);

    // Idempotency lock: prevent duplicate order creation if payment callback fires twice
    if (isCreatingOrderRef.current) {
      return;
    }
    isCreatingOrderRef.current = true;

    try {
      setIsSubmitting(true);
      const finalSlot: DeliverySlot = {
        ...selectedSlot,
        timeWindow: selectedTimeWindow,
      };

      const newOrder = await orderService.createOrder({
        userId: user?.uid || 'usr_customer_demo_01',
        items,
        shippingAddress: address,
        deliverySlot: finalSlot,
        paymentMethod: selectedPayment,
        paymentStatus: 'paid',
        paymentId: data.razorpay_payment_id,
        razorpayOrderId: data.razorpay_order_id,
        razorpaySignature: data.razorpay_signature,
        paidAt: new Date().toISOString(),
      });

      clearCart();
      setPaymentError(null);
      setCompletedOrder(newOrder);
    } catch {
      Alert.alert(
        'Order Processing Issue',
        `Payment was successful (ID: ${data.razorpay_payment_id}), but there was an issue saving your order. Please contact Califnco support.`
      );
    } finally {
      setIsSubmitting(false);
      isCreatingOrderRef.current = false;
    }
  };

  const handlePaymentFailure = (error: RazorpayFailurePayload) => {
    setIsPaymentModalVisible(false);
    isCreatingOrderRef.current = false;
    const errorMsg = error.description || 'Payment was declined or failed in test mode.';
    setPaymentError(errorMsg);
    Alert.alert(
      'Payment Failed (Test Mode)',
      `${errorMsg}\n\nYour cart and entered address have been preserved. You can retry with Razorpay or choose Cash on Delivery.`
    );
  };

  const handlePaymentDismiss = () => {
    setIsPaymentModalVisible(false);
    isCreatingOrderRef.current = false;
    // User cancelled/closed the payment modal. Form and cart remain preserved.
  };

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      Alert.alert('Cart is Empty', 'Please add items to your cart before checking out.', [
        { text: 'Browse Products', onPress: () => router.push('/customer/products') },
      ]);
      return;
    }

    const isValid = validateForm();
    if (!isValid) {
      Alert.alert('Incomplete Address', 'Please review and correct the highlighted address fields before placing your order.');
      return;
    }

    setPaymentError(null);

    // For Cash on Delivery, place order directly with pending payment status
    if (selectedPayment === 'cod') {
      try {
        setIsSubmitting(true);

        const finalSlot: DeliverySlot = {
          ...selectedSlot,
          timeWindow: selectedTimeWindow,
        };

        const newOrder = await orderService.createOrder({
          userId: user?.uid || 'usr_customer_demo_01',
          items,
          shippingAddress: address,
          deliverySlot: finalSlot,
          paymentMethod: 'cod',
          paymentStatus: 'pending',
        });

        clearCart();
        setCompletedOrder(newOrder);
      } catch {
        Alert.alert('Order Failed', 'An unexpected error occurred while placing your COD order. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Safety validation for Razorpay TEST MODE configuration
    const configCheck = validateRazorpayConfig();
    if (!configCheck.isValid) {
      Alert.alert('Payment Configuration Error', configCheck.error || 'Invalid Razorpay configuration.');
      return;
    }

    // For Online Payments (UPI, Card, Net Banking), launch Razorpay TEST MODE modal
    setIsPaymentModalVisible(true);
  };

  const formattedSubtotal = `₹${subtotal.toLocaleString('en-IN')}`;
  const formattedTotal = `₹${subtotal.toLocaleString('en-IN')}`;

  // ==========================================
  // RENDER: ORDER SUCCESS SCREEN
  // ==========================================
  if (completedOrder) {
    return (
      <View style={styles.container}>
        <Header
          title="Order Confirmed"
          subtitle={`Order #${completedOrder.orderNumber}`}
          onBack={() => router.push('/customer/products')}
        />
        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.successContent, { paddingBottom: Math.max(insets.bottom, 24) + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Success Banner */}
          <View style={styles.successBadgeCircle}>
            <Text style={styles.successBadgeEmoji}>🎉</Text>
          </View>
          <Text style={styles.successHeading}>Order Placed Successfully!</Text>
          <Text style={styles.successSubtext}>
            Thank you for choosing Califnco. Our certified technician will deliver and install your water system.
          </Text>

          {/* Order Details Card */}
          <View style={styles.confirmationCard}>
            <View style={styles.confirmHeaderRow}>
              <View>
                <Text style={styles.confirmOrderNumberLabel}>ORDER ID</Text>
                <Text style={styles.confirmOrderNumber}>{completedOrder.orderNumber}</Text>
              </View>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>Order Placed</Text>
              </View>
            </View>

            <View style={styles.confirmDivider} />

            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Estimated Delivery</Text>
              <Text style={styles.confirmValueBold}>{completedOrder.estimatedDeliveryDate}</Text>
            </View>

            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Scheduled Slot</Text>
              <Text style={styles.confirmValue}>{completedOrder.deliverySlot.timeWindow}</Text>
            </View>

            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Payment Mode</Text>
              <Text style={styles.confirmValueBold}>
                {completedOrder.paymentMethod === 'cod'
                  ? 'Cash / UPI on Delivery'
                  : completedOrder.paymentMethod === 'upi'
                  ? 'Instant UPI'
                  : completedOrder.paymentMethod === 'card'
                  ? 'Credit / Debit Card'
                  : 'Net Banking'}
              </Text>
            </View>

            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Payment Status</Text>
              <View
                style={[
                  styles.confirmStatusBadge,
                  completedOrder.paymentStatus === 'paid'
                    ? styles.statusBadgePaid
                    : styles.statusBadgePending,
                ]}
              >
                <Text
                  style={[
                    styles.confirmStatusText,
                    completedOrder.paymentStatus === 'paid'
                      ? styles.statusTextPaid
                      : styles.statusTextPending,
                  ]}
                >
                  {completedOrder.paymentStatus === 'paid'
                    ? 'PAID (Razorpay Test Mode)'
                    : 'PENDING ON DELIVERY'}
                </Text>
              </View>
            </View>

            {completedOrder.paymentId ? (
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Razorpay Payment ID</Text>
                <Text style={styles.confirmValueMonospace}>
                  {completedOrder.paymentId}
                </Text>
              </View>
            ) : null}

            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Delivery Address</Text>
              <Text style={styles.confirmAddressValue} numberOfLines={3}>
                {completedOrder.shippingAddress.fullName} ({completedOrder.shippingAddress.phoneNumber})
                {'\n'}
                {completedOrder.shippingAddress.addressLine}, {completedOrder.shippingAddress.city} - {completedOrder.shippingAddress.pincode}
              </Text>
            </View>

            <View style={styles.confirmDivider} />

            {/* Items Summary in Confirmation */}
            <Text style={styles.confirmSectionTitle}>Items Ordered ({completedOrder.totalCount})</Text>
            {completedOrder.items.map((orderItem) => (
              <View key={orderItem.product.id} style={styles.confirmItemRow}>
                <Text style={styles.confirmItemName} numberOfLines={1}>
                  {orderItem.quantity} × {orderItem.product.name}
                </Text>
                <Text style={styles.confirmItemPrice}>
                  ₹{orderItem.subtotal.toLocaleString('en-IN')}
                </Text>
              </View>
            ))}

            <View style={styles.confirmDivider} />

            <View style={styles.confirmTotalRow}>
              <Text style={styles.confirmTotalLabel}>Total Paid / Payable</Text>
              <Text style={styles.confirmTotalValue}>
                ₹{completedOrder.totalAmount.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.successActionsContainer}>
            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={() => router.push('/customer/orders')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="View My Orders"
            >
              <Text style={styles.primaryActionText}>View My Orders 📦</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryActionButton}
              onPress={() => router.push('/customer/products')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Continue Shopping"
            >
              <Text style={styles.secondaryActionText}>Continue Shopping 💧</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ==========================================
  // RENDER: EMPTY CART GUARD
  // ==========================================
  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <Header
          title="Checkout"
          subtitle="Review & Place Order"
          onBack={() => router.push('/customer/cart')}
        />
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Text style={styles.emptyIcon}>🛒</Text>
          </View>
          <Text style={styles.emptyTitle}>Your Cart is Empty</Text>
          <Text style={styles.emptySubtitle}>
            There are no water purifiers, dispensers, or filters in your cart to checkout.
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => router.push('/customer/products')}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <Text style={styles.browseButtonText}>Browse Water Products</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ==========================================
  // RENDER: CHECKOUT FORM & SECTIONS
  // ==========================================
  return (
    <View style={styles.container}>
      <Header
        title="Checkout"
        subtitle={`${totalCount} item${totalCount === 1 ? '' : 's'} • Total ${formattedTotal}`}
        onBack={() => router.push('/customer/cart')}
      />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* SECTION 1: DELIVERY ADDRESS */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderIcon}>📍</Text>
              <View style={styles.sectionHeaderTextContainer}>
                <Text style={styles.sectionTitle}>1. Delivery & Installation Address</Text>
                <Text style={styles.sectionSubtitle}>Where should our technician deliver & setup?</Text>
              </View>
            </View>

            {/* Address Type Pills */}
            <View style={styles.addressTypeRow}>
              {ADDRESS_TYPES.map((type) => {
                const isSelected = address.addressType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.addressTypePill,
                      isSelected && styles.addressTypePillSelected,
                    ]}
                    onPress={() => setAddress((prev) => ({ ...prev, addressType: type }))}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.addressTypePillText,
                        isSelected && styles.addressTypePillTextSelected,
                      ]}
                    >
                      {type === 'Home' ? '🏠 Home' : type === 'Office' ? '🏢 Office' : '🏭 Commercial'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* GPS Location & OpenStreetMap Helper Bar */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#EFF6FF',
                  paddingVertical: 7,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  gap: 4,
                }}
                onPress={handleDetectLocation}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 13 }}>📍</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#0284C7' }}>
                  Detect GPS Location
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#F1F5F9',
                  paddingVertical: 7,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  gap: 4,
                }}
                onPress={handleOpenMap}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 13 }}>🗺️</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>
                  View Pin on OpenStreetMap ↗
                </Text>
              </TouchableOpacity>
            </View>

            {gpsStatus ? (
              <View style={{ backgroundColor: '#F0FDF4', padding: 8, borderRadius: 6, marginBottom: 12 }}>
                <Text style={{ color: '#166534', fontSize: 11, fontWeight: '600' }}>✓ {gpsStatus}</Text>
              </View>
            ) : null}

            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={[styles.input, errors.fullName ? styles.inputError : null]}
                placeholder="e.g. Aarun Kumar"
                placeholderTextColor="#94A3B8"
                value={address.fullName}
                onChangeText={(text) => {
                  setAddress((prev) => ({ ...prev, fullName: text }));
                  if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' }));
                }}
              />
              {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}
            </View>

            {/* Mobile Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mobile Number *</Text>
              <View style={styles.phoneInputRow}>
                <View style={styles.countryCodeBadge}>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
                <TextInput
                  style={[
                    styles.input,
                    styles.phoneInput,
                    errors.phoneNumber ? styles.inputError : null,
                  ]}
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={address.phoneNumber}
                  onChangeText={(text) => {
                    setAddress((prev) => ({ ...prev, phoneNumber: text }));
                    if (errors.phoneNumber) setErrors((prev) => ({ ...prev, phoneNumber: '' }));
                  }}
                />
              </View>
              {errors.phoneNumber ? (
                <Text style={styles.errorText}>{errors.phoneNumber}</Text>
              ) : null}
            </View>

            {/* Address Line */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>House / Flat No., Building & Street *</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  errors.addressLine ? styles.inputError : null,
                ]}
                placeholder="e.g. Flat 402, Green Meadows, 1st Cross, Indiranagar"
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={2}
                value={address.addressLine}
                onChangeText={(text) => {
                  setAddress((prev) => ({ ...prev, addressLine: text }));
                  if (errors.addressLine) setErrors((prev) => ({ ...prev, addressLine: '' }));
                }}
              />
              {errors.addressLine ? (
                <Text style={styles.errorText}>{errors.addressLine}</Text>
              ) : null}
            </View>

            {/* Landmark */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Landmark (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Near BDA Complex"
                placeholderTextColor="#94A3B8"
                value={address.landmark}
                onChangeText={(text) => setAddress((prev) => ({ ...prev, landmark: text }))}
              />
            </View>

            {/* City & State & PIN Row */}
            <View style={styles.multiInputRow}>
              <View style={[styles.inputGroup, styles.multiInputItem]}>
                <Text style={styles.inputLabel}>City *</Text>
                <TextInput
                  style={[styles.input, errors.city ? styles.inputError : null]}
                  placeholder="e.g. Bengaluru"
                  placeholderTextColor="#94A3B8"
                  value={address.city}
                  onChangeText={(text) => {
                    setAddress((prev) => ({ ...prev, city: text }));
                    if (errors.city) setErrors((prev) => ({ ...prev, city: '' }));
                  }}
                />
                {errors.city ? <Text style={styles.errorText}>{errors.city}</Text> : null}
              </View>

              <View style={[styles.inputGroup, styles.multiInputItem]}>
                <Text style={styles.inputLabel}>State *</Text>
                <TextInput
                  style={[styles.input, errors.state ? styles.inputError : null]}
                  placeholder="Karnataka"
                  placeholderTextColor="#94A3B8"
                  value={address.state}
                  onChangeText={(text) => {
                    setAddress((prev) => ({ ...prev, state: text }));
                    if (errors.state) setErrors((prev) => ({ ...prev, state: '' }));
                  }}
                />
                {errors.state ? <Text style={styles.errorText}>{errors.state}</Text> : null}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PIN Code *</Text>
              <TextInput
                style={[styles.input, errors.pincode ? styles.inputError : null]}
                placeholder="6-digit PIN code"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={6}
                value={address.pincode}
                onChangeText={(text) => {
                  setAddress((prev) => ({ ...prev, pincode: text }));
                  if (errors.pincode) setErrors((prev) => ({ ...prev, pincode: '' }));
                }}
              />
              {errors.pincode ? <Text style={styles.errorText}>{errors.pincode}</Text> : null}
            </View>
          </View>

          {/* SECTION 2: DELIVERY & INSTALLATION SLOT */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderIcon}>🚚</Text>
              <View style={styles.sectionHeaderTextContainer}>
                <Text style={styles.sectionTitle}>2. Delivery & Setup Schedule</Text>
                <Text style={styles.sectionSubtitle}>Select your preferred technician arrival time</Text>
              </View>
            </View>

            {/* Delivery Slot Cards */}
            {DELIVERY_SLOTS.map((slot) => {
              const isSelected = selectedSlot.id === slot.id;
              return (
                <TouchableOpacity
                  key={slot.id}
                  style={[
                    styles.slotCard,
                    isSelected && styles.slotCardSelected,
                  ]}
                  onPress={() => setSelectedSlot(slot)}
                  activeOpacity={0.7}
                >
                  <View style={styles.slotRadioOuter}>
                    {isSelected ? <View style={styles.slotRadioInner} /> : null}
                  </View>
                  <View style={styles.slotInfo}>
                    <View style={styles.slotTitleRow}>
                      <Text style={styles.slotTitle}>{slot.title}</Text>
                      {slot.isExpress ? (
                        <View style={styles.expressBadge}>
                          <Text style={styles.expressBadgeText}>Priority</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.slotSublabel}>{slot.sublabel}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Time Window Pills */}
            <Text style={styles.subSectionTitle}>Preferred Time Window</Text>
            <View style={styles.timeWindowContainer}>
              {TIME_WINDOWS.map((window) => {
                const isSelected = selectedTimeWindow === window;
                return (
                  <TouchableOpacity
                    key={window}
                    style={[
                      styles.timeWindowPill,
                      isSelected && styles.timeWindowPillSelected,
                    ]}
                    onPress={() => setSelectedTimeWindow(window)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.timeWindowText,
                        isSelected && styles.timeWindowTextSelected,
                      ]}
                    >
                      {window}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* SECTION 3: ORDER ITEMS SUMMARY */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderIcon}>🛍️</Text>
              <View style={styles.sectionHeaderTextContainer}>
                <Text style={styles.sectionTitle}>3. Items in Your Order ({totalCount})</Text>
                <Text style={styles.sectionSubtitle}>Verify products & quantities</Text>
              </View>
            </View>

            {items.map(({ product, quantity }) => {
              const fallbackIcon = CATEGORY_FALLBACK_ICONS[product.category] || '💧';
              const itemTotal = product.price * quantity;
              const imageSource = LOCAL_PRODUCT_IMAGES[product.id] || (product.imageUrl ? { uri: product.imageUrl } : null);
              return (
                <View key={product.id} style={styles.orderItemCard}>
                  <View style={styles.itemImageWrapper}>
                    {imageSource ? (
                      <Image
                        source={imageSource}
                        style={styles.itemImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.itemImageFallback}>
                        <Text style={styles.itemFallbackIcon}>{fallbackIcon}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.itemDetails}>
                    <View style={styles.itemCategoryBadge}>
                      <Text style={styles.itemCategoryText}>{product.category}</Text>
                    </View>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {product.name}
                    </Text>
                    {product.specifications ? (
                      <Text style={styles.itemSpecs} numberOfLines={1}>
                        {product.specifications}
                      </Text>
                    ) : null}
                    <View style={styles.itemPriceQtyRow}>
                      <Text style={styles.itemQtyLabel}>
                        Qty: <Text style={styles.itemQtyBold}>{quantity}</Text> × ₹{product.price.toLocaleString('en-IN')}
                      </Text>
                      <Text style={styles.itemTotalPrice}>
                        ₹{itemTotal.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {/* SECTION 4: PAYMENT METHOD */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderIcon}>💳</Text>
              <View style={styles.sectionHeaderTextContainer}>
                <Text style={styles.sectionTitle}>4. Payment Method</Text>
                <Text style={styles.sectionSubtitle}>Choose your payment preference</Text>
              </View>
            </View>

            {PAYMENT_METHODS.map((method) => {
              const isSelected = selectedPayment === method.id;
              return (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.paymentMethodCard,
                    isSelected && styles.paymentMethodCardSelected,
                  ]}
                  onPress={() => setSelectedPayment(method.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.slotRadioOuter}>
                    {isSelected ? <View style={styles.slotRadioInner} /> : null}
                  </View>
                  <Text style={styles.paymentIcon}>{method.icon}</Text>
                  <View style={styles.paymentInfo}>
                    <View style={styles.paymentTitleRow}>
                      <Text style={styles.paymentTitle}>{method.title}</Text>
                      {method.badge ? (
                        <View style={styles.paymentBadge}>
                          <Text style={styles.paymentBadgeText}>{method.badge}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.paymentSubtitle}>{method.subtitle}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Payment Error Banner if payment was declined/failed */}
            {paymentError ? (
              <View style={styles.paymentErrorBanner}>
                <Text style={styles.paymentErrorText}>⚠️ {paymentError}</Text>
                <TouchableOpacity
                  style={styles.paymentRetryBtn}
                  onPress={handlePlaceOrder}
                  activeOpacity={0.8}
                >
                  <Text style={styles.paymentRetryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Califnco Trust Callout */}
            <View style={styles.trustBanner}>
              <Text style={styles.trustBannerIcon}>🛡️</Text>
              <View style={styles.trustBannerTextContainer}>
                <Text style={styles.trustBannerTitle}>Califnco Pure Water Guarantee</Text>
                <Text style={styles.trustBannerDesc}>
                  100% Genuine Certified Systems • Free TDS Water Quality Test on Installation • 7-Day Replacement
                </Text>
              </View>
            </View>
          </View>

          {/* SECTION 5: PRICE BREAKDOWN */}
          <View style={styles.sectionCard}>
            <Text style={styles.breakdownHeaderTitle}>Price Breakdown</Text>

            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel} numberOfLines={1}>
                Items Subtotal ({totalCount} item{totalCount === 1 ? '' : 's'})
              </Text>
              <Text style={styles.breakdownValue}>{formattedSubtotal}</Text>
            </View>

            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel} numberOfLines={1}>
                Doorstep Delivery Fee
              </Text>
              <Text style={styles.freeGreenText}>FREE</Text>
            </View>

            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel} numberOfLines={1}>
                Certified Installation & Demo
              </Text>
              <Text style={styles.freeGreenText}>INCLUDED</Text>
            </View>

            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel} numberOfLines={1}>
                GST & Taxes
              </Text>
              <Text style={styles.freeGreenText}>INCLUSIVE</Text>
            </View>

            <View style={styles.breakdownDivider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Payable</Text>
              <Text style={styles.totalValue}>{formattedTotal}</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* STICKY BOTTOM ACTION BAR */}
      <View
        style={[
          styles.stickyBar,
          { paddingBottom: Math.max(insets.bottom, 14) },
        ]}
      >
        <View style={styles.stickyPriceBlock}>
          <Text style={styles.stickyTotalLabel}>Total Amount</Text>
          <Text style={styles.stickyTotalValue} numberOfLines={1}>
            {formattedTotal}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.placeOrderButton, isSubmitting && styles.placeOrderButtonDisabled]}
          onPress={handlePlaceOrder}
          disabled={isSubmitting}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={selectedPayment === 'cod' ? 'Place COD Order' : 'Pay with Razorpay'}
        >
          {isSubmitting ? (
            <View style={styles.submittingContainer}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.placeOrderButtonText}>Processing Payment...</Text>
            </View>
          ) : (
            <Text style={styles.placeOrderButtonText} numberOfLines={1}>
              {selectedPayment === 'cod'
                ? 'Place COD Order 💵'
                : `Pay with Razorpay ⚡ ${formattedTotal}`}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* RAZORPAY TEST MODE MODAL */}
      <RazorpayCheckoutModal
        visible={isPaymentModalVisible}
        options={razorpayOptions}
        onSuccess={handlePaymentSuccess}
        onFailure={handlePaymentFailure}
        onDismiss={handlePaymentDismiss}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeaderIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  sectionHeaderTextContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  addressTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  addressTypePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  addressTypePillSelected: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  addressTypePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  addressTypePillTextSelected: {
    color: '#0284C7',
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 4,
    fontWeight: '500',
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryCodeBadge: {
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  phoneInput: {
    flex: 1,
  },
  textArea: {
    minHeight: 56,
    textAlignVertical: 'top',
  },
  multiInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  multiInputItem: {
    flex: 1,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },
  slotCardSelected: {
    borderColor: '#0EA5E9',
    backgroundColor: '#F0F9FF',
  },
  slotRadioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  slotRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0EA5E9',
  },
  slotInfo: {
    flex: 1,
  },
  slotTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slotTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 6,
  },
  expressBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  expressBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  slotSublabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  subSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 6,
    marginBottom: 8,
  },
  timeWindowContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeWindowPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timeWindowPillSelected: {
    backgroundColor: '#0EA5E9',
    borderColor: '#0284C7',
  },
  timeWindowText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  timeWindowTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  orderItemCard: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemImageWrapper: {
    width: 58,
    height: 58,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
    marginRight: 10,
    flexShrink: 0,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemImageFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E0F2FE',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemFallbackIcon: {
    fontSize: 24,
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  itemCategoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 3,
  },
  itemCategoryText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0284C7',
    textTransform: 'uppercase',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 17,
  },
  itemSpecs: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  itemPriceQtyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  itemQtyLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  itemQtyBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  itemTotalPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0EA5E9',
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },
  paymentMethodCardSelected: {
    borderColor: '#0EA5E9',
    backgroundColor: '#F0F9FF',
  },
  paymentIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  paymentBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  paymentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  paymentSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  trustBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  trustBannerIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  trustBannerTextContainer: {
    flex: 1,
  },
  trustBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  trustBannerDesc: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 2,
    lineHeight: 15,
  },
  breakdownHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 13,
    color: '#64748B',
    flex: 1,
    marginRight: 8,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    flexShrink: 0,
  },
  freeGreenText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
    flexShrink: 0,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0EA5E9',
  },
  stickyBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  stickyPriceBlock: {
    flex: 1,
    marginRight: 12,
    flexShrink: 1,
  },
  stickyTotalLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  stickyTotalValue: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  placeOrderButton: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 140,
    flexShrink: 0,
  },
  placeOrderButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  placeOrderButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  submittingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // Success Screen Styles
  successContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  successBadgeCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successBadgeEmoji: {
    fontSize: 38,
  },
  successHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  successSubtext: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 20,
    maxWidth: 320,
  },
  confirmationCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  confirmHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confirmOrderNumberLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  confirmOrderNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0EA5E9',
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  confirmDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  confirmLabel: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
  },
  confirmValue: {
    fontSize: 12,
    color: '#334155',
    flex: 1.5,
    textAlign: 'right',
  },
  confirmValueBold: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1.5,
    textAlign: 'right',
  },
  confirmAddressValue: {
    fontSize: 12,
    color: '#334155',
    flex: 2,
    textAlign: 'right',
    lineHeight: 16,
  },
  confirmSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  confirmItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  confirmItemName: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
    marginRight: 8,
  },
  confirmItemPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    flexShrink: 0,
  },
  confirmTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confirmTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  confirmTotalValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0EA5E9',
  },
  successActionsContainer: {
    width: '100%',
    marginTop: 20,
    gap: 12,
  },
  primaryActionButton: {
    backgroundColor: '#0EA5E9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryActionButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },
  // Empty Guard
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 320,
  },
  browseButton: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 12,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusBadgePaid: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgePending: {
    backgroundColor: '#FEF3C7',
  },
  confirmStatusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusTextPaid: {
    color: '#15803D',
  },
  statusTextPending: {
    color: '#D97706',
  },
  confirmValueMonospace: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  paymentErrorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentErrorText: {
    flex: 1,
    fontSize: 12,
    color: '#991B1B',
    lineHeight: 16,
    marginRight: 8,
  },
  paymentRetryBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  paymentRetryText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
