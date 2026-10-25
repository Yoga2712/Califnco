import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../../components/common/Header';
import { CartItemCard } from '../../../components/cart/CartItemCard';
import { useCart } from '../../../services/cartService';

export default function CustomerCart() {
  const insets = useSafeAreaInsets();
  const {
    items,
    totalCount,
    subtotal,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  // Navigation back to /customer/products
  const handleBackToProducts = () => {
    router.push('/customer/products');
  };

  const handleProceedToCheckout = () => {
    if (items.length === 0) {
      Alert.alert('Your Cart is Empty', 'Please add products before checking out.');
      return;
    }
    router.push('/customer/checkout');
  };

  const formattedSubtotal = `₹${subtotal.toLocaleString('en-IN')}`;
  const formattedTotal = `₹${subtotal.toLocaleString('en-IN')}`;

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Text style={styles.emptyIcon}>🛒</Text>
      </View>
      <Text style={styles.emptyTitle}>Your Cart is Empty</Text>
      <Text style={styles.emptySubtitle}>
        Looks like you haven't added any pure water purifiers, dispensers, or spare parts yet.
      </Text>
      <TouchableOpacity
        style={styles.browseButton}
        onPress={handleBackToProducts}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Browse Products"
      >
        <Text style={styles.browseButtonText}>Browse Products</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.summaryBar}>
      <Text style={styles.summaryCount}>
        {totalCount} item{totalCount === 1 ? '' : 's'} in cart
      </Text>
      {items.length > 0 ? (
        <TouchableOpacity
          onPress={clearCart}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.clearCartText}>Clear All</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const renderFooter = () => {
    if (items.length === 0) return null;

    return (
      <View style={styles.breakdownCard}>
        <Text style={styles.breakdownTitle}>Order Summary</Text>

        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel} numberOfLines={1}>
            Subtotal ({totalCount} item{totalCount === 1 ? '' : 's'})
          </Text>
          <Text style={styles.breakdownValue} numberOfLines={1}>{formattedSubtotal}</Text>
        </View>

        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel} numberOfLines={1}>Delivery Fee</Text>
          <Text style={styles.freeDeliveryText} numberOfLines={1}>FREE</Text>
        </View>

        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel} numberOfLines={1}>Installation Support</Text>
          <Text style={styles.freeDeliveryText} numberOfLines={1}>Included</Text>
        </View>

        <View style={styles.breakdownDivider} />

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel} numberOfLines={1}>Total Payable</Text>
          <Text style={styles.totalValue} numberOfLines={1}>{formattedTotal}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Reusable Header with explicit back navigation to /customer/products */}
      <Header
        title="My Cart"
        subtitle={items.length > 0 ? `${totalCount} item${totalCount === 1 ? '' : 's'} added` : undefined}
        onBack={handleBackToProducts}
      />

      {items.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(item) => item.product.id}
            renderItem={({ item }) => (
              <CartItemCard
                item={item}
                onIncrease={increaseQuantity}
                onDecrease={decreaseQuantity}
                onRemove={removeFromCart}
              />
            )}
            ListHeaderComponent={renderHeader}
            ListFooterComponent={renderFooter}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />

          {/* Sticky Bottom Checkout Bar with safe-area spacing */}
          <View
            style={[
              styles.checkoutBar,
              { paddingBottom: Math.max(insets.bottom, 14) },
            ]}
          >
            <View style={styles.checkoutPriceBlock}>
              <Text style={styles.checkoutTotalLabel}>Total Amount</Text>
              <Text style={styles.checkoutTotalValue} numberOfLines={1}>
                {formattedTotal}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.checkoutButton}
              onPress={handleProceedToCheckout}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Proceed to Checkout"
            >
              <Text style={styles.checkoutButtonText} numberOfLines={1}>
                Proceed to Checkout →
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  summaryCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  clearCartText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
  },
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
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
  breakdownTitle: {
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
  freeDeliveryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
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
    flex: 1,
    marginRight: 8,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0EA5E9',
    flexShrink: 0,
  },
  checkoutBar: {
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
  checkoutPriceBlock: {
    flex: 1,
    marginRight: 12,
    flexShrink: 1,
  },
  checkoutTotalLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  checkoutTotalValue: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  checkoutButton: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  checkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
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
