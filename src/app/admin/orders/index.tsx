import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  useWindowDimensions,
  Linking,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../../components/common/Header';
import { useAuth } from '../../../context/AuthContext';
import { useOrders, getOrderStatusInfo } from '../../../services/orderService';
import { LOCAL_PRODUCT_IMAGES } from '../../../data/productImages';
import { Order, OrderStatus } from '../../../types/order';

const STATUS_FILTERS: { label: string; value: 'all' | OrderStatus }[] = [
  { label: 'All Orders', value: 'all' },
  { label: 'Placed', value: 'placed' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Processing', value: 'processing' },
  { label: 'Out for Delivery', value: 'out_for_delivery' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
];

export default function AdminOrdersScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const { isAuthenticated, role, switchRoleForTesting } = useAuth();
  const { orders, updateOrderStatus } = useOrders();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | OrderStatus>('all');
  const [channelFilter, setChannelFilter] = useState<'all' | 'retail' | 'dealer'>('all');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const isAdmin = isAuthenticated && role === 'admin';

  // Filtered orders list
  const filteredOrders = orders.filter((order) => {
    // Channel filter
    if (channelFilter === 'retail' && order.isDealerOrder) return false;
    if (channelFilter === 'dealer' && !order.isDealerOrder) return false;

    // Status filter
    if (selectedStatus !== 'all' && order.status !== selectedStatus) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchOrderNum = order.orderNumber.toLowerCase().includes(q);
      const matchName = order.shippingAddress.fullName.toLowerCase().includes(q);
      const matchPhone = order.shippingAddress.phoneNumber.toLowerCase().includes(q);
      const matchCompany = order.dealerCompanyName?.toLowerCase().includes(q) || false;
      const matchCity = order.shippingAddress.city.toLowerCase().includes(q);
      return matchOrderNum || matchName || matchPhone || matchCompany || matchCity;
    }

    return true;
  });

  const handleStatusTransition = async (orderId: string, orderNumber: string, nextStatus: OrderStatus) => {
    const doUpdate = async () => {
      await updateOrderStatus(orderId, nextStatus);
      setActionSuccessMsg(`Order #${orderNumber} transitioned to "${nextStatus.replace(/_/g, ' ').toUpperCase()}"`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Are you sure you want to transition Order #${orderNumber} to "${nextStatus.replace(/_/g, ' ').toUpperCase()}"? This will notify the customer via FCM & update tracking.`
      );
      if (confirmed) {
        await doUpdate();
      }
    } else {
      Alert.alert(
        'Confirm Status Update',
        `Transition Order #${orderNumber} to "${nextStatus.replace(/_/g, ' ').toUpperCase()}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Update', onPress: () => void doUpdate() },
        ]
      );
    }
  };

  const openMapForAddress = (order: Order) => {
    const query = `${order.shippingAddress.addressLine}, ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.pincode}`;
    const mapUrl = `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`;
    void Linking.openURL(mapUrl);
  };

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <Header title="Order Management" subtitle="Restricted Admin Desk" onBack={() => router.push('/admin')} />
        <View style={styles.unauthCard}>
          <Text style={styles.unauthEmoji}>🔒</Text>
          <Text style={styles.unauthTitle}>Admin Authentication Required</Text>
          <Text style={styles.unauthText}>
            You must be logged in as Califnco Operations Admin to access Order Management.
          </Text>
          <TouchableOpacity
            style={styles.unauthBtn}
            onPress={() => {
              switchRoleForTesting('admin');
              router.push('/admin');
            }}
          >
            <Text style={styles.unauthBtnText}>⚡ 1-Tap Login as Admin</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Admin Order Desk"
        subtitle={`Total ${orders.length} Orders • Real-time Firestore Sync`}
        onBack={() => router.push('/admin')}
      />

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.contentContainer,
          isWide && styles.wideContainer,
          { paddingBottom: Math.max(insets.bottom, 24) + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {actionSuccessMsg ? (
          <View style={styles.successBanner}>
            <Text style={styles.successBannerText}>✓ {actionSuccessMsg}</Text>
          </View>
        ) : null}

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Order #, Customer, Phone, or City..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.clearSearchIcon}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Channel Filter Pills */}
        <View style={styles.channelRow}>
          <TouchableOpacity
            style={[styles.channelPill, channelFilter === 'all' && styles.channelPillActive]}
            onPress={() => setChannelFilter('all')}
          >
            <Text style={[styles.channelPillText, channelFilter === 'all' && styles.channelPillTextActive]}>
              All Channels ({orders.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.channelPill, channelFilter === 'retail' && styles.channelPillActive]}
            onPress={() => setChannelFilter('retail')}
          >
            <Text style={[styles.channelPillText, channelFilter === 'retail' && styles.channelPillTextActive]}>
              🛍️ Retail Customers ({orders.filter((o) => !o.isDealerOrder).length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.channelPill, channelFilter === 'dealer' && styles.channelPillActive]}
            onPress={() => setChannelFilter('dealer')}
          >
            <Text style={[styles.channelPillText, channelFilter === 'dealer' && styles.channelPillTextActive]}>
              🏢 Dealer Wholesale ({orders.filter((o) => o.isDealerOrder).length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Status Filter Horizontal Scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusFiltersScroll} contentContainerStyle={styles.statusFiltersContent}>
          {STATUS_FILTERS.map((filter) => {
            const count =
              filter.value === 'all'
                ? orders.length
                : orders.filter((o) => o.status === filter.value).length;
            const isSelected = selectedStatus === filter.value;
            return (
              <TouchableOpacity
                key={filter.value}
                style={[styles.statusFilterBtn, isSelected && styles.statusFilterBtnActive]}
                onPress={() => setSelectedStatus(filter.value)}
              >
                <Text style={[styles.statusFilterBtnText, isSelected && styles.statusFilterBtnTextActive]}>
                  {filter.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Order Count Summary */}
        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>
            Showing <Text style={styles.summaryBold}>{filteredOrders.length}</Text> orders
          </Text>
        </View>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>No Orders Match Your Filters</Text>
            <Text style={styles.emptySub}>Try adjusting your search query or status filter.</Text>
          </View>
        ) : (
          filteredOrders.map((order) => {
            const statusInfo = getOrderStatusInfo(order.status);
            const isExpanded = expandedOrderId === order.id;

            return (
              <View key={order.id} style={styles.orderCard}>
                {/* Order Top Bar */}
                <View style={styles.orderTopBar}>
                  <View style={styles.orderIdentityRow}>
                    <Text style={styles.orderNumberText}>#{order.orderNumber}</Text>
                    {order.isDealerOrder ? (
                      <View style={styles.dealerPill}>
                        <Text style={styles.dealerPillText}>🏢 DEALER B2B</Text>
                      </View>
                    ) : (
                      <View style={styles.retailPill}>
                        <Text style={styles.retailPillText}>🛍️ RETAIL</Text>
                      </View>
                    )}
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: statusInfo.badgeBg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusInfo.badgeTextColor }]}>
                      {statusInfo.label}
                    </Text>
                  </View>
                </View>

                {/* Customer & Destination Row */}
                <View style={styles.customerRow}>
                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>
                      {order.isDealerOrder && order.dealerCompanyName
                        ? `${order.dealerCompanyName} (${order.shippingAddress.fullName})`
                        : order.shippingAddress.fullName}
                    </Text>
                    <Text style={styles.customerContact}>
                      📞 {order.shippingAddress.phoneNumber} • {order.shippingAddress.city}, {order.shippingAddress.state}
                    </Text>
                    <Text style={styles.orderDate}>
                      Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>

                  <View style={styles.amountBox}>
                    <Text style={styles.orderAmount}>₹{order.totalAmount.toLocaleString('en-IN')}</Text>
                    <View style={styles.paymentBadge}>
                      <Text style={styles.paymentBadgeText}>
                        {order.paymentMethod.toUpperCase()} • {order.paymentStatus.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Items Preview */}
                <View style={styles.itemsPreview}>
                  <Text style={styles.itemsSummaryHeading}>
                    Items ({order.totalCount} total units):
                  </Text>
                  {order.items.slice(0, isExpanded ? order.items.length : 2).map((item, idx) => (
                    <View key={`${item.product.id}-${idx}`} style={styles.itemRow}>
                      <Image
                        source={LOCAL_PRODUCT_IMAGES[item.product.id] || { uri: item.product.imageUrl }}
                        style={styles.itemThumb}
                        resizeMode="contain"
                      />
                      <View style={styles.itemDetails}>
                        <Text style={styles.itemName} numberOfLines={1}>{item.product.name}</Text>
                        <Text style={styles.itemQtyPricing}>
                          Qty: <Text style={styles.boldQty}>{item.quantity}</Text> × ₹{item.unitPrice.toLocaleString('en-IN')}
                        </Text>
                      </View>
                      <Text style={styles.itemSubtotal}>₹{item.subtotal.toLocaleString('en-IN')}</Text>
                    </View>
                  ))}

                  {order.items.length > 2 && !isExpanded ? (
                    <TouchableOpacity
                      onPress={() => setExpandedOrderId(order.id)}
                      style={styles.expandBtn}
                    >
                      <Text style={styles.expandBtnText}>+ View {order.items.length - 2} more item(s)</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Expanded Details Section */}
                {isExpanded ? (
                  <View style={styles.expandedSection}>
                    <View style={styles.addressBox}>
                      <View style={styles.addressHeaderRow}>
                        <Text style={styles.addressBoxTitle}>📍 Delivery & Installation Address</Text>
                        <TouchableOpacity
                          style={styles.mapLinkBtn}
                          onPress={() => openMapForAddress(order)}
                        >
                          <Text style={styles.mapLinkBtnText}>Open in Map ↗</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.addressLineText}>{order.shippingAddress.addressLine}</Text>
                      {order.shippingAddress.landmark ? (
                        <Text style={styles.addressLandmarkText}>Landmark: {order.shippingAddress.landmark}</Text>
                      ) : null}
                      <Text style={styles.addressCityPinText}>
                        {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode} ({order.shippingAddress.addressType})
                      </Text>
                    </View>

                    {order.paymentId ? (
                      <View style={styles.paymentInfoBox}>
                        <Text style={styles.paymentIdLabel}>Razorpay Payment ID:</Text>
                        <Text style={styles.paymentIdValue}>{order.paymentId}</Text>
                      </View>
                    ) : null}

                    {order.deliverySlot ? (
                      <View style={styles.slotInfoBox}>
                        <Text style={styles.slotLabel}>Slot:</Text>
                        <Text style={styles.slotValue}>{order.deliverySlot.title} • {order.deliverySlot.timeWindow}</Text>
                      </View>
                    ) : null}

                    <TouchableOpacity
                      onPress={() => setExpandedOrderId(null)}
                      style={styles.collapseBtn}
                    >
                      <Text style={styles.collapseBtnText}>Collapse Details ▴</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => setExpandedOrderId(order.id)}
                    style={styles.detailsToggle}
                  >
                    <Text style={styles.detailsToggleText}>View Address & Fulfillment Details ▾</Text>
                  </TouchableOpacity>
                )}

                {/* Status Transition Action Buttons */}
                <View style={styles.actionButtonBar}>
                  {order.status === 'placed' ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.btnConfirm]}
                      onPress={() => void handleStatusTransition(order.id, order.orderNumber, 'confirmed')}
                    >
                      <Text style={styles.actionBtnText}>1. Confirm Order 📦</Text>
                    </TouchableOpacity>
                  ) : null}

                  {order.status === 'confirmed' ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.btnProcessing]}
                      onPress={() => void handleStatusTransition(order.id, order.orderNumber, 'processing')}
                    >
                      <Text style={styles.actionBtnText}>2. Mark Tested & Packed ⚙️</Text>
                    </TouchableOpacity>
                  ) : null}

                  {order.status === 'processing' ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.btnDispatch]}
                      onPress={() => void handleStatusTransition(order.id, order.orderNumber, 'out_for_delivery')}
                    >
                      <Text style={styles.actionBtnText}>3. Dispatch Out for Delivery 🚚</Text>
                    </TouchableOpacity>
                  ) : null}

                  {order.status === 'out_for_delivery' ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.btnDelivered]}
                      onPress={() => void handleStatusTransition(order.id, order.orderNumber, 'delivered')}
                    >
                      <Text style={styles.actionBtnText}>4. Mark Delivered & Setup ✅</Text>
                    </TouchableOpacity>
                  ) : null}

                  {order.status !== 'delivered' && order.status !== 'cancelled' ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.btnCancel]}
                      onPress={() => void handleStatusTransition(order.id, order.orderNumber, 'cancelled')}
                    >
                      <Text style={styles.btnCancelText}>Cancel ✕</Text>
                    </TouchableOpacity>
                  ) : null}

                  {order.status === 'delivered' ? (
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedBadgeText}>✓ Order Fulfilled & Installed</Text>
                    </View>
                  ) : null}

                  {order.status === 'cancelled' ? (
                    <View style={styles.cancelledBadge}>
                      <Text style={styles.cancelledBadgeText}>✕ Order Cancelled</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollArea: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  wideContainer: {
    maxWidth: 920,
    width: '100%',
    alignSelf: 'center',
  },
  successBanner: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#6EE7B7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  successBannerText: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  clearSearchIcon: {
    fontSize: 14,
    color: '#94A3B8',
    padding: 4,
  },
  channelRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  channelPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  channelPillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  channelPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  channelPillTextActive: {
    color: '#FFFFFF',
  },
  statusFiltersScroll: {
    marginBottom: 14,
  },
  statusFiltersContent: {
    gap: 8,
  },
  statusFilterBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  statusFilterBtnActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  statusFilterBtnText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  statusFilterBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 13,
    color: '#64748B',
  },
  summaryBold: {
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  orderTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  orderIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderNumberText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  dealerPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dealerPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563EB',
  },
  retailPill: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  retailPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9333EA',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  customerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
    gap: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  customerContact: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  orderDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  amountBox: {
    alignItems: 'flex-end',
  },
  orderAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  paymentBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
  },
  paymentBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
  },
  itemsPreview: {
    marginBottom: 10,
  },
  itemsSummaryHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  itemThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  itemQtyPricing: {
    fontSize: 11,
    color: '#64748B',
  },
  boldQty: {
    fontWeight: '700',
    color: '#0F172A',
  },
  itemSubtotal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  expandBtn: {
    paddingVertical: 4,
  },
  expandBtnText: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '700',
  },
  detailsToggle: {
    paddingVertical: 6,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  detailsToggleText: {
    fontSize: 12,
    color: '#0284C7',
    fontWeight: '600',
  },
  expandedSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  addressBox: {
    marginBottom: 8,
  },
  addressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  addressBoxTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  mapLinkBtn: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  mapLinkBtnText: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '700',
  },
  addressLineText: {
    fontSize: 12,
    color: '#334155',
  },
  addressLandmarkText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  addressCityPinText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  paymentInfoBox: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  paymentIdLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  paymentIdValue: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  slotInfoBox: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  slotLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  slotValue: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  collapseBtn: {
    marginTop: 8,
    alignItems: 'center',
  },
  collapseBtnText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  actionButtonBar: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    minWidth: 140,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnConfirm: {
    backgroundColor: '#0284C7',
  },
  btnProcessing: {
    backgroundColor: '#D97706',
  },
  btnDispatch: {
    backgroundColor: '#7C3AED',
  },
  btnDelivered: {
    backgroundColor: '#059669',
  },
  btnCancel: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    flex: 0,
    minWidth: 80,
  },
  btnCancelText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  completedBadge: {
    backgroundColor: '#ECFDF5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  completedBadgeText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },
  cancelledBadge: {
    backgroundColor: '#FEF2F2',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  cancelledBadgeText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  unauthCard: {
    margin: 24,
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  unauthEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  unauthTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  unauthText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  unauthBtn: {
    backgroundColor: '#D97706',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  unauthBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
