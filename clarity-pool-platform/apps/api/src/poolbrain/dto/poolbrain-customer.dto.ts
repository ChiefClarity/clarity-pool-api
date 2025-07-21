export interface CreateCustomerDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  gateCode?: string;
  accessNotes?: string;
  hasDogs?: string;
  waterBodyGallons?: number | null;
}

export interface PoolbrainCustomerDto {
  firstName: string;
  lastName: string;
  email: string;
  contactNumber?: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  GateCode?: string;
  accessNotes?: string;
  hasDogs?: string;
  waterBodyGallons: number;
}

export function mapToPoolbrainCustomer(customer: CreateCustomerDto & { waterBodyGallons?: number | null }): PoolbrainCustomerDto {
  return {
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    contactNumber: customer.phone,
    address: customer.address,
    city: customer.city,
    state: customer.state,
    zipcode: customer.zipCode,
    GateCode: customer.gateCode,
    accessNotes: customer.accessNotes,
    hasDogs: customer.hasDogs,
    waterBodyGallons: customer.waterBodyGallons || 0, // Default to 0 if null/undefined
  };
}