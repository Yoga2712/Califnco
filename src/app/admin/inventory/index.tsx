import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../../components/common/Header';
import { useAuth } from '../../../context/AuthContext';
import { useInventory } from '../../../services/inventoryService';
import { LOCAL_PRODUCT_IMAGES } from '../../../data/productImages';
import { CategoryFilter, Product } from '../../../types/product';

const CATEGORIES: CategoryFilter[] = [
  'All',
  'Purifiers',
  'Dispensers',
  'Pumps',
  'Filters',
  'Spares',
];

export default function AdminInventoryScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const { isAuthenticated, role, switchRoleForTesting } = useAuth();
  const { products, adjustStock, setStock, toggleStockStatus } = useInventory();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All');
  const [healthFilter, setHealthFilter] = useState<'all' | 'low' | 'out' | 'healthy'>('all');
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [directStockInput, setDirectStockInput] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const isAdmin = isAuthenticated && role === 'admin';

  // Computed metrics
  const totalSkus = products.length;
  const outOfStockProducts = products.filter((p) => (p.stockQuantity || 0) === 0 || !p.inStock);
  const lowStockProducts = products.filter(
    (p) => p.inStock && (p.stockQuantity || 0) > 0 && (p.stockQuantity || 0) <= 10
  );
  const healthyProducts = products.filter((p) => p.inStock && (p.stockQuantity || 0) > 10);

  const filteredProducts = products.filter((p) => {
    // Health filter
    const qty = p.stockQuantity || 0;
    if (healthFilter === 'out' && qty > 0 && p.inStock) return false;
    if (healthFilter === 'low' && (qty === 0 || qty > 10 || !p.inStock)) return false;
    if (healthFilter === 'healthy' && (qty <= 10 || !p.inStock)) return false;

    // Category filter
    if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    }

    return true;
  });

  const handleQuickAdjust = (productId: string, productName: string, delta: number) => {
    adjustStock(productId, delta);
    setActionSuccessMsg(`Adjusted "${productName}" by ${delta > 0 ? `+${delta}` : delta} units`);
    setTimeout(() => setActionSuccessMsg(null), 2500);
  };

  const handleSaveDirectStock = (productId: string, productName: string) => {
    const qty = parseInt(directStockInput.replace(/\D/g, ''), 10);
    if (!isNaN(qty)) {
      setStock(productId, qty);
      setEditingStockId(null);
      setActionSuccessMsg(`Stock for "${productName}" set to ${qty} units`);
      setTimeout(() => setActionSuccessMsg(null), 2500);
    }
  };

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <Header title="Inventory Desk" subtitle="Restricted Admin Desk" onBack={() => router.push('/admin')} />
        <View style={styles.unauthCard}>
          <Text style={styles.unauthEmoji}>🔒</Text>
          <Text style={styles.unauthTitle}>Admin Authentication Required</Text>
          <Text style={styles.unauthText}>
            You must be logged in as Califnco Operations Admin to access Inventory Management.
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
        title="Admin Inventory Desk"
        subtitle={`Warehouse Stock Levels • Threshold Alerts & Replenishment`}
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

        {/* Low Stock Warning Alert if any items are low or out */}
        {outOfStockProducts.length > 0 || lowStockProducts.length > 0 ? (
          <View style={styles.alertBanner}>
            <Text style={styles.alertBannerIcon}>⚠️</Text>
            <View style={styles.alertBannerContent}>
              <Text style={styles.alertBannerTitle}>Restocking Required</Text>
              <Text style={styles.alertBannerText}>
                {outOfStockProducts.length} item(s) are completely Out of Stock, and {lowStockProducts.length} item(s) are below the safe threshold of 10 units.
              </Text>
            </View>
          </View>
        ) : null}

        {/* Inventory Stock KPI Grid */}
        <View style={styles.kpiGrid}>
          <TouchableOpacity
            style={[styles.kpiCard, healthFilter === 'all' && styles.kpiCardActive]}
            onPress={() => setHealthFilter('all')}
          >
            <Text style={styles.kpiVal}>{totalSkus}</Text>
            <Text style={styles.kpiLabel}>Total SKUs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.kpiCard, healthFilter === 'healthy' && styles.kpiCardActive]}
            onPress={() => setHealthFilter('healthy')}
          >
            <Text style={[styles.kpiVal, { color: '#059669' }]}>{healthyProducts.length}</Text>
            <Text style={styles.kpiLabel}>Healthy Stock</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.kpiCard, healthFilter === 'low' && styles.kpiCardActive]}
            onPress={() => setHealthFilter('low')}
          >
            <Text style={[styles.kpiVal, { color: '#D97706' }]}>{lowStockProducts.length}</Text>
            <Text style={styles.kpiLabel}>Low Stock (&lt;10)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.kpiCard, healthFilter === 'out' && styles.kpiCardActive]}
            onPress={() => setHealthFilter('out')}
          >
            <Text style={[styles.kpiVal, { color: '#DC2626' }]}>{outOfStockProducts.length}</Text>
            <Text style={styles.kpiLabel}>Out of Stock</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search inventory by product name..."
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

        {/* Category Filter Horizontal Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catScrollContent}>
          {CATEGORIES.map((category) => {
            const isSelected = selectedCategory === category;
            const count = category === 'All' ? products.length : products.filter((p) => p.category === category).length;
            return (
              <TouchableOpacity
                key={category}
                style={[styles.catPill, isSelected && styles.catPillActive]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[styles.catPillText, isSelected && styles.catPillTextActive]}>
                  {category} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Inventory Items List */}
        {filteredProducts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>No Stock Items Found</Text>
            <Text style={styles.emptySub}>No items match your filter criteria.</Text>
          </View>
        ) : (
          filteredProducts.map((product) => {
            const qty = product.stockQuantity || 0;
            const isOutOfStock = qty === 0 || !product.inStock;
            const isLowStock = !isOutOfStock && qty <= 10;
            const isDirectEditing = editingStockId === product.id;

            // Gauge percentage (capped at 50 units for visual representation)
            const gaugePercent = Math.min(100, Math.round((qty / 40) * 100));

            return (
              <View key={product.id} style={styles.stockCard}>
                <View style={styles.stockCardTop}>
                  <Image
                    source={LOCAL_PRODUCT_IMAGES[product.id] || { uri: product.imageUrl }}
                    style={styles.productThumb}
                    resizeMode="contain"
                  />
                  <View style={styles.stockInfoCol}>
                    <View style={styles.tagRow}>
                      <Text style={styles.categoryTag}>{product.category}</Text>
                      {isOutOfStock ? (
                        <View style={styles.outBadge}>
                          <Text style={styles.outBadgeText}>OUT OF STOCK</Text>
                        </View>
                      ) : isLowStock ? (
                        <View style={styles.lowBadge}>
                          <Text style={styles.lowBadgeText}>LOW STOCK ALERT</Text>
                        </View>
                      ) : (
                        <View style={styles.healthyBadge}>
                          <Text style={styles.healthyBadgeText}>HEALTHY</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.productName}>{product.name}</Text>

                    {/* Stock Count Display & Direct Edit */}
                    <View style={styles.stockCountRow}>
                      <Text style={styles.stockCountLabel}>Quantity in Warehouse:</Text>
                      {isDirectEditing ? (
                        <View style={styles.directEditRow}>
                          <TextInput
                            style={styles.directEditInput}
                            value={directStockInput}
                            onChangeText={setDirectStockInput}
                            keyboardType="numeric"
                            autoFocus
                          />
                          <TouchableOpacity
                            style={styles.directSaveBtn}
                            onPress={() => handleSaveDirectStock(product.id, product.name)}
                          >
                            <Text style={styles.directSaveBtnText}>✓</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.directCancelBtn}
                            onPress={() => setEditingStockId(null)}
                          >
                            <Text style={styles.directCancelBtnText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.stockCountClickable}
                          onPress={() => {
                            setEditingStockId(product.id);
                            setDirectStockInput(qty.toString());
                          }}
                        >
                          <Text style={[styles.stockCountVal, isOutOfStock ? styles.colorOut : isLowStock ? styles.colorLow : styles.colorHealthy]}>
                            {qty} units
                          </Text>
                          <Text style={styles.clickToEditText}>✏️</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Visual Progress Gauge */}
                    <View style={styles.gaugeTrack}>
                      <View
                        style={[
                          styles.gaugeFill,
                          {
                            width: `${gaugePercent}%`,
                            backgroundColor: isOutOfStock ? '#DC2626' : isLowStock ? '#F59E0B' : '#10B981',
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>

                {/* Quick Stock Adjustment Bar */}
                <View style={styles.adjustBar}>
                  <Text style={styles.adjustBarLabel}>Quick Adjust:</Text>
                  <View style={styles.adjustButtons}>
                    <TouchableOpacity
                      style={[styles.adjBtn, styles.adjMinus]}
                      onPress={() => handleQuickAdjust(product.id, product.name, -5)}
                    >
                      <Text style={styles.adjBtnMinusText}>-5</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.adjBtn, styles.adjMinus]}
                      onPress={() => handleQuickAdjust(product.id, product.name, -1)}
                    >
                      <Text style={styles.adjBtnMinusText}>-1</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.adjBtn, styles.adjPlus]}
                      onPress={() => handleQuickAdjust(product.id, product.name, +1)}
                    >
                      <Text style={styles.adjBtnPlusText}>+1</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.adjBtn, styles.adjPlus]}
                      onPress={() => handleQuickAdjust(product.id, product.name, +5)}
                    >
                      <Text style={styles.adjBtnPlusText}>+5</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.adjBtn, styles.adjPlusBig]}
                      onPress={() => handleQuickAdjust(product.id, product.name, +10)}
                    >
                      <Text style={styles.adjBtnPlusText}>+10</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.toggleStockBtn}
                    onPress={() => toggleStockStatus(product.id)}
                  >
                    <Text style={styles.toggleStockBtnText}>
                      {product.inStock ? 'Mark Out' : 'Mark In'}
                    </Text>
                  </TouchableOpacity>
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
    marginBottom: 14,
  },
  successBannerText: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  alertBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    alignItems: 'center',
    gap: 12,
  },
  alertBannerIcon: {
    fontSize: 24,
  },
  alertBannerContent: {
    flex: 1,
  },
  alertBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B45309',
  },
  alertBannerText: {
    fontSize: 12,
    color: '#92400E',
    marginTop: 2,
    lineHeight: 16,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  kpiCardActive: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  kpiVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  kpiLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
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
    height: 44,
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
  catScroll: {
    marginBottom: 14,
  },
  catScrollContent: {
    gap: 8,
  },
  catPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  catPillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  catPillText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  catPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
  stockCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stockCardTop: {
    flexDirection: 'row',
    gap: 12,
  },
  productThumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  stockInfoCol: {
    flex: 1,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  categoryTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  outBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  outBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DC2626',
  },
  lowBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lowBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D97706',
  },
  healthyBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  healthyBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 18,
  },
  stockCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 6,
  },
  stockCountLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  stockCountClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stockCountVal: {
    fontSize: 14,
    fontWeight: '800',
  },
  colorHealthy: {
    color: '#059669',
  },
  colorLow: {
    color: '#D97706',
  },
  colorOut: {
    color: '#DC2626',
  },
  clickToEditText: {
    fontSize: 12,
  },
  directEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  directEditInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#0284C7',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 12,
    fontWeight: '700',
    width: 50,
    textAlign: 'center',
    color: '#0F172A',
  },
  directSaveBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
  },
  directSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  directCancelBtn: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
  },
  directCancelBtnText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
  },
  gaugeTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 3,
  },
  adjustBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexWrap: 'wrap',
    gap: 8,
  },
  adjustBarLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  adjustButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  adjBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    minWidth: 32,
    alignItems: 'center',
  },
  adjMinus: {
    backgroundColor: '#FEF2F2',
  },
  adjBtnMinusText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
  },
  adjPlus: {
    backgroundColor: '#F0F9FF',
  },
  adjPlusBig: {
    backgroundColor: '#E0F2FE',
  },
  adjBtnPlusText: {
    color: '#0284C7',
    fontSize: 11,
    fontWeight: '700',
  },
  toggleStockBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  toggleStockBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
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
  },
  unauthText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginVertical: 12,
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
