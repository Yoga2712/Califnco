import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../../components/common/Header';
import { useOrders, getOrderStatusInfo } from '../../../services/orderService';
import { OrderStatusTimeline } from '../../../components/order/OrderStatusTimeline';
import { LOCAL_PRODUCT_IMAGES } from '../../../data/productImages';
import { OrderItem } from '../../../types/order';

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getOrderById } = useOrders();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const isWide = width >= 768;
  const orderId = Array.isArray(id) ? id[0] : id;
  const order = orderId ? getOrderById(orderId) : undefined;

  // Render Order Not Found State
  if (!order) {
    return (
      <View style={styles.container}>
        <Header
          title="Order Details"
          onBack={() => router.push('/customer/orders')}
        />
        <View style={styles.notFoundContainer}>
          <View style={styles.notFoundIconCircle}>
            <Text style={styles.notFoundIcon}>🔍</Text>
          </View>
          <Text style={styles.notFoundTitle}>Order Not Found</Text>
          <Text style={styles.notFoundSubtitle}>
            We couldn't locate any order matching reference "{orderId || 'Unknown'}". It may have been archived or entered incorrectly.
          </Text>
          <TouchableOpacity
            style={styles.backToOrdersBtn}
            onPress={() => router.push('/customer/orders')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Return to My Orders"
          >
            <Text style={styles.backToOrdersText}>← Back to My Orders</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const statusInfo = getOrderStatusInfo(order.status);
  const formattedOrderDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const paymentLabel =
    order.paymentMethod === 'cod'
      ? 'Cash / UPI on Delivery'
      : order.paymentMethod === 'upi'
      ? 'Instant UPI'
      : order.paymentMethod === 'card'
      ? 'Credit / Debit Card'
      : 'Net Banking';

  const handleCallSupport = () => {
    void Linking.openURL('tel:1800123456');
  };

  return (
    <View style={styles.container}>
      <Header
        title={`Order #${order.orderNumber}`}
        subtitle={`Placed on ${new Date(order.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`}
        onBack={() => router.push('/customer/orders')}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          isWide && styles.wideContentWrapper,
          { paddingBottom: Math.max(insets.bottom, 24) + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Order Overview Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIdContainer}>
              <Text style={styles.heroLabel}>ORDER REFERENCE</Text>
              <Text style={styles.heroOrderNumber}>{order.orderNumber}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.badgeBg }]}>
              <View style={[styles.statusDot, { backgroundColor: statusInfo.indicatorColor }]} />
              <Text style={[styles.statusBadgeText, { color: statusInfo.badgeTextColor }]}>
                {statusInfo.label}
              </Text>
            </View>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroDetailsGrid}>
            <View style={styles.heroGridItem}>
              <Text style={styles.heroGridLabel}>Order Placed</Text>
              <Text style={styles.heroGridValue}>{formattedOrderDate}</Text>
            </View>
            <View style={styles.heroGridItem}>
              <Text style={styles.heroGridLabel}>Scheduled Setup</Text>
              <Text style={styles.heroGridValueBold}>
                {order.estimatedDeliveryDate} ({order.deliverySlot.timeWindow})
              </Text>
            </View>
          </View>

          <View style={styles.deliverySlotBanner}>
            <Text style={styles.deliverySlotEmoji}>🚚</Text>
            <View style={styles.deliverySlotInfo}>
              <Text style={styles.deliverySlotTitle}>
                {order.deliverySlot.title} • {order.deliverySlot.timeWindow}
              </Text>
              <Text style={styles.deliverySlotSub}>
                {order.deliverySlot.isExpress
                  ? '⚡ Express Delivery & Technician Dispatch'
                  : 'Standard Delivery & Free Installation Included'}
              </Text>
            </View>
          </View>
        </View>

        {/* Visual Order Status Timeline */}
        <View style={styles.sectionMargin}>
          <OrderStatusTimeline
            currentStatus={order.status}
            estimatedDeliveryDate={order.estimatedDeliveryDate}
            deliverySlotWindow={order.deliverySlot.timeWindow}
          />
        </View>

        {/* Items Ordered Section */}
        <View style={[styles.sectionCard, styles.sectionMargin]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeading}>Items Ordered ({order.totalCount})</Text>
            <Text style={styles.sectionSubBadge}>Genuine Califnco</Text>
          </View>

          <View style={styles.itemsList}>
            {order.items.map((orderItem: OrderItem, index: number) => {
              const localImg = LOCAL_PRODUCT_IMAGES[orderItem.product.id];
              const isLastItem = index === order.items.length - 1;

              return (
                <View
                  key={orderItem.product.id}
                  style={[styles.itemCard, !isLastItem && styles.itemCardBorder]}
                >
                  <View style={styles.itemImageWrapper}>
                    {localImg ? (
                      <Image
                        source={localImg}
                        style={styles.itemImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.itemImageFallback}>
                        <Text style={styles.itemFallbackEmoji}>💧</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.itemDetails}>
                    <Text style={styles.itemCategoryTag}>{orderItem.product.category}</Text>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {orderItem.product.name}
                    </Text>

                    <View style={styles.itemPricingRow}>
                      <Text style={styles.itemQuantityLabel}>
                        Qty: <Text style={styles.itemQuantityValue}>{orderItem.quantity}</Text> × ₹{orderItem.unitPrice.toLocaleString('en-IN')}
                      </Text>
                      <Text style={styles.itemSubtotalText}>
                        ₹{orderItem.subtotal.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Shipping & Installation Address Card */}
        <View style={[styles.sectionCard, styles.sectionMargin]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeading}>Installation & Delivery Address</Text>
            <View style={styles.addressTypeBadge}>
              <Text style={styles.addressTypeBadgeText}>{order.shippingAddress.addressType}</Text>
            </View>
          </View>

          <View style={styles.addressBody}>
            <View style={styles.addressIconCircle}>
              <Text style={styles.addressPinIcon}>📍</Text>
            </View>
            <View style={styles.addressTextContent}>
              <Text style={styles.addressRecipient}>
                {order.shippingAddress.fullName}
              </Text>
              <Text style={styles.addressPhone}>
                📞 {order.shippingAddress.phoneNumber}
              </Text>
              <Text style={styles.addressLine}>
                {order.shippingAddress.addressLine}
              </Text>
              {order.shippingAddress.landmark ? (
                <Text style={styles.addressLandmark}>
                  Landmark: {order.shippingAddress.landmark}
                </Text>
              ) : null}
              <Text style={styles.addressCityState}>
                {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
              </Text>

              <TouchableOpacity
                style={{
                  marginTop: 8,
                  alignSelf: 'flex-start',
                  backgroundColor: '#E0F2FE',
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 6,
                }}
                onPress={() => {
                  const q = `${order.shippingAddress.addressLine}, ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.pincode}`;
                  void Linking.openURL(`https://www.openstreetmap.org/search?query=${encodeURIComponent(q)}`);
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#0284C7' }}>
                  🗺️ View Delivery Location on Map ↗
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.technicianNotice}>
            <Text style={styles.technicianNoticeIcon}>🔧</Text>
            <Text style={styles.technicianNoticeText}>
              Califnco Certified Technician will verify your inlet water pressure & raw water TDS before installation.
            </Text>
          </View>
        </View>

        {/* Payment & Price Breakdown */}
        <View style={[styles.sectionCard, styles.sectionMargin]}>
          <Text style={styles.sectionHeading}>Bill & Payment Details</Text>

          <View style={styles.billRows}>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Items Subtotal ({order.totalCount} items)</Text>
              <Text style={styles.billValue}>₹{order.subtotal.toLocaleString('en-IN')}</Text>
            </View>

            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Delivery & Freight</Text>
              <Text style={styles.billFreeValue}>FREE</Text>
            </View>

            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Certified Technician Setup</Text>
              <Text style={styles.billFreeValue}>FREE</Text>
            </View>

            <View style={styles.billDivider} />

            <View style={styles.billTotalRow}>
              <View>
                <Text style={styles.billTotalLabel}>Total Amount</Text>
                <Text style={styles.billPaymentMode}>
                  {order.paymentMethod === 'cod' ? 'Cash / Pay on Setup' : `Paid via ${paymentLabel}`}
                </Text>
              </View>
              <Text style={styles.billTotalValue}>
                ₹{order.totalAmount.toLocaleString('en-IN')}
              </Text>
            </View>

            {/* Razorpay Test Mode Payment Details */}
            <View style={styles.billPaymentInfoRow}>
              <View
                style={[
                  styles.billPaymentBadge,
                  order.paymentStatus === 'paid'
                    ? styles.billBadgePaid
                    : styles.billBadgePending,
                ]}
              >
                <Text
                  style={[
                    styles.billPaymentBadgeText,
                    order.paymentStatus === 'paid'
                      ? styles.billTextPaid
                      : styles.billTextPending,
                  ]}
                >
                  {order.paymentStatus === 'paid'
                    ? 'PAID (Razorpay Test Mode)'
                    : 'PENDING ON DELIVERY'}
                </Text>
              </View>

              {order.paymentId ? (
                <Text style={styles.billPaymentIdText}>
                  ID: {order.paymentId}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Califnco Support Card */}
        <View style={[styles.supportCard, styles.sectionMargin]}>
          <View style={styles.supportHeader}>
            <Text style={styles.supportIcon}>💬</Text>
            <View style={styles.supportHeaderText}>
              <Text style={styles.supportTitle}>Need Help with this Order?</Text>
              <Text style={styles.supportSubtitle}>
                Our water filtration specialists and field engineers are here to assist.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.supportButton}
            onPress={handleCallSupport}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Call Califnco Customer Care"
          >
            <Text style={styles.supportButtonText}>📞 Call Califnco Support (Toll-Free)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
  },
  wideContentWrapper: {
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroIdContainer: {
    flex: 1,
    marginRight: 8,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  heroOrderNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0EA5E9',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  heroDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  heroDetailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  heroGridItem: {
    flex: 1,
    minWidth: 140,
  },
  heroGridLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  heroGridValue: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '600',
    marginTop: 3,
  },
  heroGridValueBold: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
    marginTop: 3,
  },
  deliverySlotBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  deliverySlotEmoji: {
    fontSize: 22,
    marginRight: 10,
  },
  deliverySlotInfo: {
    flex: 1,
  },
  deliverySlotTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369A1',
  },
  deliverySlotSub: {
    fontSize: 11,
    color: '#0284C7',
    marginTop: 2,
  },
  sectionMargin: {
    marginTop: 16,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSubBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0EA5E9',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  itemsList: {},
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  itemCardBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemImageWrapper: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 12,
  },
  itemImage: {
    width: '90%',
    height: '90%',
  },
  itemImageFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
  },
  itemFallbackEmoji: {
    fontSize: 24,
  },
  itemDetails: {
    flex: 1,
  },
  itemCategoryTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 2,
    lineHeight: 18,
  },
  itemPricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  itemQuantityLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  itemQuantityValue: {
    fontWeight: '700',
    color: '#0F172A',
  },
  itemSubtotalText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0EA5E9',
  },
  addressTypeBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  addressTypeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  addressBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  addressPinIcon: {
    fontSize: 18,
  },
  addressTextContent: {
    flex: 1,
  },
  addressRecipient: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  addressPhone: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0EA5E9',
    marginTop: 3,
  },
  addressLine: {
    fontSize: 13,
    color: '#334155',
    marginTop: 4,
    lineHeight: 18,
  },
  addressLandmark: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  addressCityState: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 4,
  },
  technicianNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  technicianNoticeIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  technicianNoticeText: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '500',
    flex: 1,
    lineHeight: 16,
  },
  billRows: {
    marginTop: 8,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  billLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  billValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  billFreeValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  billDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  billTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  billTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  billPaymentMode: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  billTotalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0EA5E9',
  },
  billPaymentInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  billPaymentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  billBadgePaid: {
    backgroundColor: '#DCFCE7',
  },
  billBadgePending: {
    backgroundColor: '#FEF3C7',
  },
  billPaymentBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  billTextPaid: {
    color: '#15803D',
  },
  billTextPending: {
    color: '#D97706',
  },
  billPaymentIdText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  supportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  supportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  supportIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  supportHeaderText: {
    flex: 1,
  },
  supportTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  supportSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  supportButton: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  supportButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284C7',
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  notFoundIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  notFoundIcon: {
    fontSize: 36,
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  notFoundSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 320,
  },
  backToOrdersBtn: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backToOrdersText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
