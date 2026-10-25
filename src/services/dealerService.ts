import { useSyncExternalStore } from 'react';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface DealerItem {
  uid: string;
  companyName: string;
  displayName: string;
  email: string;
  phoneNumber: string;
  gstin: string;
  isApprovedDealer: boolean;
  status: 'pending' | 'approved' | 'rejected';
  city: string;
  state: string;
  totalPurchaseOrders: number;
  totalWholesaleVolume: number;
  rejectionReason?: string;
  registeredAt: string;
}

export const INITIAL_DEALERS: DealerItem[] = [
  {
    uid: 'usr_dealer_demo_01',
    companyName: 'Apex Water Solutions',
    displayName: 'Apex Water Solutions (Authorized)',
    email: 'dealer@califnco.com',
    phoneNumber: '+91 98112 34567',
    gstin: '29AABCU9603R1Z7',
    isApprovedDealer: true,
    status: 'approved',
    city: 'Bengaluru',
    state: 'Karnataka',
    totalPurchaseOrders: 2,
    totalWholesaleVolume: 146540,
    registeredAt: '2026-08-01T09:00:00Z',
  },
  {
    uid: 'dlr_pending_02',
    companyName: 'BlueDrop Aqua Traders',
    displayName: 'Venkatesh Rao (Managing Partner)',
    email: 'bluedrop.aqua@gmail.com',
    phoneNumber: '+91 94480 33445',
    gstin: '29AAFCB2211K1Z3',
    isApprovedDealer: false,
    status: 'pending',
    city: 'Mysuru',
    state: 'Karnataka',
    totalPurchaseOrders: 0,
    totalWholesaleVolume: 0,
    registeredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    uid: 'dlr_pending_03',
    companyName: 'HydraFlow Enterprises',
    displayName: 'Manish Chawla',
    email: 'm.chawla@hydraflow.co.in',
    phoneNumber: '+91 98200 77889',
    gstin: '27AAACH1982M1ZY',
    isApprovedDealer: false,
    status: 'pending',
    city: 'Pune',
    state: 'Maharashtra',
    totalPurchaseOrders: 0,
    totalWholesaleVolume: 0,
    registeredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    uid: 'dlr_approved_04',
    companyName: 'PureTech Water Systems',
    displayName: 'Anand Swaminathan',
    email: 'anand@puretechsystems.com',
    phoneNumber: '+91 94440 99887',
    gstin: '33AABCP4455Q1Z9',
    isApprovedDealer: true,
    status: 'approved',
    city: 'Chennai',
    state: 'Tamil Nadu',
    totalPurchaseOrders: 1,
    totalWholesaleVolume: 74990,
    registeredAt: '2026-08-20T11:30:00Z',
  },
];

type DealerListener = () => void;

class DealerService {
  private dealers: DealerItem[] = [...INITIAL_DEALERS];
  private listeners: Set<DealerListener> = new Set();

  getSnapshot = (): DealerItem[] => {
    return this.dealers;
  };

  getDealers(): DealerItem[] {
    return [...this.dealers];
  }

  getDealerById(uid: string): DealerItem | undefined {
    return this.dealers.find((d) => d.uid === uid || d.email === uid);
  }

  async approveDealer(uid: string): Promise<DealerItem | undefined> {
    const idx = this.dealers.findIndex((d) => d.uid === uid);
    if (idx === -1) return undefined;

    const current = this.dealers[idx];
    const updated: DealerItem = {
      ...current,
      isApprovedDealer: true,
      status: 'approved',
      rejectionReason: undefined,
    };

    this.dealers[idx] = updated;
    this.notify();

    // Sync to Firestore dealers and users collections
    try {
      await Promise.all([
        updateDoc(doc(db, 'dealers', uid), {
          isApprovedDealer: true,
          status: 'approved',
        }).catch(() => {}),
        updateDoc(doc(db, 'users', uid), {
          isApprovedDealer: true,
        }).catch(() => {}),
      ]);
    } catch {
      // Fail-soft offline
    }

    return updated;
  }

  async rejectDealer(uid: string, reason?: string): Promise<DealerItem | undefined> {
    const idx = this.dealers.findIndex((d) => d.uid === uid);
    if (idx === -1) return undefined;

    const current = this.dealers[idx];
    const updated: DealerItem = {
      ...current,
      isApprovedDealer: false,
      status: 'rejected',
      rejectionReason: reason || 'Incomplete GSTIN or territorial non-overlap.',
    };

    this.dealers[idx] = updated;
    this.notify();

    try {
      await Promise.all([
        updateDoc(doc(db, 'dealers', uid), {
          isApprovedDealer: false,
          status: 'rejected',
          rejectionReason: updated.rejectionReason,
        }).catch(() => {}),
        updateDoc(doc(db, 'users', uid), {
          isApprovedDealer: false,
        }).catch(() => {}),
      ]);
    } catch {
      // Fail-soft
    }

    return updated;
  }

  subscribe = (listener: DealerListener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}

export const dealerService = new DealerService();

export function useDealers() {
  const dealers = useSyncExternalStore(
    dealerService.subscribe,
    dealerService.getSnapshot,
    dealerService.getSnapshot
  );

  return {
    dealers,
    approveDealer: (uid: string) => dealerService.approveDealer(uid),
    rejectDealer: (uid: string, reason?: string) => dealerService.rejectDealer(uid, reason),
    getDealerById: (uid: string) => dealerService.getDealerById(uid),
  };
}
