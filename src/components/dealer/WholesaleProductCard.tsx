import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Product } from '../../types/product';
import { LOCAL_PRODUCT_IMAGES } from '../../data/productImages';
import { useDealerCart } from '../../services/dealerCartService';

export interface WholesaleProductCardProps {
  product: Product;
  onAddedFeedback?: (productName: string, quantity: number) => void;
}

export function WholesaleProductCard({
  product,
  onAddedFeedback,
}: WholesaleProductCardProps) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const { addBulkItem, getItemQuantity } = useDealerCart();

  const [selectedBulkQty, setSelectedBulkQty] = useState<number>(5);
  const currentInCart = getItemQuantity(product.id);

  const localImg = LOCAL_PRODUCT_IMAGES[product.id];
  const marginSavings = Math.max(0, product.price - product.wholesalePrice);
  const marginPercent = Math.round((marginSavings / product.price) * 100);

  const handleAdd = () => {
    addBulkItem(product, selectedBulkQty);
    if (onAddedFeedback) {
      onAddedFeedback(product.name, selectedBulkQty);
    }
  };

  return (
    <View style={[styles.card, isTablet && styles.tabletCard]}>
      {/* Top badges: Category & Margin Profit */}
      <View style={styles.topRow}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{product.category}</Text>
        </View>
        <View style={styles.marginBadge}>
          <Text style={styles.marginText}>+{marginPercent}% MARGIN</Text>
        </View>
      </View>

      {/* Product Image */}
      <View style={styles.imageContainer}>
        {localImg ? (
          <Image
            source={localImg}
            style={styles.image}
            resizeMode="contain"
            accessibilityLabel={product.name}
          />
        ) : (
          <View style={styles.fallbackIcon}>
            <Text style={styles.fallbackEmoji}>💧</Text>
          </View>
        )}
      </View>

      {/* Product Title & Specs */}
      <View style={styles.detailsContainer}>
        <Text style={styles.title} numberOfLines={2}>
          {product.name}
        </Text>
        {product.specifications ? (
          <Text style={styles.specs} numberOfLines={1}>
            {product.specifications}
          </Text>
        ) : null}

        {/* Pricing Matrix */}
        <View style={styles.pricingBox}>
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.wholesalePriceLabel}>WHOLESALE RATE</Text>
              <Text style={styles.wholesalePrice}>
                ₹{product.wholesalePrice.toLocaleString('en-IN')}
                <Text style={styles.unitText}> / unit</Text>
              </Text>
            </View>
            <View style={styles.retailCompareBox}>
              <Text style={styles.retailLabel}>Retail MRP</Text>
              <Text style={styles.retailPrice}>
                ₹{product.price.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>

          <View style={styles.profitBanner}>
            <Text style={styles.profitBannerText}>
              Profit: ₹{marginSavings.toLocaleString('en-IN')} / unit
            </Text>
          </View>
        </View>

        {/* Stock & MOQ Info */}
        <View style={styles.metaRow}>
          <Text style={styles.moqText}>MOQ: 5 units</Text>
          <View style={styles.stockBadge}>
            <View
              style={[
                styles.stockDot,
                { backgroundColor: product.inStock ? '#10B981' : '#EF4444' },
              ]}
            />
            <Text
              style={[
                styles.stockText,
                { color: product.inStock ? '#047857' : '#B91C1C' },
              ]}
            >
              {product.inStock
                ? `${product.stockQuantity} in factory stock`
                : 'Out of Stock'}
            </Text>
          </View>
        </View>

        {/* Bulk Quantity Presets */}
        <View style={styles.qtyPresetRow}>
          <Text style={styles.qtyLabel}>Bulk Qty:</Text>
          {[5, 10, 20, 50].map((qty) => (
            <TouchableOpacity
              key={qty}
              style={[
                styles.qtyBtn,
                selectedBulkQty === qty && styles.qtyBtnActive,
              ]}
              onPress={() => setSelectedBulkQty(qty)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.qtyBtnText,
                  selectedBulkQty === qty && styles.qtyBtnTextActive,
                ]}
              >
                {qty}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Add to Bulk Cart Button */}
        <TouchableOpacity
          style={[
            styles.addBtn,
            !product.inStock && styles.addBtnDisabled,
          ]}
          onPress={handleAdd}
          disabled={!product.inStock}
          activeOpacity={0.8}
        >
          <Text style={styles.addBtnText}>
            + Add {selectedBulkQty} Units • ₹
            {(product.wholesalePrice * selectedBulkQty).toLocaleString('en-IN')}
          </Text>
        </TouchableOpacity>

        {currentInCart > 0 ? (
          <Text style={styles.inCartNote}>
            ✓ {currentInCart} units already in wholesale order sheet
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 16,
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
  tabletCard: {
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
  },
  marginBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  marginText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  imageContainer: {
    width: '100%',
    height: 150,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  image: {
    width: '90%',
    height: '90%',
  },
  fallbackIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackEmoji: {
    fontSize: 48,
  },
  detailsContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 20,
    marginBottom: 4,
  },
  specs: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 10,
  },
  pricingBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    padding: 10,
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 6,
  },
  wholesalePriceLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  wholesalePrice: {
    fontSize: 18,
    fontWeight: '900',
    color: '#047857',
  },
  unitText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  retailCompareBox: {
    alignItems: 'flex-end',
  },
  retailLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
  },
  retailPrice: {
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  profitBanner: {
    backgroundColor: '#DCFCE7',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  profitBannerText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  moqText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  stockText: {
    fontSize: 11,
    fontWeight: '600',
  },
  qtyPresetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  qtyLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginRight: 4,
  },
  qtyBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnActive: {
    borderColor: '#0284C7',
    backgroundColor: '#0284C7',
  },
  qtyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  qtyBtnTextActive: {
    color: '#FFFFFF',
  },
  addBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  inCartNote: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
  },
});
