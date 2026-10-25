import { useSyncExternalStore } from 'react';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  CreateServiceRequestInput,
  ServicePriority,
  ServiceRequest,
  ServiceStatus,
  ServiceType,
} from '../types/service';

export const INITIAL_SERVICE_REQUESTS: ServiceRequest[] = [
  {
    id: 'srv-01',
    ticketNumber: 'SRV-89412',
    userId: 'usr_customer_demo_01',
    customerName: 'Aarun Kumar',
    customerPhone: '+91 98765 43210',
    customerEmail: 'customer@califnco.com',
    serviceType: 'Purifier Installation',
    status: 'assigned',
    priority: 'high',
    shippingAddress: {
      fullName: 'Aarun Kumar',
      phoneNumber: '9876543210',
      addressLine: 'Flat 402, Green Meadows, 1st Cross, Indiranagar',
      landmark: 'Near BDA Complex',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560038',
      addressType: 'Home',
    },
    preferredDate: 'Tomorrow',
    preferredTimeSlot: 'Morning (10:00 AM - 01:00 PM)',
    assignedTechnician: 'Ramesh Sundaram (Lead RO Tech)',
    technicianPhone: '+91 98450 11223',
    customerNotes: 'New Califnco AquaShield RO delivery. Need wall mounting and inlet plumbing check.',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'srv-02',
    ticketNumber: 'SRV-89104',
    userId: 'usr_customer_demo_02',
    customerName: 'Priya Verma',
    customerPhone: '+91 98112 34567',
    customerEmail: 'priya.v@techcorp.in',
    serviceType: 'Filter Replacement',
    status: 'new',
    priority: 'medium',
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
    preferredDate: 'In 2 Days',
    preferredTimeSlot: 'Afternoon (02:00 PM - 05:00 PM)',
    customerNotes: '6-month preventive maintenance. TDS meter reading indicates sediment filter needs change.',
    createdAt: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'srv-03',
    ticketNumber: 'SRV-87550',
    userId: 'usr_dealer_demo_01',
    customerName: 'Apex Water Solutions (Logistics)',
    customerPhone: '+91 98112 34567',
    customerEmail: 'dealer@califnco.com',
    serviceType: 'Water Tanker',
    status: 'in_progress',
    priority: 'urgent',
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
    preferredDate: 'Today',
    preferredTimeSlot: 'Immediate (Next 2 Hours)',
    assignedTechnician: 'Suresh Gowda (Califnco Fleet #04)',
    technicianPhone: '+91 97410 88990',
    customerNotes: '6000L Potable mineral water tanker for industrial processing facility tank refill.',
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'srv-04',
    ticketNumber: 'SRV-86210',
    userId: 'usr_customer_demo_03',
    customerName: 'Vikram Malhotra',
    customerPhone: '+91 99001 22334',
    customerEmail: 'vikram.m@gmail.com',
    serviceType: 'TDS Water Quality Test',
    status: 'completed',
    priority: 'low',
    shippingAddress: {
      fullName: 'Vikram Malhotra',
      phoneNumber: '+91 99001 22334',
      addressLine: 'Villa 12, Palm Meadows, Ramagondanahalli',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560066',
      addressType: 'Home',
    },
    preferredDate: 'Yesterday',
    preferredTimeSlot: 'Morning (10:00 AM - 12:00 PM)',
    assignedTechnician: 'Ramesh Sundaram',
    technicianPhone: '+91 98450 11223',
    customerNotes: 'Requested comprehensive raw water lab testing before ordering commercial RO plant.',
    resolutionNotes: 'Tested raw borewell water: TDS 840 ppm, hardness 320 mg/L. Recommended Califnco AquaShield 8-stage RO unit. Purified water tested at 72 ppm TDS (optimal mineral balance).',
    createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

type ServiceListener = () => void;

class ServiceDeskService {
  private requests: ServiceRequest[] = [...INITIAL_SERVICE_REQUESTS];
  private listeners: Set<ServiceListener> = new Set();

  getSnapshot = (): ServiceRequest[] => {
    return this.requests;
  };

  getRequests(): ServiceRequest[] {
    return [...this.requests];
  }

  getRequestById(id: string): ServiceRequest | undefined {
    return this.requests.find((r) => r.id === id || r.ticketNumber === id);
  }

  async createServiceRequest(input: CreateServiceRequestInput): Promise<ServiceRequest> {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const id = `srv-${timestamp}`;
    const ticketNumber = `SRV-${randomSuffix}`;

    const newRequest: ServiceRequest = {
      id,
      ticketNumber,
      userId: input.userId || 'usr_customer_demo_01',
      customerName: input.customerName.trim(),
      customerPhone: input.customerPhone.trim(),
      customerEmail: input.customerEmail?.trim() || 'customer@califnco.com',
      serviceType: input.serviceType,
      status: 'new',
      priority: input.priority || 'medium',
      shippingAddress: input.shippingAddress,
      preferredDate: input.preferredDate,
      preferredTimeSlot: input.preferredTimeSlot,
      customerNotes: input.customerNotes?.trim(),
      createdAt: new Date(timestamp).toISOString(),
      updatedAt: new Date(timestamp).toISOString(),
    };

    this.requests = [newRequest, ...this.requests];
    this.notify();

    // Persist to Firestore serviceRequests collection
    try {
      const docRef = doc(db, 'serviceRequests', id);
      await setDoc(docRef, {
        ...newRequest,
        serverTimestamp: serverTimestamp(),
      }).catch(() => {});
    } catch {
      // Fail-soft for offline
    }

    return newRequest;
  }

  async updateServiceStatus(
    id: string,
    status: ServiceStatus,
    resolutionNotes?: string
  ): Promise<ServiceRequest | undefined> {
    const idx = this.requests.findIndex((r) => r.id === id || r.ticketNumber === id);
    if (idx === -1) return undefined;

    const existing = this.requests[idx];
    const updated: ServiceRequest = {
      ...existing,
      status,
      resolutionNotes: resolutionNotes ?? existing.resolutionNotes,
      updatedAt: new Date().toISOString(),
    };

    this.requests[idx] = updated;
    this.notify();

    // Sync to Firestore
    try {
      const docRef = doc(db, 'serviceRequests', updated.id);
      await updateDoc(docRef, {
        status,
        resolutionNotes: updated.resolutionNotes || '',
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    } catch {
      // Fail-soft
    }

    return updated;
  }

  async assignTechnician(
    id: string,
    technicianName: string,
    technicianPhone?: string
  ): Promise<ServiceRequest | undefined> {
    const idx = this.requests.findIndex((r) => r.id === id || r.ticketNumber === id);
    if (idx === -1) return undefined;

    const existing = this.requests[idx];
    const updated: ServiceRequest = {
      ...existing,
      assignedTechnician: technicianName.trim(),
      technicianPhone: technicianPhone?.trim() || '+91 98450 11223',
      status: existing.status === 'new' ? 'assigned' : existing.status,
      updatedAt: new Date().toISOString(),
    };

    this.requests[idx] = updated;
    this.notify();

    try {
      const docRef = doc(db, 'serviceRequests', updated.id);
      await updateDoc(docRef, {
        assignedTechnician: updated.assignedTechnician,
        technicianPhone: updated.technicianPhone,
        status: updated.status,
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    } catch {
      // Fail-soft
    }

    return updated;
  }

  subscribe = (listener: ServiceListener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}

export const serviceDeskService = new ServiceDeskService();

export function useServiceDesk() {
  const requests = useSyncExternalStore(
    serviceDeskService.subscribe,
    serviceDeskService.getSnapshot,
    serviceDeskService.getSnapshot
  );

  return {
    requests,
    createServiceRequest: (input: CreateServiceRequestInput) =>
      serviceDeskService.createServiceRequest(input),
    updateServiceStatus: (id: string, status: ServiceStatus, resolutionNotes?: string) =>
      serviceDeskService.updateServiceStatus(id, status, resolutionNotes),
    assignTechnician: (id: string, name: string, phone?: string) =>
      serviceDeskService.assignTechnician(id, name, phone),
    getRequestById: (id: string) => serviceDeskService.getRequestById(id),
  };
}
