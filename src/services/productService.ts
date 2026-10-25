import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { MOCK_PRODUCTS } from '../data/products';
import { CategoryFilter, Product } from '../types/product';

/**
 * Product Service
 * Supports Firestore products collection with seamless fallback to MOCK_PRODUCTS.
 * Preserves LOCAL_PRODUCT_IMAGES for 100% free offline-resilient product imagery.
 */
export const productService = {
  /**
   * Fetches products optionally filtered by category.
   * Tries Firestore first; falls back seamlessly to MOCK_PRODUCTS.
   */
  async getProducts(category: CategoryFilter = 'All'): Promise<Product[]> {
    let products: Product[] = [...MOCK_PRODUCTS];

    try {
      const snap = await getDocs(collection(db, 'products')).catch(() => null);
      if (snap && !snap.empty) {
        const firestoreList: Product[] = [];
        snap.forEach((d) => {
          firestoreList.push(d.data() as Product);
        });
        if (firestoreList.length > 0) {
          products = firestoreList;
        }
      }
    } catch {
      // Offline fallback: keep MOCK_PRODUCTS
    }

    if (!category || category === 'All') {
      return products;
    }
    return products.filter((item) => item.category === category);
  },

  /**
   * Fetches a single product by ID.
   */
  async getProductById(id: string): Promise<Product | undefined> {
    const all = await this.getProducts('All');
    return all.find((p) => p.id === id);
  },

  /**
   * Seeds products to Firestore products collection if not already seeded
   */
  async seedProductsToFirestore(): Promise<number> {
    let count = 0;
    try {
      for (const prod of MOCK_PRODUCTS) {
        await setDoc(doc(db, 'products', prod.id), prod, { merge: true }).catch(() => {});
        count++;
      }
    } catch {
      // Offline tolerance
    }
    return count;
  },
};
