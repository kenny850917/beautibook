import { Booking } from "@prisma/client";
import { PrismaService } from "./PrismaService";

// Temporary Customer interface until Prisma client regeneration
interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  total_bookings: number;
  total_spent: number;
  last_booking_at?: Date | null;
  preferred_staff?: string | null;
  preferred_service?: string | null;
  marketing_consent: boolean;
  referral_source?: string | null;
  notes?: string | null;
  created_at: Date;
  updated_at: Date;
}

interface CreateGuestCustomerData {
  name: string;
  phone: string;
  email?: string;
  referralSource?: string;
  marketingConsent?: boolean;
}

interface CustomerWithStats extends Customer {
  bookings: Booking[];
  stats: {
    totalBookings: number;
    totalSpent: number;
    averageSpent: number;
    lastBooking: Date | null;
    preferredStaff: string | null;
    preferredService: string | null;
  };
}

/**
 * Singleton service for guest customer management and CRM tracking
 * Handles customer identification, history tracking, and analytics
 */
export class CustomerService {
  private static instance: CustomerService;
  private prisma = PrismaService.getInstance();

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): CustomerService {
    if (!CustomerService.instance) {
      CustomerService.instance = new CustomerService();
    }
    return CustomerService.instance;
  }

  /**
   * Find or create guest customer by phone number
   * This is the primary method for guest user tracking
   */
  async findOrCreateGuestCustomer(
    data: CreateGuestCustomerData
  ): Promise<Customer> {
    const normalizedPhone = this.normalizePhone(data.phone);

    // TODO: Implement once Prisma client is regenerated with Customer model
    // For now, return a mock customer to prevent linter errors
    const mockCustomer: Customer = {
      id: "temp_" + Date.now(),
      name: data.name,
      phone: normalizedPhone,
      email: data.email || null,
      total_bookings: 0,
      total_spent: 0,
      last_booking_at: null,
      preferred_staff: null,
      preferred_service: null,
      marketing_consent: data.marketingConsent || false,
      referral_source: data.referralSource || null,
      notes: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    return mockCustomer;
  }

  /**
   * Find customer by email (for returning customers who provide email)
   */
  async findCustomerByEmail(email: string): Promise<Customer | null> {
    // TODO: Implement once Prisma client is regenerated
    return null;
  }

  /**
   * Find customer by phone number
   */
  async findCustomerByPhone(phone: string): Promise<Customer | null> {
    // TODO: Implement once Prisma client is regenerated
    return null;
  }

  /**
   * Get customer with full booking history and stats
   */
  async getCustomerWithHistory(
    customerId: string
  ): Promise<CustomerWithStats | null> {
    // TODO: Implement once Prisma client is regenerated
    return null;
  }

  /**
   * Update customer after a new booking
   */
  async updateCustomerAfterBooking(
    customerId: string,
    booking: Booking & { service: { id: string }; staff: { id: string } }
  ): Promise<void> {
    // TODO: Implement once Prisma client is regenerated
    return;
  }

  /**
   * Get customer insights for marketing
   */
  async getCustomerInsights(filters?: {
    minBookings?: number;
    minSpent?: number;
    lastBookingBefore?: Date;
    lastBookingAfter?: Date;
    preferredStaff?: string;
    marketingConsent?: boolean;
  }) {
    // TODO: Implement once Prisma client is regenerated
    return [];
  }

  /**
   * Get customers who haven't booked recently (for re-engagement)
   */
  async getInactiveCustomers(daysSinceLastBooking: number = 90) {
    // TODO: Implement once Prisma client is regenerated
    return [];
  }

  /**
   * Add notes about a customer (for staff)
   */
  async addCustomerNote(customerId: string, note: string): Promise<void> {
    // TODO: Implement once Prisma client is regenerated
    return;
  }

  /**
   * Update marketing consent
   */
  async updateMarketingConsent(
    customerId: string,
    consent: boolean
  ): Promise<void> {
    // TODO: Implement once Prisma client is regenerated
    return;
  }

  /**
   * Calculate customer statistics from bookings
   */
  private calculateCustomerStats(
    bookings: (Booking & { service?: { id: string }; staff?: { id: string } })[]
  ) {
    const totalBookings = bookings.length;
    const totalSpent = bookings.reduce(
      (sum, booking) => sum + booking.final_price,
      0
    );
    const averageSpent = totalBookings > 0 ? totalSpent / totalBookings : 0;
    const lastBooking = bookings.length > 0 ? bookings[0].slot_datetime : null;

    // Find most frequent staff and service
    const staffCounts: Record<string, number> = {};
    const serviceCounts: Record<string, number> = {};

    bookings.forEach((booking) => {
      if (booking.staff_id) {
        staffCounts[booking.staff_id] =
          (staffCounts[booking.staff_id] || 0) + 1;
      }
      if (booking.service_id) {
        serviceCounts[booking.service_id] =
          (serviceCounts[booking.service_id] || 0) + 1;
      }
    });

    const preferredStaff = this.getMostFrequent(staffCounts);
    const preferredService = this.getMostFrequent(serviceCounts);

    return {
      totalBookings,
      totalSpent,
      averageSpent,
      lastBooking,
      preferredStaff,
      preferredService,
    };
  }

  /**
   * Get most frequent item from count object
   */
  private getMostFrequent(counts: Record<string, number>): string | null {
    let maxCount = 0;
    let mostFrequent: string | null = null;

    for (const [key, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        mostFrequent = key;
      }
    }

    return mostFrequent;
  }

  /**
   * Normalize phone number to consistent format
   */
  private normalizePhone(phone: string): string {
    // Remove all non-digits
    const digitsOnly = phone.replace(/\D/g, "");

    // Handle US phone numbers
    if (digitsOnly.length === 10) {
      return `+1${digitsOnly}`;
    } else if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
      return `+${digitsOnly}`;
    }

    // For international numbers, add + if not present
    return phone.startsWith("+") ? phone : `+${digitsOnly}`;
  }

  /**
   * Search customers by name or phone
   */
  async searchCustomers(query: string): Promise<Customer[]> {
    // TODO: Implement once Prisma client is regenerated
    return [];
  }

  /**
   * Get top customers by revenue
   */
  async getTopCustomers(limit: number = 10): Promise<Customer[]> {
    // TODO: Implement once Prisma client is regenerated
    return [];
  }

  /**
   * Merge duplicate customers (for data cleanup)
   */
  async mergeDuplicateCustomers(
    primaryCustomerId: string,
    duplicateCustomerId: string
  ): Promise<void> {
    // TODO: Implement once Prisma client is regenerated
    return;
  }
}
