import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class MockDataService {
  private readonly mockTechnician = {
    id: 1,
    email: 'test@claritypool.com',
    name: 'Test Tech',
    passwordHash: bcrypt.hashSync('test123', 10),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  private readonly mockCustomers = [
    {
      id: 1,
      email: 'john.smith@example.com',
      name: 'John Smith',
      phone: '+1 (305) 555-0101',
      address: '123 Ocean Drive',
      city: 'Miami Beach',
      state: 'FL',
      zipCode: '33139',
      poolType: 'in-ground',
      poolSize: 'large',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      email: 'sarah.johnson@example.com',
      name: 'Sarah Johnson',
      phone: '+1 (954) 555-0202',
      address: '456 Las Olas Blvd',
      city: 'Fort Lauderdale',
      state: 'FL',
      zipCode: '33301',
      poolType: 'in-ground',
      poolSize: 'medium',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 3,
      email: 'mike.williams@example.com',
      name: 'Mike Williams',
      phone: '+1 (407) 555-0303',
      address: '789 Park Avenue',
      city: 'Orlando',
      state: 'FL',
      zipCode: '32801',
      poolType: 'above-ground',
      poolSize: 'small',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 4,
      email: 'emma.davis@example.com',
      name: 'Emma Davis',
      phone: '+1 (813) 555-0404',
      address: '321 Bayshore Blvd',
      city: 'Tampa',
      state: 'FL',
      zipCode: '33606',
      poolType: 'in-ground',
      poolSize: 'large',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 5,
      email: 'robert.brown@example.com',
      name: 'Robert Brown',
      phone: '+1 (561) 555-0505',
      address: '654 Worth Avenue',
      city: 'Palm Beach',
      state: 'FL',
      zipCode: '33480',
      poolType: 'in-ground',
      poolSize: 'extra-large',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  private readonly mockOffers = [
    {
      id: 1,
      customerId: 1,
      technicianId: 1,
      amount: 299.99,
      description: 'Premium pool cleaning and chemical balance service',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      customerId: 2,
      technicianId: 1,
      amount: 199.99,
      description: 'Standard pool cleaning service',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 3,
      customerId: 3,
      technicianId: 1,
      amount: 149.99,
      description: 'Basic pool maintenance',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      status: 'accepted',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 4,
      customerId: 4,
      technicianId: 1,
      amount: 349.99,
      description: 'Deep cleaning and filter replacement',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      status: 'expired',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 5,
      customerId: 5,
      technicianId: 1,
      amount: 499.99,
      description: 'Full pool restoration service',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      status: 'rejected',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  private readonly mockOnboardingSessions = [
    {
      id: 1,
      sessionId: 'session-001-pending',
      step: 'customer_info',
      widgetData: {
        email: 'pending.customer@example.com',
        name: 'Pending Customer',
        phone: '+1 (786) 555-0606',
      },
      status: 'in_progress',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      sessionId: 'session-002-completed',
      step: 'confirmation',
      widgetData: {
        email: 'completed.customer@example.com',
        name: 'Completed Customer',
        phone: '+1 (239) 555-0707',
        address: '888 Gulf Shore Blvd',
        city: 'Naples',
        state: 'FL',
        zipCode: '34102',
        poolType: 'in-ground',
        poolSize: 'large',
        serviceFrequency: 'weekly',
        preferredDay: 'monday',
      },
      status: 'completed',
      customerId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 3,
      sessionId: 'session-003-abandoned',
      step: 'pool_info',
      widgetData: {
        email: 'abandoned.customer@example.com',
        name: 'Abandoned Customer',
        phone: '+1 (352) 555-0808',
        address: '999 Main Street',
        city: 'Gainesville',
        state: 'FL',
        zipCode: '32601',
      },
      status: 'abandoned',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  getTechnician() {
    return this.mockTechnician;
  }

  getCustomers() {
    return this.mockCustomers;
  }

  getCustomerById(id: number) {
    return this.mockCustomers.find(c => c.id === id);
  }

  getCustomerByEmail(email: string) {
    return this.mockCustomers.find(c => c.email === email);
  }

  getOffers() {
    return this.mockOffers;
  }

  getOfferById(id: number) {
    return this.mockOffers.find(o => o.id === id);
  }

  getOffersByCustomerId(customerId: number) {
    return this.mockOffers.filter(o => o.customerId === customerId);
  }

  getOnboardingSessions() {
    return this.mockOnboardingSessions;
  }

  getOnboardingSessionById(sessionId: string) {
    return this.mockOnboardingSessions.find(s => s.sessionId === sessionId);
  }
}