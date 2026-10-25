import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Header } from '../../../components/common/Header';
import { ProductCard } from '../../../components/product/ProductCard';
import { productService } from '../../../services/productService';
import { useCart } from '../../../services/cartService';
import { CategoryFilter, Product } from '../../../types/product';

const CATEGORIES: CategoryFilter[] = [
  'All',
  'Purifiers',
  'Dispensers',
  'Pumps',
  'Filters',
  'Spares',
];

export default function CustomerProducts() {
  const { width } = useWindowDimensions();
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Responsive column calculation: 2 columns on mobile (>= 310px), 3 columns on tablet/desktop (>= 768px)
  const isTabletOrDesktop = width >= 768;
  const isExtremelyNarrow = width < 310;
  const numColumns = isExtremelyNarrow ? 1 : isTabletOrDesktop ? 3 : 2;

  // Shared cart state connecting Products to Cart
  const { totalCount: totalCartCount, addToCart, getItemQuantity } = useCart();
  const [lastAddedName, setLastAddedName] = useState<string | null>(null);

  const fetchProducts = useCallback(async (category: CategoryFilter, isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const data = await productService.getProducts(category);
      setProducts(data);
    } catch (err) {
      setError('Unable to load products. Please check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts(selectedCategory);
  }, [selectedCategory, fetchProducts]);

  const handleCategorySelect = (category: CategoryFilter) => {
    if (category === selectedCategory) return;
    setSelectedCategory(category);
  };

  const handleRefresh = () => {
    fetchProducts(selectedCategory, true);
  };

  const handleAddToCart = (product: Product) => {
    addToCart(product);
    setLastAddedName(product.name);

    // Hide toast banner after 2.5 seconds
    setTimeout(() => {
      setLastAddedName((current) => (current === product.name ? null : current));
    }, 2500);
  };

  const renderHeader = () => (
    <View style={styles.listHeader}>
      {/* Category Filter Pills */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Filter by Category</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryPill,
                  isSelected && styles.categoryPillActive,
                ]}
                onPress={() => handleCategorySelect(cat)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    isSelected && styles.categoryPillTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Catalog Stats / Summary Bar */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>
          {loading
            ? 'Loading catalog...'
            : `Showing ${products.length} product${products.length === 1 ? '' : 's'}`}
        </Text>
        {selectedCategory !== 'All' ? (
          <TouchableOpacity
            onPress={() => handleCategorySelect('All')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.clearFilterText}>Reset filter</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  const renderEmptyState = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🔍</Text>
        <Text style={styles.emptyTitle}>No Products Found</Text>
        <Text style={styles.emptySubtitle}>
          We couldn't find any products in "{selectedCategory}". Try choosing another category.
        </Text>
        <TouchableOpacity
          style={styles.emptyResetButton}
          onPress={() => handleCategorySelect('All')}
          activeOpacity={0.8}
        >
          <Text style={styles.emptyResetButtonText}>View All Products</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
      <Text style={styles.errorSubtitle}>{error}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={() => fetchProducts(selectedCategory)}
        activeOpacity={0.8}
      >
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Reusable Header with interactive Cart button */}
      <Header
        title="Water Products"
        subtitle="Pure water systems & original spares"
        onBack={() => router.push('/customer')}
        rightAction={
          <TouchableOpacity
            style={styles.cartIconContainer}
            onPress={() => router.push('/customer/cart')}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`Shopping cart with ${totalCartCount} items`}
          >
            <Text style={styles.cartIcon}>🛒</Text>
            {totalCartCount > 0 ? (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{totalCartCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        }
      />

      {/* User Feedback Toast Banner */}
      {lastAddedName ? (
        <View style={styles.toastBanner}>
          <Text style={styles.toastCheck}>✓</Text>
          <Text style={styles.toastText} numberOfLines={1}>
            Added to cart: {lastAddedName}
          </Text>
        </View>
      ) : null}

      {/* Main Content */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0EA5E9" />
          <Text style={styles.loadingText}>Fetching water products...</Text>
        </View>
      ) : error ? (
        renderErrorState()
      ) : (
        <View style={styles.gridWrapper}>
          <FlatList
            key={`grid-${numColumns}`}
            data={products}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
            renderItem={({ item }) => (
              <View style={[styles.gridItem, { maxWidth: `${100 / numColumns}%` }]}>
                <ProductCard
                  product={item}
                  onAddToCart={handleAddToCart}
                  cartQuantity={getItemQuantity(item.id)}
                />
              </View>
            )}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#0EA5E9']}
                tintColor="#0EA5E9"
              />
            }
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  gridWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
  },
  listContent: {
    paddingBottom: 36,
  },
  columnWrapper: {
    paddingHorizontal: 12,
    gap: 10,
    justifyContent: 'space-between',
  },
  gridItem: {
    flex: 1,
  },
  listHeader: {
    marginBottom: 8,
  },
  filterSection: {
    paddingTop: 14,
    paddingBottom: 6,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: 14,
    marginBottom: 8,
  },
  categoriesContainer: {
    paddingHorizontal: 14,
    paddingBottom: 8,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryPillActive: {
    backgroundColor: '#0EA5E9',
    borderColor: '#0284C7',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  summaryText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  clearFilterText: {
    fontSize: 12,
    color: '#0EA5E9',
    fontWeight: '600',
    flexShrink: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyResetButton: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyResetButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  cartIconContainer: {
    position: 'relative',
    padding: 4,
  },
  cartIcon: {
    fontSize: 22,
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  toastBanner: {
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  toastCheck: {
    color: '#10B981',
    fontWeight: '900',
    fontSize: 16,
    marginRight: 8,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
});