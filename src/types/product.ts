export type ProductCategory =
  | 'Purifiers'
  | 'Dispensers'
  | 'Pumps'
  | 'Filters'
  | 'Spares';

export type CategoryFilter = 'All' | ProductCategory;

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  wholesalePrice: number; // Wholesale price for Dealer role (Round 1 assignment)
  originalPrice?: number;
  description: string;
  specifications?: string;
  imageUrl: string;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  stockQuantity: number;
}
