import { useSyncExternalStore } from 'react';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { MOCK_PRODUCTS } from '../data/products';
import { Product } from '../types/product';

type InventoryListener = () => void;

class InventoryService {
  private products: Product[] = [...MOCK_PRODUCTS];
  private listeners: Set<InventoryListener> = new Set();

  getSnapshot = (): Product[] => {
    return this.products;
  };

  getProducts(): Product[] {
    return [...this.products];
  }

  getProductById(id: string): Product | undefined {
    return this.products.find((p) => p.id === id);
  }

  adjustStock(productId: string, delta: number): Product | undefined {
    const idx = this.products.findIndex((p) => p.id === productId);
    if (idx === -1) return undefined;

    const current = this.products[idx];
    const newQuantity = Math.max(0, (current.stockQuantity || 0) + delta);
    const updated: Product = {
      ...current,
      stockQuantity: newQuantity,
      inStock: newQuantity > 0,
    };

    this.products[idx] = updated;
    this.notify();

    // Sync to Firestore
    try {
      const docRef = doc(db, 'products', productId);
      void updateDoc(docRef, {
        stockQuantity: newQuantity,
        inStock: newQuantity > 0,
      }).catch(() => {});
    } catch {
      // Fail-soft offline
    }

    return updated;
  }

  setStock(productId: string, quantity: number): Product | undefined {
    const idx = this.products.findIndex((p) => p.id === productId);
    if (idx === -1) return undefined;

    const current = this.products[idx];
    const newQuantity = Math.max(0, quantity);
    const updated: Product = {
      ...current,
      stockQuantity: newQuantity,
      inStock: newQuantity > 0,
    };

    this.products[idx] = updated;
    this.notify();

    try {
      const docRef = doc(db, 'products', productId);
      void updateDoc(docRef, {
        stockQuantity: newQuantity,
        inStock: newQuantity > 0,
      }).catch(() => {});
    } catch {
      // Fail-soft
    }

    return updated;
  }

  updatePricing(productId: string, price: number, wholesalePrice: number): Product | undefined {
    const idx = this.products.findIndex((p) => p.id === productId);
    if (idx === -1) return undefined;

    const current = this.products[idx];
    const updated: Product = {
      ...current,
      price: Math.max(1, price),
      wholesalePrice: Math.max(1, wholesalePrice),
    };

    this.products[idx] = updated;
    this.notify();

    try {
      const docRef = doc(db, 'products', productId);
      void updateDoc(docRef, {
        price: updated.price,
        wholesalePrice: updated.wholesalePrice,
      }).catch(() => {});
    } catch {
      // Fail-soft
    }

    return updated;
  }

  toggleStockStatus(productId: string): Product | undefined {
    const idx = this.products.findIndex((p) => p.id === productId);
    if (idx === -1) return undefined;

    const current = this.products[idx];
    const nextStatus = !current.inStock;
    const updated: Product = {
      ...current,
      inStock: nextStatus,
      stockQuantity: nextStatus && current.stockQuantity === 0 ? 10 : current.stockQuantity,
    };

    this.products[idx] = updated;
    this.notify();

    try {
      const docRef = doc(db, 'products', productId);
      void updateDoc(docRef, {
        inStock: updated.inStock,
        stockQuantity: updated.stockQuantity,
      }).catch(() => {});
    } catch {
      // Fail-soft
    }

    return updated;
  }

  addProduct(newProduct: Product): Product {
    this.products = [newProduct, ...this.products];
    this.notify();

    try {
      const docRef = doc(db, 'products', newProduct.id);
      void setDoc(docRef, newProduct).catch(() => {});
    } catch {
      // Fail-soft
    }

    return newProduct;
  }

  subscribe = (listener: InventoryListener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}

export const inventoryService = new InventoryService();

export function useInventory() {
  const products = useSyncExternalStore(
    inventoryService.subscribe,
    inventoryService.getSnapshot,
    inventoryService.getSnapshot
  );

  return {
    products,
    adjustStock: (id: string, delta: number) => inventoryService.adjustStock(id, delta),
    setStock: (id: string, qty: number) => inventoryService.setStock(id, qty),
    updatePricing: (id: string, price: number, wholesalePrice: number) =>
      inventoryService.updatePricing(id, price, wholesalePrice),
    toggleStockStatus: (id: string) => inventoryService.toggleStockStatus(id),
    addProduct: (product: Product) => inventoryService.addProduct(product),
  };
}
