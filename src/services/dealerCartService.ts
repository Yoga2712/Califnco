import { useSyncExternalStore } from 'react';
import { Product } from '../types/product';
import { DealerCartItem, DealerBulkOrderSummary } from '../types/dealer';

type DealerCartListener = () => void;

class DealerCartService {
  private items: DealerCartItem[] = [];
  private listeners: Set<DealerCartListener> = new Set();

  getSnapshot = (): DealerCartItem[] => {
    return this.items;
  };

  getItemQuantity(productId: string): number {
    const found = this.items.find((i) => i.product.id === productId);
    return found ? found.quantity : 0;
  }

  addBulkItem(product: Product, quantity = 5): void {
    if (!product.inStock) return;
    const qty = Math.max(1, quantity);
    const existingIndex = this.items.findIndex((i) => i.product.id === product.id);

    if (existingIndex > -1) {
      this.items = this.items.map((item, idx) =>
        idx === existingIndex
          ? {
              ...item,
              quantity: item.quantity + qty,
              subtotal: (item.quantity + qty) * item.wholesaleUnitPrice,
            }
          : item
      );
    } else {
      this.items = [
        ...this.items,
        {
          product,
          quantity: qty,
          wholesaleUnitPrice: product.wholesalePrice,
          subtotal: qty * product.wholesalePrice,
        },
      ];
    }

    this.notify();
  }

  setQuantity(productId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(productId);
      return;
    }

    this.items = this.items.map((item) => {
      if (item.product.id === productId) {
        return {
          ...item,
          quantity,
          subtotal: quantity * item.wholesaleUnitPrice,
        };
      }
      return item;
    });

    this.notify();
  }

  increaseQuantity(productId: string, step = 5): void {
    const current = this.getItemQuantity(productId);
    this.setQuantity(productId, current + step);
  }

  decreaseQuantity(productId: string, step = 5): void {
    const current = this.getItemQuantity(productId);
    const newQty = Math.max(1, current - step);
    this.setQuantity(productId, newQty);
  }

  removeItem(productId: string): void {
    this.items = this.items.filter((item) => item.product.id !== productId);
    this.notify();
  }

  clearCart(): void {
    this.items = [];
    this.notify();
  }

  getSummary(): DealerBulkOrderSummary {
    const wholesaleSubtotal = this.items.reduce((sum, item) => sum + item.subtotal, 0);
    const retailValue = this.items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
    const marginSavings = Math.max(0, retailValue - wholesaleSubtotal);
    const marginPercentage =
      retailValue > 0 ? Math.round((marginSavings / retailValue) * 100) : 0;

    // Volume Tier Discount: 5% extra discount for orders > ₹50k, 10% for orders > ₹100k
    let tierDiscount = 0;
    if (wholesaleSubtotal >= 100000) {
      tierDiscount = Math.round(wholesaleSubtotal * 0.1);
    } else if (wholesaleSubtotal >= 50000) {
      tierDiscount = Math.round(wholesaleSubtotal * 0.05);
    }

    const taxableAmount = Math.max(0, wholesaleSubtotal - tierDiscount);
    // Standard 18% GST for water purifiers & commercial equipment (SAC/HSN 8421)
    const gstAmount = Math.round(taxableAmount * 0.18);
    const freightFee = 0; // Authorized B2B Free Commercial Freight
    const finalTotalAmount = taxableAmount + gstAmount + freightFee;

    return {
      wholesaleSubtotal,
      retailValue,
      marginSavings,
      marginPercentage,
      tierDiscount,
      taxableAmount,
      gstAmount,
      freightFee,
      finalTotalAmount,
    };
  }

  subscribe = (listener: DealerCartListener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const dealerCartService = new DealerCartService();

/**
 * Hook to consume Dealer Bulk Cart reactively
 */
export function useDealerCart() {
  const items = useSyncExternalStore(
    dealerCartService.subscribe,
    dealerCartService.getSnapshot,
    dealerCartService.getSnapshot
  );

  const summary = dealerCartService.getSummary();
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    items,
    summary,
    totalUnits,
    addBulkItem: (product: Product, quantity = 5) =>
      dealerCartService.addBulkItem(product, quantity),
    setQuantity: (productId: string, quantity: number) =>
      dealerCartService.setQuantity(productId, quantity),
    increaseQuantity: (productId: string, step = 5) =>
      dealerCartService.increaseQuantity(productId, step),
    decreaseQuantity: (productId: string, step = 5) =>
      dealerCartService.decreaseQuantity(productId, step),
    removeItem: (productId: string) => dealerCartService.removeItem(productId),
    clearCart: () => dealerCartService.clearCart(),
    getItemQuantity: (productId: string) =>
      dealerCartService.getItemQuantity(productId),
  };
}
