import { useSyncExternalStore } from 'react';
import { CustomerSummary } from '../types/customer';
import { DEMO_USERS } from './authService';
import { orderService } from './orderService';

export const INITIAL_CUSTOMERS: CustomerSummary[] = [
  {
    uid: 'usr_customer_demo_01',
    displayName: 'Aarun Kumar',
    email: 'customer@califnco.com',
    phoneNumber: '+91 98765 43210',
    city: 'Bengaluru',
    totalOrders: 3,
    totalSpent: 42497,
    lastOrderDate: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    registeredAt: '2026-08-15T10:00:00Z',
    status: 'active',
  },
  {
    uid: 'usr_customer_demo_02',
    displayName: 'Priya Verma',
    email: 'priya.v@techcorp.in',
    phoneNumber: '+91 98112 34567',
    city: 'Bengaluru',
    totalOrders: 2,
    totalSpent: 16998,
    lastOrderDate: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
    registeredAt: '2026-09-02T14:30:00Z',
    status: 'active',
  },
  {
    uid: 'usr_customer_demo_03',
    displayName: 'Rahul Sharma',
    email: 'rahul.s@royalpalms.com',
    phoneNumber: '+91 98765 12345',
    city: 'Mumbai',
    totalOrders: 1,
    totalSpent: 16397,
    lastOrderDate: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    registeredAt: '2026-09-10T11:15:00Z',
    status: 'active',
  },
  {
    uid: 'usr_customer_demo_04',
    displayName: 'Kavita Menon',
    email: 'kavita.m@gmail.com',
    phoneNumber: '+91 98450 88776',
    city: 'Chennai',
    totalOrders: 2,
    totalSpent: 28998,
    lastOrderDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    registeredAt: '2026-08-20T09:45:00Z',
    status: 'active',
  },
  {
    uid: 'usr_customer_demo_05',
    displayName: 'Deepak Patel',
    email: 'deepak.patel@ahmedabad.biz',
    phoneNumber: '+91 97230 44556',
    city: 'Ahmedabad',
    totalOrders: 1,
    totalSpent: 7499,
    lastOrderDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    registeredAt: '2026-07-28T16:20:00Z',
    status: 'active',
  },
];

type CustomerListener = () => void;

class CustomerService {
  private customers: CustomerSummary[] = [...INITIAL_CUSTOMERS];
  private listeners: Set<CustomerListener> = new Set();

  getSnapshot = (): CustomerSummary[] => {
    return this.customers;
  };

  getCustomers(): CustomerSummary[] {
    return [...this.customers];
  }

  getCustomerById(uid: string): CustomerSummary | undefined {
    return this.customers.find((c) => c.uid === uid || c.email === uid);
  }

  toggleCustomerStatus(uid: string): CustomerSummary | undefined {
    const idx = this.customers.findIndex((c) => c.uid === uid);
    if (idx === -1) return undefined;
    const current = this.customers[idx];
    const updated: CustomerSummary = {
      ...current,
      status: current.status === 'active' ? 'suspended' : 'active',
    };
    this.customers[idx] = updated;
    this.notify();
    return updated;
  }

  subscribe = (listener: CustomerListener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}

export const customerService = new CustomerService();

export function useCustomers() {
  const customers = useSyncExternalStore(
    customerService.subscribe,
    customerService.getSnapshot,
    customerService.getSnapshot
  );

  return {
    customers,
    getCustomerById: (uid: string) => customerService.getCustomerById(uid),
    toggleCustomerStatus: (uid: string) => customerService.toggleCustomerStatus(uid),
  };
}
