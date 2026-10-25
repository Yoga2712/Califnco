import { useSyncExternalStore } from 'react';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { notificationService } from './notificationService';
import { cartService } from './cartService';
export { cartService };
import {
  CreateOrderInput,
  Order,
  OrderItem,
  OrderStatus,
  PaymentStatus,
} from '../types/order';
import { MOCK_PRODUCTS } from '../data/products';

const pur01 = MOCK_PRODUCTS.find((p) => p.id === 'pur-01') ?? MOCK_PRODUCTS[0];
const flt01 = MOCK_PRODUCTS.find((p) => p.id === 'flt-01') ?? MOCK_PRODUCTS[4];
const disp01 = MOCK_PRODUCTS.find((p) => p.id === 'disp-01') ?? MOCK_PRODUCTS[1];

export const INITIAL_DEMO_ORDERS: Order[] = [
  {
    id: 'ord-demo-01',
    orderNumber: 'CAL-89241',
    status: 'out_for_delivery',
    items: [
      {
        product: pur01,
        quantity: 1,
        unitPrice: pur01.price,
        subtotal: pur01.price,
      },
      {
        product: flt01,
        quantity: 2,
        unitPrice: flt01.price,
        subtotal: flt01.price * 2,
      },
    ],
    totalCount: 3,
    subtotal: pur01.price + flt01.price * 2,
    deliveryFee: 0,
    installationFee: 0,
    totalAmount: pur01.price + flt01.price * 2,
    shippingAddress: {
      fullName: 'Rahul Sharma',
      phoneNumber: '+91 98765 43210',
      addressLine: 'Flat 402, Royal Palms, Link Road',
      landmark: 'Near Metro Pillar 142',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400053',
      addressType: 'Home',
    },
    deliverySlot: {
      id: 'slot-today-2',
      title: 'Today',
      timeWindow: '02:00 PM - 05:00 PM',
      sublabel: 'Standard Slot',
      isExpress: false,
    },
    paymentMethod: 'cod',
    paymentStatus: 'pending',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    estimatedDeliveryDate: 'Today',
  },
  {
    id: 'ord-demo-02',
    orderNumber: 'CAL-67104',
    status: 'confirmed',
    items: [
      {
        product: disp01,
        quantity: 1,
        unitPrice: disp01.price,
        subtotal: disp01.price,
      },
    ],
    totalCount: 1,
    subtotal: disp01.price,
    deliveryFee: 0,
    installationFee: 0,
    totalAmount: disp01.price,
    shippingAddress: {
      fullName: 'Priya Verma',
      phoneNumber: '+91 98112 34567',
      addressLine: 'B-304, Green Glen Layout, Bellandur',
      landmark: 'Opposite Central Mall',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560103',
      addressType: 'Office',
    },
    deliverySlot: {
      id: 'slot-tmrw-1',
      title: 'Tomorrow',
      timeWindow: '10:00 AM - 01:00 PM',
      sublabel: 'Morning Express',
      isExpress: true,
    },
    paymentMethod: 'upi',
    paymentStatus: 'paid',
    paymentId: 'pay_test_67104Demo',
    paidAt: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
    estimatedDeliveryDate: 'Tomorrow',
  },
  {
    id: 'po-demo-01',
    orderNumber: 'PO-CAL-90412',
    userId: 'usr_dealer_demo_01',
    isDealerOrder: true,
    dealerCompanyName: 'Apex Water Solutions',
    dealerGstin: '29AABCU9603R1Z7',
    status: 'delivered',
    items: [
      {
        product: pur01,
        quantity: 10,
        unitPrice: pur01.wholesalePrice,
        subtotal: pur01.wholesalePrice * 10,
      },
    ],
    totalCount: 10,
    subtotal: pur01.wholesalePrice * 10,
    tierDiscount: 4749,
    gstAmount: 16243,
    deliveryFee: 0,
    installationFee: 0,
    totalAmount: 106484,
    shippingAddress: {
      fullName: 'Apex Logistics Hub',
      phoneNumber: '+91 98112 34567',
      addressLine: 'Warehouse 4B, Industrial Area, Whitefield',
      landmark: 'Near Container Freight Station',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560066',
      addressType: 'Commercial',
    },
    deliverySlot: {
      id: 'commercial-cargo',
      title: 'Commercial Freight',
      timeWindow: 'Business Hours (09:00 AM - 06:00 PM)',
      sublabel: 'Dock Delivery with Liftgate',
    },
    paymentMethod: 'upi',
    paymentStatus: 'paid',
    paymentId: 'pay_test_dealer90412',
    paidAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    estimatedDeliveryDate: 'Delivered',
  },
  {
    id: 'po-demo-02',
    orderNumber: 'PO-CAL-91823',
    userId: 'usr_dealer_demo_01',
    isDealerOrder: true,
    dealerCompanyName: 'Apex Water Solutions',
    dealerGstin: '29AABCU9603R1Z7',
    status: 'confirmed',
    items: [
      {
        product: flt01,
        quantity: 25,
        unitPrice: flt01.wholesalePrice,
        subtotal: flt01.wholesalePrice * 25,
      },
      {
        product: disp01,
        quantity: 4,
        unitPrice: disp01.wholesalePrice,
        subtotal: disp01.wholesalePrice * 4,
      },
    ],
    totalCount: 29,
    subtotal: flt01.wholesalePrice * 25 + disp01.wholesalePrice * 4,
    tierDiscount: 0,
    gstAmount: 6110,
    deliveryFee: 0,
    installationFee: 0,
    totalAmount: 40056,
    shippingAddress: {
      fullName: 'Apex Logistics Hub',
      phoneNumber: '+91 98112 34567',
      addressLine: 'Warehouse 4B, Industrial Area, Whitefield',
      landmark: 'Near Container Freight Station',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560066',
      addressType: 'Commercial',
    },
    deliverySlot: {
      id: 'commercial-cargo',
      title: 'Commercial Freight',
      timeWindow: 'Business Hours (09:00 AM - 06:00 PM)',
      sublabel: 'Dock Delivery with Liftgate',
    },
    paymentMethod: 'cod',
    paymentStatus: 'pending',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    estimatedDeliveryDate: 'In 2 Days',
  },
];

export interface OrderStatusInfo {
  label: string;
  badgeBg: string;
  badgeTextColor: string;
  indicatorColor: string;
}

export function getOrderStatusInfo(status: OrderStatus): OrderStatusInfo {
  switch (status) {
    case 'placed':
      return {
        label: 'Order Placed',
        badgeBg: '#E0F2FE',
        badgeTextColor: '#0284C7',
        indicatorColor: '#0EA5E9',
      };
    case 'confirmed':
      return {
        label: 'Order Confirmed',
        badgeBg: '#EDE9FE',
        badgeTextColor: '#7C3AED',
        indicatorColor: '#8B5CF6',
      };
    case 'processing':
      return {
        label: 'Tested & Packed',
        badgeBg: '#FEF3C7',
        badgeTextColor: '#D97706',
        indicatorColor: '#F59E0B',
      };
    case 'out_for_delivery':
      return {
        label: 'Out for Delivery',
        badgeBg: '#E0F2FE',
        badgeTextColor: '#0369A1',
        indicatorColor: '#0284C7',
      };
    case 'delivered':
      return {
        label: 'Delivered',
        badgeBg: '#ECFDF5',
        badgeTextColor: '#059669',
        indicatorColor: '#10B981',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        badgeBg: '#FEF2F2',
        badgeTextColor: '#DC2626',
        indicatorColor: '#EF4444',
      };
  }
}

export function getOrderStatusStep(status: OrderStatus): number {
  switch (status) {
    case 'placed':
      return 0;
    case 'confirmed':
      return 1;
    case 'processing':
      return 2;
    case 'out_for_delivery':
      return 3;
    case 'delivered':
      return 4;
    case 'cancelled':
    default:
      return -1;
  }
}

type OrderListener = () => void;

class OrderService {
  private orders: Order[] = [...INITIAL_DEMO_ORDERS];
  private listeners: Set<OrderListener> = new Set();

  getSnapshot = (): Order[] => {
    return this.orders;
  };

  getOrders(): Order[] {
    return [...this.orders];
  }

  getOrderById(id: string): Order | undefined {
    return this.orders.find((order) => order.id === id || order.orderNumber === id);
  }

  async createOrder(input: CreateOrderInput): Promise<Order> {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const orderNumber =
      input.customOrderNumber ||
      (input.isDealerOrder ? `PO-CAL-${randomSuffix}` : `CAL-${randomSuffix}`);
    const id = input.isDealerOrder ? `po-${timestamp}` : `ord-${timestamp}`;

    const orderItems: OrderItem[] = input.items.map((item) => {
      const unitPrice =
        item.unitPrice ??
        (input.isDealerOrder ? item.product.wholesalePrice : item.product.price);
      return {
        product: item.product,
        quantity: item.quantity,
        unitPrice,
        subtotal: unitPrice * item.quantity,
      };
    });

    const totalCount = orderItems.reduce((acc, curr) => acc + curr.quantity, 0);
    const subtotal = orderItems.reduce((acc, curr) => acc + curr.subtotal, 0);
    const deliveryFee = 0; // Promotional Free Delivery / Commercial Freight Included
    const installationFee = 0; // Free Standard Installation
    const tierDiscount = input.tierDiscount ?? 0;
    const gstAmount = input.gstAmount ?? 0;
    const totalAmount = Math.max(0, subtotal - tierDiscount) + deliveryFee + installationFee + gstAmount;

    // Calculate delivery date estimate: 2 business days from now
    const deliveryDateObj = new Date(timestamp + 2 * 24 * 60 * 60 * 1000);
    const estimatedDeliveryDate = deliveryDateObj.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    // Idempotency guard: prevent duplicate order creation if paymentId is already recorded
    if (input.paymentId) {
      const existingOrder = this.orders.find((o) => o.paymentId === input.paymentId);
      if (existingOrder) {
        return existingOrder;
      }
    }

    const paymentStatus: PaymentStatus =
      input.paymentStatus ?? (input.paymentMethod === 'cod' ? 'pending' : 'paid');

    const newOrder: Order = {
      id,
      orderNumber,
      userId: input.userId || 'usr_customer_demo_01',
      items: orderItems,
      totalCount,
      subtotal,
      deliveryFee,
      installationFee,
      totalAmount,
      shippingAddress: input.shippingAddress,
      deliverySlot: input.deliverySlot,
      paymentMethod: input.paymentMethod,
      paymentStatus,
      paymentId: input.paymentId,
      razorpayOrderId: input.razorpayOrderId,
      razorpaySignature: input.razorpaySignature,
      paidAt: input.paidAt ?? (paymentStatus === 'paid' ? new Date(timestamp).toISOString() : undefined),
      status: 'placed',
      createdAt: new Date(timestamp).toISOString(),
      estimatedDeliveryDate,
      isDealerOrder: input.isDealerOrder,
      dealerCompanyName: input.dealerCompanyName,
      dealerGstin: input.dealerGstin,
      tierDiscount: input.tierDiscount,
      gstAmount: input.gstAmount,
    };

    // Prepend to orders list so newest is first
    this.orders = [newOrder, ...this.orders];

    // Clear retail cart only for customer orders (dealer cart is managed separately)
    if (!input.isDealerOrder) {
      cartService.clearCart();
    }

    this.notify();

    // Persist to Firestore orders collection
    try {
      const orderDocRef = doc(db, 'orders', newOrder.id);
      void setDoc(orderDocRef, {
        ...newOrder,
        serverTimestamp: serverTimestamp(),
      }).catch((err: unknown) => {
        // Silently handle offline / disabled Firestore API
        console.warn('Firestore orders sync notice:', (err as Error)?.message || err);
      });
    } catch {
      // Offline fallback
    }

    // Trigger FCM push notification event: Order Placed
    void notificationService.notifyOrderPlaced(
      newOrder.userId || 'usr_customer_demo_01',
      newOrder.orderNumber,
      newOrder.id,
      newOrder.totalAmount
    );

    return newOrder;
  }

  /**
   * Updates status of an order both in Firestore and local state, triggering FCM event
   */
  async updateOrderStatus(orderId: string, newStatus: OrderStatus): Promise<Order | undefined> {
    const orderIndex = this.orders.findIndex((o) => o.id === orderId || o.orderNumber === orderId);
    if (orderIndex === -1) return undefined;

    const existing = this.orders[orderIndex];
    const updated: Order = {
      ...existing,
      status: newStatus,
    };

    this.orders[orderIndex] = updated;
    this.notify();

    // Update in Firestore
    try {
      const orderDocRef = doc(db, 'orders', updated.id);
      void updateDoc(orderDocRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      }).catch((err: unknown) => {
        console.warn('Firestore order update notice:', (err as Error)?.message || err);
      });
    } catch {
      // Fail-soft offline
    }

    // Trigger assignment notification events based on status
    const targetUserId = updated.userId || 'usr_customer_demo_01';
    if (newStatus === 'confirmed') {
      void notificationService.notifyOrderConfirmed(targetUserId, updated.orderNumber, updated.id);
    } else if (newStatus === 'out_for_delivery') {
      void notificationService.notifyOutForDelivery(
        targetUserId,
        updated.orderNumber,
        updated.id,
        updated.deliverySlot.timeWindow
      );
    } else if (newStatus === 'delivered') {
      void notificationService.notifyOrderDelivered(targetUserId, updated.orderNumber, updated.id);
    }

    return updated;
  }

  /**
   * Fetches orders from Firestore collection
   */
  async fetchOrdersFromFirestore(userId?: string): Promise<Order[]> {
    try {
      const ordersCol = collection(db, 'orders');
      const q = userId
        ? query(ordersCol, where('userId', '==', userId), orderBy('createdAt', 'desc'))
        : query(ordersCol, orderBy('createdAt', 'desc'));

      const snap = await getDocs(q).catch(() => null);
      if (snap) {
        const firestoreOrders: Order[] = [];
        snap.forEach((d) => firestoreOrders.push(d.data() as Order));

        if (firestoreOrders.length > 0) {
          // Merge without duplicating IDs
          const existingIds = new Set(this.orders.map((o) => o.id));
          const newFromDb = firestoreOrders.filter((o) => !existingIds.has(o.id));
          if (newFromDb.length > 0) {
            this.orders = [...newFromDb, ...this.orders];
            this.notify();
          }
        }
      }
    } catch {
      // Offline fallback: keep in-memory orders
    }
    return this.orders;
  }

  subscribe = (listener: OrderListener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const orderService = new OrderService();

/**
 * Hook to consume orders list reactively with useSyncExternalStore
 */
export function useOrders() {
  const orders = useSyncExternalStore(
    orderService.subscribe,
    orderService.getSnapshot,
    orderService.getSnapshot
  );

  return {
    orders,
    createOrder: (input: CreateOrderInput) => orderService.createOrder(input),
    getOrderById: (id: string) => orderService.getOrderById(id),
    updateOrderStatus: (orderId: string, newStatus: OrderStatus) =>
      orderService.updateOrderStatus(orderId, newStatus),
    fetchOrdersFromFirestore: (userId?: string) =>
      orderService.fetchOrdersFromFirestore(userId),
  };
}
