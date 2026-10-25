import { useSyncExternalStore } from 'react';
import { CartItem } from '../types/cart';
import { Product } from '../types/product';

type CartListener = () => void;

class CartService {
  private items: CartItem[] = [];
  private listeners: Set<CartListener> = new Set();

  getSnapshot = (): CartItem[] => {
    return this.items;
  };

  getItemQuantity(productId: string): number {
    const item = this.items.find((i) => i.product.id === productId);
    return item ? item.quantity : 0;
  }

  getTotalCount(): number {
    return this.items.reduce((total, item) => total + item.quantity, 0);
  }

  getSubtotal(): number {
    return this.items.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0
    );
  }

  addToCart(product: Product): void {
    if (!product.inStock) return;
    const existingIndex = this.items.findIndex((i) => i.product.id === product.id);

    if (existingIndex > -1) {
      this.items = this.items.map((item, idx) =>
        idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
      );
    } else {
      this.items = [...this.items, { product, quantity: 1 }];
    }

    this.notify();
  }

  increaseQuantity(productId: string): void {
    this.items = this.items.map((item) =>
      item.product.id === productId ? { ...item, quantity: item.quantity + 1 } : item
    );
    this.notify();
  }

  decreaseQuantity(productId: string): void {
    this.items = this.items.map((item) => {
      if (item.product.id === productId) {
        // Quantity must never go below 1
        const newQty = Math.max(1, item.quantity - 1);
        return { ...item, quantity: newQty };
      }
      return item;
    });
    this.notify();
  }

  removeFromCart(productId: string): void {
    this.items = this.items.filter((item) => item.product.id !== productId);
    this.notify();
  }

  clearCart(): void {
    this.items = [];
    this.notify();
  }

  subscribe = (listener: CartListener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const cartService = new CartService();

/**
 * Reactive React hook to consume cart state anywhere without external state libraries.
 * Leverages React 18/19 built-in useSyncExternalStore.
 */
export function useCart() {
  const items = useSyncExternalStore(
    cartService.subscribe,
    cartService.getSnapshot,
    cartService.getSnapshot
  );

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  return {
    items,
    totalCount,
    subtotal,
    addToCart: (product: Product) => cartService.addToCart(product),
    increaseQuantity: (productId: string) => cartService.increaseQuantity(productId),
    decreaseQuantity: (productId: string) => cartService.decreaseQuantity(productId),
    removeFromCart: (productId: string) => cartService.removeFromCart(productId),
    clearCart: () => cartService.clearCart(),
    getItemQuantity: (productId: string) => cartService.getItemQuantity(productId),
  };
}
