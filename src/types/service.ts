import { ShippingAddress } from './order';

export type ServiceType =
  | 'Water Delivery'
  | 'Water Tanker'
  | 'Purifier Installation'
  | 'Filter Replacement'
  | 'TDS Water Quality Test'
  | 'Maintenance / AMC';

export type ServiceStatus = 'new' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

export type ServicePriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ServiceRequest {
  id: string;
  ticketNumber: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  serviceType: ServiceType;
  status: ServiceStatus;
  priority: ServicePriority;
  shippingAddress: ShippingAddress;
  preferredDate: string;
  preferredTimeSlot: string;
  assignedTechnician?: string;
  technicianPhone?: string;
  customerNotes?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceRequestInput {
  userId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  serviceType: ServiceType;
  priority?: ServicePriority;
  shippingAddress: ShippingAddress;
  preferredDate: string;
  preferredTimeSlot: string;
  customerNotes?: string;
}
