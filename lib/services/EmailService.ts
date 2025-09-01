import emailjs from "@emailjs/browser";
import { parseISO, format } from "date-fns";
import { parseIsoToPstComponents } from "@/lib/utils/calendar";

/**
 * Singleton service for EmailJS integration
 * Handles booking confirmations and notifications
 */
export class EmailService {
  private static instance: EmailService;
  private isInitialized: boolean = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Initialize EmailJS with environment variables
   */
  private initialize(): void {
    if (this.isInitialized) return;

    const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

    if (!publicKey) {
      console.warn("EmailJS public key not found in environment variables");
      return;
    }

    emailjs.init(publicKey);
    this.isInitialized = true;
  }

  /**
   * Send booking confirmation email to customer
   */
  async sendBookingConfirmation(bookingData: {
    customerName: string;
    customerEmail?: string;
    customerPhone: string;
    serviceName: string;
    staffName: string;
    dateTime: string;
    duration: string;
    price: string;
    salonName?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      this.initialize();

      if (!this.isInitialized) {
        throw new Error("EmailJS not properly initialized");
      }

      const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
      const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;

      if (!serviceId || !templateId) {
        throw new Error("EmailJS service ID or template ID not configured");
      }

      // If no email provided, skip email sending but return success
      if (!bookingData.customerEmail) {
        console.log("No customer email provided, skipping email confirmation");
        return { success: true };
      }

      const templateParams = {
        to_email: bookingData.customerEmail,
        customer_name: bookingData.customerName,
        service_name: bookingData.serviceName,
        staff_name: bookingData.staffName,
        appointment_date: bookingData.dateTime,
        duration: bookingData.duration,
        price: bookingData.price,
        salon_name: bookingData.salonName || "BeautiBook",
        customer_phone: bookingData.customerPhone,
      };

      const response = await emailjs.send(
        serviceId,
        templateId,
        templateParams
      );

      if (response.status === 200) {
        console.log("✅ Booking confirmation email sent successfully");
        return { success: true };
      } else {
        throw new Error(`EmailJS responded with status: ${response.status}`);
      }
    } catch (error) {
      console.error("❌ Failed to send booking confirmation email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown email error",
      };
    }
  }

  /**
   * Send booking cancellation email to customer
   */
  async sendCancellationEmail(bookingData: {
    customerName: string;
    customerEmail?: string;
    serviceName: string;
    staffName: string;
    dateTime: string;
    salonName?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      this.initialize();

      if (!this.isInitialized || !bookingData.customerEmail) {
        return { success: true }; // Skip if not configured or no email
      }

      const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
      const cancelTemplateId =
        process.env.NEXT_PUBLIC_EMAILJS_CANCEL_TEMPLATE_ID;

      if (!serviceId || !cancelTemplateId) {
        console.warn("Cancellation email template not configured");
        return { success: true };
      }

      const templateParams = {
        to_email: bookingData.customerEmail,
        customer_name: bookingData.customerName,
        service_name: bookingData.serviceName,
        staff_name: bookingData.staffName,
        appointment_date: bookingData.dateTime,
        salon_name: bookingData.salonName || "BeautiBook",
      };

      const response = await emailjs.send(
        serviceId,
        cancelTemplateId,
        templateParams
      );

      if (response.status === 200) {
        console.log("✅ Cancellation email sent successfully");
        return { success: true };
      } else {
        throw new Error(`EmailJS responded with status: ${response.status}`);
      }
    } catch (error) {
      console.error("❌ Failed to send cancellation email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown email error",
      };
    }
  }

  /**
   * Send notification to staff about new booking
   */
  async sendStaffNotification(staffData: {
    staffName: string;
    staffEmail?: string;
    customerName: string;
    serviceName: string;
    dateTime: string;
    duration: string;
    customerPhone: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      this.initialize();

      if (!this.isInitialized || !staffData.staffEmail) {
        return { success: true }; // Skip if not configured or no email
      }

      const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
      const staffTemplateId = process.env.NEXT_PUBLIC_EMAILJS_STAFF_TEMPLATE_ID;

      if (!serviceId || !staffTemplateId) {
        console.warn("Staff notification template not configured");
        return { success: true };
      }

      const templateParams = {
        to_email: staffData.staffEmail,
        staff_name: staffData.staffName,
        customer_name: staffData.customerName,
        service_name: staffData.serviceName,
        appointment_date: staffData.dateTime,
        duration: staffData.duration,
        customer_phone: staffData.customerPhone,
      };

      const response = await emailjs.send(
        serviceId,
        staffTemplateId,
        templateParams
      );

      if (response.status === 200) {
        console.log("✅ Staff notification email sent successfully");
        return { success: true };
      } else {
        throw new Error(`EmailJS responded with status: ${response.status}`);
      }
    } catch (error) {
      console.error("❌ Failed to send staff notification email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown email error",
      };
    }
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      this.initialize();

      if (!this.isInitialized) {
        return { success: false, error: "EmailJS not initialized" };
      }

      const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
      const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;

      if (!serviceId || !templateId) {
        return {
          success: false,
          error: "EmailJS service ID or template ID not configured",
        };
      }

      // Send test email
      const templateParams = {
        to_email: "test@beautibook.com",
        customer_name: "Test Customer",
        service_name: "Test Service",
        staff_name: "Test Staff",
        appointment_date: "Test Date (PST)", // Test data - real appointments use PST formatting
        duration: "60 minutes",
        price: "$75.00",
        salon_name: "BeautiBook",
        customer_phone: "(555) 123-4567",
      };

      const response = await emailjs.send(
        serviceId,
        templateId,
        templateParams
      );

      return {
        success: response.status === 200,
        error:
          response.status !== 200 ? `Status: ${response.status}` : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get email configuration status
   */
  getConfigurationStatus(): {
    isConfigured: boolean;
    missingFields: string[];
  } {
    const requiredFields = [
      "NEXT_PUBLIC_EMAILJS_SERVICE_ID",
      "NEXT_PUBLIC_EMAILJS_TEMPLATE_ID",
      "NEXT_PUBLIC_EMAILJS_PUBLIC_KEY",
    ];

    const missingFields = requiredFields.filter((field) => !process.env[field]);

    return {
      isConfigured: missingFields.length === 0,
      missingFields,
    };
  }

  /**
   * Format booking data for email templates
   */
  formatBookingDataForEmail(
    booking: {
      customer_name: string;
      customer_phone: string;
      slot_datetime: Date;
      final_price: number;
      service: {
        name: string;
        duration_minutes: number;
      };
      staff: {
        name: string;
        user: {
          email: string;
        };
      };
    },
    customerEmail?: string
  ) {
    // Use timezone-safe date formatting for emails
    const components = parseIsoToPstComponents(
      booking.slot_datetime.toISOString()
    );
    const dateObj = parseISO(components.date + "T00:00:00");
    const dateTime =
      format(dateObj, "EEEE, MMMM d, yyyy") +
      " at " +
      components.display +
      " PST";

    const duration =
      booking.service.duration_minutes >= 60
        ? `${Math.floor(booking.service.duration_minutes / 60)}h ${
            booking.service.duration_minutes % 60
          }min`
        : `${booking.service.duration_minutes}min`;

    const price = `$${(booking.final_price / 100).toFixed(2)}`;

    return {
      customerName: booking.customer_name,
      customerEmail,
      customerPhone: booking.customer_phone,
      serviceName: booking.service.name,
      staffName: booking.staff.name,
      staffEmail: booking.staff.user.email,
      dateTime,
      duration,
      price,
    };
  }
}
