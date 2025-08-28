/**
 * Convert Hold to Booking API
 * Endpoint for converting a booking hold into a confirmed booking
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { BookingHoldService } from "@/lib/services/BookingHoldService";
import { BookingService } from "@/lib/services/BookingService";
import { CustomerService } from "@/lib/services/CustomerService";
import { AnalyticsService } from "@/lib/services/AnalyticsService";

// Validation schema for booking confirmation
const ConvertHoldSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z.string().min(10, "Valid phone number is required"),
  customerEmail: z.string().email().optional().or(z.literal("")),
  marketingConsent: z.boolean().optional().default(false),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ holdId: string }> }
) {
  try {
    const { holdId } = await params;

    if (!holdId) {
      return NextResponse.json(
        {
          success: false,
          error: "Hold ID is required",
        },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = ConvertHoldSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid input data",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { customerName, customerPhone, customerEmail, marketingConsent } =
      validationResult.data;

    // Get service instances
    const holdService = BookingHoldService.getInstance();
    const bookingService = BookingService.getInstance();
    const customerService = CustomerService.getInstance();
    const analyticsService = AnalyticsService.getInstance();

    // Get hold details
    const hold = await holdService.getHoldById(holdId);
    if (!hold) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Your hold has expired. Please select a new time slot to continue booking.",
        },
        { status: 410 } // Gone - more appropriate for expired resource
      );
    }

    // Check if hold is still valid (not expired)
    if (new Date() > new Date(hold.expires_at)) {
      return NextResponse.json(
        {
          success: false,
          error: "Hold has expired",
        },
        { status: 410 }
      );
    }

    // Convert hold to booking FIRST (prevents race condition with cleanup)
    await holdService.convertHoldToBooking(holdId);

    // Create or update customer record
    const customer = await customerService.findOrCreateGuestCustomer({
      name: customerName,
      phone: customerPhone,
      email: customerEmail || undefined,
      marketingConsent: marketingConsent || false,
    });

    // Create the booking with customer linkage
    const booking = await bookingService.createBooking(
      hold.staff_id,
      hold.service_id,
      hold.slot_datetime,
      customerName,
      customerPhone,
      hold.session_id,
      customer.id, // Link to customer
      customerEmail || undefined
    );

    // Update customer statistics after booking creation
    await customerService.updateCustomerAfterBooking(customer.id, {
      final_price: booking.final_price,
      slot_datetime: booking.slot_datetime,
      service_id: booking.service_id,
      staff_id: booking.staff_id,
    });

    // Track conversion analytics
    await analyticsService.trackHoldConversion(
      hold.session_id,
      hold.staff_id,
      hold.service_id
    );

    return NextResponse.json({
      success: true,
      message: "Booking confirmed successfully",
      booking: {
        id: booking.id,
        staff_id: booking.staff_id,
        service_id: booking.service_id,
        slot_datetime: booking.slot_datetime,
        customer_name: booking.customer_name,
        customer_phone: booking.customer_phone,
        final_price: booking.final_price,
        created_at: booking.created_at,
      },
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        isReturning: customer.total_bookings > 0, // Now they have at least 1 booking
        totalBookings: customer.total_bookings + 1, // Include the booking we just created
        totalSpent: customer.total_spent + booking.final_price,
        marketingConsent: customer.marketing_consent,
      },
    });
  } catch (error) {
    console.error("Error converting hold to booking:", error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("Hold not found")) {
        return NextResponse.json(
          {
            success: false,
            error: "Hold not found or has expired",
          },
          { status: 404 }
        );
      }

      if (error.message.includes("Slot already booked")) {
        return NextResponse.json(
          {
            success: false,
            error: "This time slot is no longer available",
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to confirm booking. Please try again.",
      },
      { status: 500 }
    );
  }
}
