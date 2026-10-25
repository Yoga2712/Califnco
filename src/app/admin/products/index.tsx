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
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../../components/common/Header';
import { useAuth } from '../../../context/AuthContext';
import { useInventory } from '../../../services/inventoryService';
import { LOCAL_PRODUCT_IMAGES } from '../../../data/productImages';
import { CategoryFilter, Product, ProductCategory } from '../../../types/product';

const CATEGORIES: CategoryFilter[] = [
  'All',
  'Purifiers',
  'Dispensers',
  'Pumps',
  'Filters',
  'Spares',
];

export default function AdminProductsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const { isAuthenticated, role, switchRoleForTesting } = useAuth();
  const { products, updatePricing, toggleStockStatus, addProduct } = useInventory();

  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPriceProductId, setEditingPriceProductId] = useState<string | null>(null);
  const [newRetailPrice, setNewRetailPrice] = useState('');
  const [newWholesalePrice, setNewWholesalePrice] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // New Product Form State
  const [newProdName, setNewProdName] = useState('');
  const [newProdCat, setNewProdCat] = useState<ProductCategory>('Purifiers');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdWholesale, setNewProdWholesale] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdSpecs, setNewProdSpecs] = useState('');
  const [newProdStock, setNewProdStock] = useState('20');

  const isAdmin = isAuthenticated && role === 'admin';

  const filteredProducts = products.filter((p) => {
    if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = p.name.toLowerCase().includes(q);
      const matchDesc = p.description.toLowerCase().includes(q);
      const matchSpecs = p.specifications?.toLowerCase().includes(q) || false;
      return matchName || matchDesc || matchSpecs;
    }
    return true;
  });

  const handleStartEditPrice = (product: Product) => {
    setEditingPriceProductId(product.id);
    setNewRetailPrice(product.price.toString());
    setNewWholesalePrice(product.wholesalePrice.toString());
  };

  const handleSavePrice = (productId: string) => {
    const priceNum = parseInt(newRetailPrice.replace(/\D/g, ''), 10);
    const wholesaleNum = parseInt(newWholesalePrice.replace(/\D/g, ''), 10);

    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid retail price.');
      return;
    }
    if (isNaN(wholesaleNum) || wholesaleNum <= 0) {
      Alert.alert('Invalid Wholesale Price', 'Please enter a valid wholesale price.');
      return;
    }

    updatePricing(productId, priceNum, wholesaleNum);
    setEditingPriceProductId(null);
    setActionSuccessMsg('Pricing updated successfully!');
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const handleCreateProduct = () => {
    if (!newProdName.trim() || !newProdPrice.trim() || !newProdWholesale.trim()) {
      Alert.alert('Missing Fields', 'Please enter product name, retail price, and wholesale price.');
      return;
    }

    const price = parseInt(newProdPrice.replace(/\D/g, ''), 10);
    const wholesalePrice = parseInt(newProdWholesale.replace(/\D/g, ''), 10);
    const stockQty = parseInt(newProdStock.replace(/\D/g, ''), 10) || 15;

    const newProd: Product = {
      id: `prod-${Date.now()}`,
      name: newProdName.trim(),
      category: newProdCat,
      price,
      wholesalePrice,
      originalPrice: Math.round(price * 1.25),
      description: newProdDesc.trim() || 'High-performance water treatment solution engineered for pure hydration.',
      specifications: newProdSpecs.trim() || 'Standard Califnco Commercial Specs',
      imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80',
      rating: 4.8,
      reviewCount: 1,
      inStock: stockQty > 0,
      stockQuantity: stockQty,
    };

    addProduct(newProd);
    setIsAddModalOpen(false);
    // Reset form
    setNewProdName('');
    setNewProdPrice('');
    setNewProdWholesale('');
    setNewProdDesc('');
    setNewProdSpecs('');
    setActionSuccessMsg(`Product "${newProd.name}" added to catalog!`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <Header title="Product Management" subtitle="Restricted Admin Desk" onBack={() => router.push('/admin')} />
        <View style={styles.unauthCard}>
          <Text style={styles.unauthEmoji}>🔒</Text>
          <Text style={styles.unauthTitle}>Admin Authentication Required</Text>
          <Text style={styles.unauthText}>
            You must be logged in as Califnco Operations Admin to access Product Management.
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
        title="Admin Product Catalog"
        subtitle={`Managing ${products.length} Califnco SKUs & Wholesale Pricing`}
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

        {/* Top Control Bar */}
        <View style={styles.topControlBar}>
          <View style={styles.metricsSummary}>
            <Text style={styles.metricItem}>
              <Text style={styles.metricVal}>{products.length}</Text> SKUs
            </Text>
            <Text style={styles.metricDot}>•</Text>
            <Text style={styles.metricItem}>
              <Text style={[styles.metricVal, { color: '#059669' }]}>
                {products.filter((p) => p.inStock).length}
              </Text> In Stock
            </Text>
            <Text style={styles.metricDot}>•</Text>
            <Text style={styles.metricItem}>
              <Text style={[styles.metricVal, { color: '#DC2626' }]}>
                {products.filter((p) => !p.inStock).length}
              </Text> Out of Stock
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addNewProdBtn}
            onPress={() => setIsAddModalOpen(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.addNewProdBtnText}>+ Add New SKU</Text>
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search products by name, specifications, or category..."
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

        {/* Category Horizontal Pills */}
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

        {/* Product Cards List */}
        {filteredProducts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>No Products Found</Text>
            <Text style={styles.emptySub}>No products match your search or filter selection.</Text>
          </View>
        ) : (
          filteredProducts.map((product) => {
            const isEditingPrice = editingPriceProductId === product.id;

            return (
              <View key={product.id} style={styles.productCard}>
                <View style={styles.productCardTop}>
                  <Image
                    source={LOCAL_PRODUCT_IMAGES[product.id] || { uri: product.imageUrl }}
                    style={styles.productImage}
                    resizeMode="contain"
                  />
                  <View style={styles.productInfoCol}>
                    <View style={styles.catBadgeRow}>
                      <View style={styles.catBadge}>
                        <Text style={styles.catBadgeText}>{product.category.toUpperCase()}</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.stockToggleBadge, product.inStock ? styles.stockIn : styles.stockOut]}
                        onPress={() => toggleStockStatus(product.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.stockToggleText, product.inStock ? styles.stockInText : styles.stockOutText]}>
                          {product.inStock ? '✓ IN STOCK' : '✕ OUT OF STOCK'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.productName}>{product.name}</Text>
                    {product.specifications ? (
                      <Text style={styles.productSpecs} numberOfLines={2}>{product.specifications}</Text>
                    ) : null}

                    {/* Pricing View / Edit Row */}
                    {isEditingPrice ? (
                      <View style={styles.editPriceBox}>
                        <View style={styles.editPriceRow}>
                          <View style={styles.editField}>
                            <Text style={styles.editLabel}>Retail Price (₹)</Text>
                            <TextInput
                              style={styles.editInput}
                              value={newRetailPrice}
                              onChangeText={setNewRetailPrice}
                              keyboardType="numeric"
                            />
                          </View>
                          <View style={styles.editField}>
                            <Text style={styles.editLabel}>Wholesale (₹)</Text>
                            <TextInput
                              style={styles.editInput}
                              value={newWholesalePrice}
                              onChangeText={setNewWholesalePrice}
                              keyboardType="numeric"
                            />
                          </View>
                        </View>
                        <View style={styles.editBtnRow}>
                          <TouchableOpacity
                            style={styles.savePriceBtn}
                            onPress={() => handleSavePrice(product.id)}
                          >
                            <Text style={styles.savePriceBtnText}>Save</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.cancelPriceBtn}
                            onPress={() => setEditingPriceProductId(null)}
                          >
                            <Text style={styles.cancelPriceBtnText}>Cancel</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.pricingRow}>
                        <View style={styles.priceTag}>
                          <Text style={styles.priceLabel}>Retail:</Text>
                          <Text style={styles.retailPriceVal}>₹{product.price.toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={styles.priceTag}>
                          <Text style={styles.priceLabel}>Wholesale:</Text>
                          <Text style={styles.wholesalePriceVal}>₹{product.wholesalePrice.toLocaleString('en-IN')}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.editPriceLink}
                          onPress={() => handleStartEditPrice(product)}
                        >
                          <Text style={styles.editPriceLinkText}>✏️ Edit Price</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>

                {/* Stock Quantity & Quick Adjust Row */}
                <View style={styles.stockFooter}>
                  <Text style={styles.stockQtyLabel}>
                    Current Stock: <Text style={styles.boldQty}>{product.stockQuantity || 0}</Text> units
                  </Text>
                  <TouchableOpacity
                    style={styles.inventoryDeskLink}
                    onPress={() => router.push('/admin/inventory' as unknown as any)}
                  >
                    <Text style={styles.inventoryDeskLinkText}>Manage in Inventory Desk →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add New Product Modal */}
      <Modal visible={isAddModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Califnco Product</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalInputLabel}>Product Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Califnco Commercial High-Flow RO System"
                value={newProdName}
                onChangeText={setNewProdName}
              />

              <Text style={styles.modalInputLabel}>Category *</Text>
              <View style={styles.catSelectRow}>
                {(['Purifiers', 'Dispensers', 'Pumps', 'Filters', 'Spares'] as ProductCategory[]).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catSelectPill, newProdCat === cat && styles.catSelectPillActive]}
                    onPress={() => setNewProdCat(cat)}
                  >
                    <Text style={[styles.catSelectPillText, newProdCat === cat && styles.catSelectPillTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalRowInputs}>
                <View style={styles.modalHalfInput}>
                  <Text style={styles.modalInputLabel}>Retail Price (₹) *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. 14999"
                    keyboardType="numeric"
                    value={newProdPrice}
                    onChangeText={setNewProdPrice}
                  />
                </View>
                <View style={styles.modalHalfInput}>
                  <Text style={styles.modalInputLabel}>Wholesale Price (₹) *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. 10499"
                    keyboardType="numeric"
                    value={newProdWholesale}
                    onChangeText={setNewProdWholesale}
                  />
                </View>
              </View>

              <Text style={styles.modalInputLabel}>Initial Stock Quantity</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 20"
                keyboardType="numeric"
                value={newProdStock}
                onChangeText={setNewProdStock}
              />

              <Text style={styles.modalInputLabel}>Description</Text>
              <TextInput
                style={[styles.modalInput, styles.modalMultilineInput]}
                placeholder="Key benefits and water treatment details..."
                multiline
                numberOfLines={3}
                value={newProdDesc}
                onChangeText={setNewProdDesc}
              />

              <Text style={styles.modalInputLabel}>Technical Specifications</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 8-Stage RO + UV • 15L/hr Flow • 10L Storage"
                value={newProdSpecs}
                onChangeText={setNewProdSpecs}
              />

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleCreateProduct}
                activeOpacity={0.8}
              >
                <Text style={styles.modalSubmitBtnText}>Add Product to Catalog 🚰</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  topControlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  metricsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricItem: {
    fontSize: 12,
    color: '#64748B',
  },
  metricVal: {
    fontWeight: '800',
    color: '#0F172A',
  },
  metricDot: {
    color: '#CBD5E1',
    fontSize: 12,
  },
  addNewProdBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  addNewProdBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  productCardTop: {
    flexDirection: 'row',
    gap: 14,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  productInfoCol: {
    flex: 1,
  },
  catBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  catBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  stockToggleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stockIn: {
    backgroundColor: '#ECFDF5',
  },
  stockOut: {
    backgroundColor: '#FEF2F2',
  },
  stockToggleText: {
    fontSize: 10,
    fontWeight: '800',
  },
  stockInText: {
    color: '#059669',
  },
  stockOutText: {
    color: '#DC2626',
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 19,
  },
  productSpecs: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  retailPriceVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  wholesalePriceVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563EB',
  },
  editPriceLink: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  editPriceLinkText: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '700',
  },
  editPriceBox: {
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  editPriceRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  editField: {
    flex: 1,
  },
  editLabel: {
    fontSize: 10,
    color: '#475569',
    marginBottom: 2,
  },
  editInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    color: '#0F172A',
  },
  editBtnRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'flex-end',
  },
  savePriceBtn: {
    backgroundColor: '#059669',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  savePriceBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  cancelPriceBtn: {
    backgroundColor: '#E2E8F0',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  cancelPriceBtnText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
  },
  stockFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  stockQtyLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  boldQty: {
    fontWeight: '800',
    color: '#0F172A',
  },
  inventoryDeskLink: {
    paddingVertical: 2,
  },
  inventoryDeskLinkText: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '700',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 540,
    maxHeight: '90%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseIcon: {
    fontSize: 18,
    color: '#94A3B8',
    padding: 4,
  },
  modalForm: {
    flex: 1,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
  },
  modalMultilineInput: {
    height: 60,
    textAlignVertical: 'top',
  },
  catSelectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  catSelectPill: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  catSelectPillActive: {
    backgroundColor: '#0284C7',
  },
  catSelectPillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  catSelectPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalRowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  modalHalfInput: {
    flex: 1,
  },
  modalSubmitBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
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
