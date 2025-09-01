import { Booking } from "@prisma/client";
import { PrismaService } from "./PrismaService";
import { subDays } from "date-fns";
import { getCurrentUtcTime } from "@/lib/utils/calendar";

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

    try {
      // First try to find existing customer by phone
      let customer = await this.prisma.customer.findUnique({
        where: { phone: normalizedPhone },
      });

      if (customer) {
        // Update existing customer with any new information
        customer = await this.prisma.customer.update({
          where: { id: customer.id },
          data: {
            name: data.name, // Update name in case it changed
            email: data.email || customer.email, // Keep existing email if new one not provided
            marketing_consent:
              data.marketingConsent ?? customer.marketing_consent,
            referral_source: data.referralSource || customer.referral_source,
            updated_at: new Date(),
          },
        });

        console.log(
          `Found existing customer: ${customer.name} (${customer.phone})`
        );
        return customer;
      }

      // Create new customer if not found
      customer = await this.prisma.customer.create({
        data: {
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
        },
      });

      console.log(`Created new customer: ${customer.name} (${customer.phone})`);
      return customer;
    } catch (error) {
      console.error("Error finding/creating customer:", error);
      throw new Error("Failed to create customer record");
    }
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
   * Update customer statistics after a new booking
   */
  async updateCustomerAfterBooking(
    customerId: string,
    booking: {
      final_price: number;
      slot_datetime: Date;
      service_id: string;
      staff_id: string;
    }
  ): Promise<void> {
    try {
      // Get current customer data
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        throw new Error("Customer not found");
      }

      // Calculate new statistics
      const newTotalBookings = customer.total_bookings + 1;
      const newTotalSpent = customer.total_spent + booking.final_price;

      // Update customer record with new statistics
      await this.prisma.customer.update({
        where: { id: customerId },
        data: {
          total_bookings: newTotalBookings,
          total_spent: newTotalSpent,
          last_booking_at: booking.slot_datetime,
          preferred_staff: booking.staff_id, // Update preferred staff to most recent
          preferred_service: booking.service_id, // Update preferred service to most recent
          updated_at: new Date(),
        },
      });

      console.log(
        `Updated customer stats: ${
          customer.name
        } - ${newTotalBookings} bookings, $${newTotalSpent / 100} spent`
      );
    } catch (error) {
      console.error("Error updating customer after booking:", error);
      throw error;
    }
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

  /**
   * Get customers with filtering and pagination for admin dashboard
   */
  async getCustomersWithFiltering(filters: {
    search: string;
    filter: "all" | "vip" | "gold" | "regular" | "new" | "inactive";
    limit: number;
    offset: number;
  }) {
    const { search, filter, limit, offset } = filters;

    // Build where clause for search
    const searchWhere = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    // Build where clause for filtering
    let filterWhere = {};
    const now = new Date();

    switch (filter) {
      case "vip":
        filterWhere = { total_spent: { gte: 100000 } }; // $1000+
        break;
      case "gold":
        filterWhere = {
          total_spent: { gte: 50000, lt: 100000 }, // $500-$999
        };
        break;
      case "regular":
        filterWhere = {
          total_bookings: { gte: 5 },
          total_spent: { lt: 50000 },
        };
        break;
      case "new":
        const sevenDaysAgo = subDays(getCurrentUtcTime(), 7);
        filterWhere = {
          created_at: { gte: sevenDaysAgo },
          total_bookings: { lt: 5 },
        };
        break;
      case "inactive":
        const thirtyDaysAgo = subDays(getCurrentUtcTime(), 30);
        filterWhere = {
          last_booking_at: { lt: thirtyDaysAgo },
        };
        break;
      default:
        // "all" - no additional filtering
        break;
    }

    const customers = await this.prisma.customer.findMany({
      where: {
        ...searchWhere,
        ...filterWhere,
      },
      orderBy: [{ total_spent: "desc" }, { created_at: "desc" }],
      take: limit,
      skip: offset,
    });

    return customers;
  }

  /**
   * Get customer count with filtering for pagination
   */
  async getCustomerCount(filters: {
    search: string;
    filter: "all" | "vip" | "gold" | "regular" | "new" | "inactive";
  }): Promise<number> {
    const { search, filter } = filters;

    // Build where clause for search
    const searchWhere = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    // Build where clause for filtering (same logic as above)
    let filterWhere = {};
    const now = new Date();

    switch (filter) {
      case "vip":
        filterWhere = { total_spent: { gte: 100000 } };
        break;
      case "gold":
        filterWhere = {
          total_spent: { gte: 50000, lt: 100000 },
        };
        break;
      case "regular":
        filterWhere = {
          total_bookings: { gte: 5 },
          total_spent: { lt: 50000 },
        };
        break;
      case "new":
        const sevenDaysAgo = subDays(getCurrentUtcTime(), 7);
        filterWhere = {
          created_at: { gte: sevenDaysAgo },
          total_bookings: { lt: 5 },
        };
        break;
      case "inactive":
        const thirtyDaysAgo = subDays(getCurrentUtcTime(), 30);
        filterWhere = {
          last_booking_at: { lt: thirtyDaysAgo },
        };
        break;
      default:
        // "all" - no additional filtering
        break;
    }

    const count = await this.prisma.customer.count({
      where: {
        ...searchWhere,
        ...filterWhere,
      },
    });

    return count;
  }

  /**
   * Get customer with full booking history for detail view
   */
  async getCustomerWithBookingHistory(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        bookings: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                duration_minutes: true,
              },
            },
            staff: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            slot_datetime: "desc",
          },
        },
      },
    });

    return customer;
  }
}
