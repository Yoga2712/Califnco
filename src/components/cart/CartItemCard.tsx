import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { CartItem } from '../../types/cart';
import { ProductCategory } from '../../types/product';
import { LOCAL_PRODUCT_IMAGES } from '../../data/productImages';

interface CartItemCardProps {
  item: CartItem;
  onIncrease: (productId: string) => void;
  onDecrease: (productId: string) => void;
  onRemove: (productId: string) => void;
}

const CATEGORY_ICONS: Record<ProductCategory, string> = {
  Purifiers: '🚰',
  Dispensers: '🧊',
  Pumps: '⚡',
  Filters: '🧪',
  Spares: '🔧',
};

export const CartItemCard: React.FC<CartItemCardProps> = ({
  item,
  onIncrease,
  onDecrease,
  onRemove,
}) => {
  const [imageError, setImageError] = useState(false);
  const { product, quantity } = item;

  const itemSubtotal = product.price * quantity;
  const formattedUnitPrice = `₹${product.price.toLocaleString('en-IN')}`;
  const formattedSubtotal = `₹${itemSubtotal.toLocaleString('en-IN')}`;
  const categoryIcon = CATEGORY_ICONS[product.category] || '💧';

  return (
    <View style={styles.card}>
      {/* Top Row: Thumbnail + Info + Remove */}
      <View style={styles.mainRow}>
        {/* Product Thumbnail */}
        <View style={styles.imageWrapper}>
          {!imageError ? (
            <Image
              source={LOCAL_PRODUCT_IMAGES[product.id] || { uri: product.imageUrl }}
              style={styles.image}
              resizeMode="contain"
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={styles.imageFallback}>
              <Text style={styles.fallbackIcon}>{categoryIcon}</Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.infoWrapper}>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>{product.category}</Text>
          </View>
          <Text style={styles.productName} numberOfLines={2}>
            {product.name}
          </Text>
          <Text style={styles.unitPrice} numberOfLines={1}>
            Unit Price: <Text style={styles.unitPriceBold}>{formattedUnitPrice}</Text>
          </Text>
        </View>

        {/* Remove Button */}
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => onRemove(product.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${product.name} from cart`}
        >
          <Text style={styles.removeIcon}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Bottom Row: Quantity Controls & Item Subtotal */}
      <View style={styles.bottomRow}>
        <View style={styles.quantityControls}>
          <TouchableOpacity
            style={[
              styles.quantityButton,
              quantity <= 1 && styles.quantityButtonDisabled,
            ]}
            onPress={() => onDecrease(product.id)}
            disabled={quantity <= 1}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Decrease quantity"
          >
            <Text
              style={[
                styles.quantityButtonText,
                quantity <= 1 && styles.quantityButtonTextDisabled,
              ]}
            >
              −
            </Text>
          </TouchableOpacity>

          <View style={styles.quantityDisplay}>
            <Text style={styles.quantityText}>{quantity}</Text>
          </View>

          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => onIncrease(product.id)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Increase quantity"
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Subtotal Display */}
        <View style={styles.subtotalWrapper}>
          <Text style={styles.subtotalLabel}>Item Subtotal</Text>
          <Text style={styles.subtotalValue} numberOfLines={1}>
            {formattedSubtotal}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  imageWrapper: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    flexShrink: 0,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderRadius: 8,
  },
  fallbackIcon: {
    fontSize: 28,
  },
  infoWrapper: {
    flex: 1,
    marginLeft: 10,
    marginRight: 6,
    justifyContent: 'center',
  },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284C7',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 18,
  },
  unitPrice: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  unitPriceBold: {
    fontWeight: '600',
    color: '#0F172A',
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  removeIcon: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EF4444',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 2,
    flexShrink: 0,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  quantityButtonDisabled: {
    backgroundColor: '#F1F5F9',
  },
  quantityButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  quantityButtonTextDisabled: {
    color: '#CBD5E1',
  },
  quantityDisplay: {
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtotalWrapper: {
    alignItems: 'flex-end',
    flexShrink: 1,
    marginLeft: 8,
  },
  subtotalLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  subtotalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0EA5E9',
    marginTop: 2,
  },
});
