import { BookingService } from "./BookingService";
import { CustomerService } from "./CustomerService";
import { EmailService } from "./EmailService";

/**
 * Enhanced booking service that integrates customer CRM tracking
 * Extends BookingService with guest customer management
 */
export class BookingWithCRMService {
  private static instance: BookingWithCRMService;
  private bookingService = BookingService.getInstance();
  private customerService = CustomerService.getInstance();
  private emailService = EmailService.getInstance();

  private constructor() {}

  static getInstance(): BookingWithCRMService {
    if (!BookingWithCRMService.instance) {
      BookingWithCRMService.instance = new BookingWithCRMService();
    }
    return BookingWithCRMService.instance;
  }

  /**
   * Create booking with guest customer tracking
   */
  async createBookingWithCRM(
    staffId: string,
    serviceId: string,
    slotDateTime: Date,
    customerData: {
      name: string;
      phone: string;
      email?: string;
      referralSource?: string;
      marketingConsent?: boolean;
    },
    sessionId?: string
  ) {
    // Step 1: Find or create customer record
    const customer = await this.customerService.findOrCreateGuestCustomer({
      name: customerData.name,
      phone: customerData.phone,
      email: customerData.email,
      referralSource: customerData.referralSource,
      marketingConsent: customerData.marketingConsent,
    });

    // Step 2: Create booking with customer link
    const booking = await this.bookingService.createBooking(
      staffId,
      serviceId,
      slotDateTime,
      customerData.name,
      customerData.phone,
      sessionId
    );

    // Step 3: Link booking to customer and update in database
    await this.linkBookingToCustomer(
      booking.id,
      customer.id,
      customerData.email
    );

    // Step 4: Update customer statistics
    await this.customerService.updateCustomerAfterBooking(customer.id, {
      final_price: booking.final_price,
      slot_datetime: booking.slot_datetime,
      service_id: serviceId,
      staff_id: staffId,
    });

    // Step 5: Send confirmation email with customer context
    if (customerData.email) {
      const emailData = this.emailService.formatBookingDataForEmail(
        booking,
        customerData.email
      );

      await this.emailService.sendBookingConfirmation(emailData);
    }

    return {
      booking,
      customer,
      isReturningCustomer: customer.total_bookings > 1,
    };
  }

  /**
   * Link existing booking to customer record
   */
  private async linkBookingToCustomer(
    bookingId: string,
    customerId: string,
    customerEmail?: string
  ) {
    const prisma = this.customerService["prisma"]; // Access private prisma instance

    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        customer_id: customerId,
        customer_email: customerEmail,
      },
    });
  }

  /**
   * Get customer booking history for staff reference
   */
  async getCustomerHistory(phone: string) {
    const customer = await this.customerService.findCustomerByPhone(phone);
    if (!customer) return null;

    return await this.customerService.getCustomerWithHistory(customer.id);
  }

  /**
   * Quick customer lookup during booking process
   */
  async quickCustomerLookup(phoneOrEmail: string) {
    // Try phone first (more common for returning customers)
    let customer = await this.customerService.findCustomerByPhone(phoneOrEmail);

    // If not found and looks like email, try email lookup
    if (!customer && phoneOrEmail.includes("@")) {
      customer = await this.customerService.findCustomerByEmail(phoneOrEmail);
    }

    if (customer) {
      return {
        customer,
        suggestions: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          preferredStaff: customer.preferred_staff,
          preferredService: customer.preferred_service,
          totalBookings: customer.total_bookings,
          lastBooking: customer.last_booking_at,
        },
      };
    }

    return null;
  }
}
