import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ImageSourcePropType,
} from 'react-native';
import { Product, ProductCategory } from '../../types/product';
import { LOCAL_PRODUCT_IMAGES } from '../../data/productImages';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  cartQuantity?: number;
}

// Category visual fallback metadata
const CATEGORY_VISUALS: Record<
  ProductCategory,
  { icon: string; label: string; bgColor: string; borderColor: string; textColor: string }
> = {
  Purifiers: {
    icon: '🚰',
    label: 'RO Water Purifier',
    bgColor: '#F0F9FF',
    borderColor: '#BAE6FD',
    textColor: '#0284C7',
  },
  Dispensers: {
    icon: '🧊',
    label: 'Water Dispenser',
    bgColor: '#ECFEFF',
    borderColor: '#A5F3FC',
    textColor: '#0891B2',
  },
  Pumps: {
    icon: '⚡',
    label: 'RO Booster Pump',
    bgColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    textColor: '#4F46E5',
  },
  Filters: {
    icon: '🧪',
    label: 'Filter Cartridge',
    bgColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    textColor: '#16A34A',
  },
  Spares: {
    icon: '🔧',
    label: 'Purifier Spare',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
    textColor: '#D97706',
  },
};

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  cartQuantity = 0,
}) => {
  const [imageError, setImageError] = useState(false);
  const [isAddedFeedback, setIsAddedFeedback] = useState(false);

  const handleAddToCart = () => {
    if (!product.inStock) return;
    setIsAddedFeedback(true);
    onAddToCart(product);
    setTimeout(() => {
      setIsAddedFeedback(false);
    }, 1200);
  };

  const formattedPrice = `₹${product.price.toLocaleString('en-IN')}`;
  const formattedOriginalPrice = product.originalPrice
    ? `₹${product.originalPrice.toLocaleString('en-IN')}`
    : null;

  const categoryVisual = CATEGORY_VISUALS[product.category] || CATEGORY_VISUALS.Purifiers;

  // Resolve verified local studio image or fallback to remote URI
  const imageSource: ImageSourcePropType | null =
    LOCAL_PRODUCT_IMAGES[product.id] ||
    (product.imageUrl ? { uri: product.imageUrl } : null);

  return (
    <View style={styles.card}>
      {/* Product Image Area with Badges */}
      <View style={styles.imageContainer}>
        {!imageError && imageSource ? (
          <Image
            source={imageSource}
            style={styles.image}
            resizeMode="contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <View
            style={[
              styles.imageFallback,
              { backgroundColor: categoryVisual.bgColor, borderColor: categoryVisual.borderColor },
            ]}
          >
            <Text style={styles.fallbackIcon}>{categoryVisual.icon}</Text>
            <Text style={[styles.fallbackLabel, { color: categoryVisual.textColor }]} numberOfLines={1}>
              {categoryVisual.label}
            </Text>
          </View>
        )}

        {/* Top Floating Badges */}
        <View style={styles.badgeRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText} numberOfLines={1}>
              {product.category}
            </Text>
          </View>

          <View
            style={[
              styles.stockBadge,
              product.inStock ? styles.inStockBadge : styles.outOfStockBadge,
            ]}
          >
            <Text
              style={[
                styles.stockBadgeText,
                product.inStock ? styles.inStockText : styles.outOfStockText,
              ]}
              numberOfLines={1}
            >
              {product.inStock ? 'In Stock' : 'Out of Stock'}
            </Text>
          </View>
        </View>
      </View>

      {/* Card Content */}
      <View style={styles.content}>
        {/* Rating Row */}
        <View style={styles.ratingRow}>
          <Text style={styles.starIcon}>★</Text>
          <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
          <Text style={styles.reviewCount} numberOfLines={1}>
            ({product.reviewCount})
          </Text>
        </View>

        {/* Product Title */}
        <Text style={styles.title} numberOfLines={2}>
          {product.name}
        </Text>

        {/* Specifications */}
        {product.specifications ? (
          <Text style={styles.specs} numberOfLines={1}>
            {product.specifications}
          </Text>
        ) : null}

        {/* Price Row */}
        <View style={styles.priceContainer}>
          <Text style={styles.price} numberOfLines={1}>
            {formattedPrice}
          </Text>
          {formattedOriginalPrice ? (
            <Text style={styles.originalPrice} numberOfLines={1}>
              {formattedOriginalPrice}
            </Text>
          ) : null}
        </View>

        {/* Full-width Add to Cart Button */}
        <TouchableOpacity
          style={[
            styles.addButton,
            !product.inStock && styles.disabledButton,
            isAddedFeedback && styles.addedButton,
          ]}
          onPress={handleAddToCart}
          disabled={!product.inStock}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Add ${product.name} to cart`}
        >
          <Text
            style={[
              styles.addButtonText,
              !product.inStock && styles.disabledButtonText,
              isAddedFeedback && styles.addedButtonText,
            ]}
            numberOfLines={1}
          >
            {!product.inStock
              ? 'Unavailable'
              : isAddedFeedback
              ? 'Added ✓'
              : cartQuantity > 0
              ? `Add More (${cartQuantity})`
              : '+ Add to Cart'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
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
  imageContainer: {
    width: '100%',
    aspectRatio: 1.05,
    maxHeight: 160,
    backgroundColor: '#F8FAFC',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    width: '90%',
    height: '90%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
  },
  fallbackIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  fallbackLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  badgeRow: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    backgroundColor: 'rgba(240, 249, 255, 0.95)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  categoryBadgeText: {
    color: '#0284C7',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  stockBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  inStockBadge: {
    backgroundColor: 'rgba(236, 253, 245, 0.95)',
  },
  outOfStockBadge: {
    backgroundColor: 'rgba(241, 245, 249, 0.95)',
  },
  stockBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  inStockText: {
    color: '#059669',
  },
  outOfStockText: {
    color: '#94A3B8',
  },
  content: {
    padding: 10,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  starIcon: {
    color: '#F59E0B',
    fontSize: 12,
    marginRight: 3,
  },
  ratingText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '700',
  },
  reviewCount: {
    color: '#64748B',
    fontSize: 10,
    marginLeft: 3,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 17,
    minHeight: 34,
  },
  specs: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 3,
    marginBottom: 6,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  originalPrice: {
    fontSize: 11,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  addButton: {
    backgroundColor: '#0EA5E9',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: 36,
  },
  addedButton: {
    backgroundColor: '#059669',
  },
  disabledButton: {
    backgroundColor: '#E2E8F0',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  addedButtonText: {
    color: '#FFFFFF',
  },
  disabledButtonText: {
    color: '#94A3B8',
  },
});
