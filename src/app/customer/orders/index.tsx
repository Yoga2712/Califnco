import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  Image,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Header } from '../../../components/common/Header';
import { useOrders, getOrderStatusInfo } from '../../../services/orderService';
import { Order } from '../../../types/order';
import { LOCAL_PRODUCT_IMAGES } from '../../../data/productImages';

export default function CustomerOrdersScreen() {
  const { orders, fetchOrdersFromFirestore } = useOrders();
  const [refreshing, setRefreshing] = useState(false);
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  useEffect(() => {
    void fetchOrdersFromFirestore();
  }, [fetchOrdersFromFirestore]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrdersFromFirestore();
    setRefreshing(false);
  };

  const handleOrderPress = (orderId: string) => {
    router.push({
      pathname: '/customer/orders/[id]',
      params: { id: orderId },
    });
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Text style={styles.emptyIcon}>📦</Text>
      </View>
      <Text style={styles.emptyTitle}>No Orders Yet</Text>
      <Text style={styles.emptySubtitle}>
        You haven't placed any water purifier, dispenser, or filter orders yet.
      </Text>
      <TouchableOpacity
        style={styles.browseButton}
        onPress={() => router.push('/customer/products')}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Browse Water Products"
      >
        <Text style={styles.browseButtonText}>Browse Products 💧</Text>
      </TouchableOpacity>
    </View>
  );

  const renderOrderItem = ({ item }: { item: Order }) => {
    const formattedDate = new Date(item.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const statusInfo = getOrderStatusInfo(item.status);

    const paymentLabel =
      item.paymentMethod === 'cod'
        ? 'Cash / UPI on Delivery'
        : item.paymentMethod === 'upi'
        ? 'Instant UPI'
        : item.paymentMethod === 'card'
        ? 'Card Payment'
        : 'Net Banking';

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => handleOrderPress(item.id)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Order ${item.orderNumber}, status ${statusInfo.label}`}
      >
        {/* Header Row: Order Number & Status */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderNumberLabel}>Order ID</Text>
            <Text style={styles.orderNumber}>{item.orderNumber}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.badgeBg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusInfo.indicatorColor }]} />
            <Text style={[styles.statusText, { color: statusInfo.badgeTextColor }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        <Text style={styles.orderDate}>Placed on {formattedDate}</Text>

        <View style={styles.divider} />

        {/* Items List with Thumbnails */}
        <View style={styles.itemsSection}>
          {item.items.map((orderItem) => {
            const localImg = LOCAL_PRODUCT_IMAGES[orderItem.product.id];
            return (
              <View key={orderItem.product.id} style={styles.itemRow}>
                <View style={styles.itemThumbContainer}>
                  {localImg ? (
                    <Image
                      source={localImg}
                      style={styles.itemThumb}
                      resizeMode="contain"
                    />
                  ) : (
                    <Text style={styles.itemThumbEmoji}>💧</Text>
                  )}
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {orderItem.quantity} × {orderItem.product.name}
                  </Text>
                  <Text style={styles.itemCategory}>{orderItem.product.category}</Text>
                </View>
                <Text style={styles.itemPrice}>
                  ₹{orderItem.subtotal.toLocaleString('en-IN')}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.divider} />

        {/* Schedule & Address Footer */}
        <View style={styles.detailsRow}>
          <Text style={styles.detailsLabel}>Delivery & Setup:</Text>
          <Text style={styles.detailsValueBold}>
            {item.estimatedDeliveryDate} • {item.deliverySlot.timeWindow}
          </Text>
        </View>

        <View style={styles.detailsRow}>
          <Text style={styles.detailsLabel}>Destination:</Text>
          <Text style={styles.detailsValue} numberOfLines={1}>
            {item.shippingAddress.addressLine}, {item.shippingAddress.city}
          </Text>
        </View>

        <View style={styles.detailsRow}>
          <Text style={styles.detailsLabel}>Payment Mode:</Text>
          <View style={styles.paymentRowValue}>
            <Text style={styles.detailsValue}>{paymentLabel}</Text>
            <View
              style={[
                styles.payBadge,
                item.paymentStatus === 'paid' ? styles.payBadgePaid : styles.payBadgePending,
              ]}
            >
              <Text
                style={[
                  styles.payBadgeText,
                  item.paymentStatus === 'paid' ? styles.payTextPaid : styles.payTextPending,
                ]}
              >
                {item.paymentStatus === 'paid' ? 'PAID' : 'PENDING'}
              </Text>
            </View>
          </View>
        </View>

        {item.paymentId ? (
          <View style={styles.detailsRow}>
            <Text style={styles.detailsLabel}>Payment ID:</Text>
            <Text style={styles.paymentIdValue} numberOfLines={1}>
              {item.paymentId}
            </Text>
          </View>
        ) : null}

        {/* Card Footer: Total & Track CTA */}
        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>
              ₹{item.totalAmount.toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.trackActionBtn}>
            <Text style={styles.trackActionText}>Track Order →</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="My Orders"
        subtitle={
          orders.length > 0
            ? `${orders.length} order${orders.length === 1 ? '' : 's'} recorded`
            : undefined
        }
        onBack={() => router.push('/customer')}
      />

      {orders.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderItem}
          contentContainerStyle={[
            styles.listContent,
            isWide && styles.wideListContent,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#0EA5E9"
              colors={['#0EA5E9']}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  listContent: {
    padding: 16,
    paddingBottom: 36,
  },
  wideListContent: {
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  orderCard: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumberLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0EA5E9',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  orderDate: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  itemsSection: {
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemThumbContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  itemThumb: {
    width: '90%',
    height: '90%',
  },
  itemThumbEmoji: {
    fontSize: 16,
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  itemCategory: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 0,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailsLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  detailsValue: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  detailsValueBold: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  totalValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0EA5E9',
    marginTop: 1,
  },
  paymentRowValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  payBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  payBadgePaid: {
    backgroundColor: '#DCFCE7',
  },
  payBadgePending: {
    backgroundColor: '#FEF3C7',
  },
  payBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  payTextPaid: {
    color: '#15803D',
  },
  payTextPending: {
    color: '#D97706',
  },
  paymentIdValue: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#0284C7',
    fontWeight: '700',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trackActionBtn: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  trackActionText: {
    color: '#0284C7',
    fontSize: 12,
    fontWeight: '700',
  },
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
});