import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CustomerService } from "@/lib/services/CustomerService";

// Type definitions for booking analysis
interface BookingForAnalysis {
  id: string;
  slot_datetime: Date;
  final_price: number;
  created_at: Date;
  service?: {
    id: string;
    name: string;
    duration_minutes: number;
  } | null;
  staff?: {
    id: string;
    name: string;
  } | null;
}

/**
 * GET - Fetch specific customer with booking history
 * Admin-only endpoint for customer detail modal
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get customer ID from params
    const { id: customerId } = await params;

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 }
      );
    }

    // Use CustomerService to get customer with booking history
    const customerService = CustomerService.getInstance();
    const customerWithHistory =
      await customerService.getCustomerWithBookingHistory(customerId);

    if (!customerWithHistory) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Calculate customer segment
    const segment = getCustomerSegment(customerWithHistory);

    // Format booking history for frontend
    const formattedBookings = customerWithHistory.bookings.map((booking) => ({
      id: booking.id,
      slot_datetime: booking.slot_datetime,
      final_price: booking.final_price,
      created_at: booking.created_at,
      service: {
        id: booking.service?.id || "",
        name: booking.service?.name || "Unknown Service",
        duration_minutes: booking.service?.duration_minutes || 0,
      },
      staff: {
        id: booking.staff?.id || "",
        name: booking.staff?.name || "Unknown Staff",
      },
    }));

    // Calculate customer insights
    const insights = {
      averageSpent:
        customerWithHistory.bookings.length > 0
          ? customerWithHistory.total_spent /
            customerWithHistory.bookings.length
          : 0,
      bookingFrequency: calculateBookingFrequency(customerWithHistory.bookings),
      preferredTimeSlots: getPreferredTimeSlots(customerWithHistory.bookings),
      seasonalPattern: getSeasonalPattern(customerWithHistory.bookings),
      noShowRate: 0, // TODO: Implement when we add booking status tracking
    };

    return NextResponse.json({
      success: true,
      customer: {
        ...customerWithHistory,
        segment,
        bookings: formattedBookings,
        insights,
      },
    });
  } catch (error) {
    console.error("Error fetching customer details:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch customer details",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Customer segmentation logic (same as in the list endpoint)
 */
function getCustomerSegment(customer: {
  total_spent: number;
  total_bookings: number;
  created_at: Date;
}): "VIP" | "Gold" | "Regular" | "New" {
  if (customer.total_spent >= 100000) return "VIP";
  if (customer.total_spent >= 50000) return "Gold";
  if (customer.total_bookings >= 5) return "Regular";
  return "New";
}

/**
 * Calculate booking frequency in bookings per month
 */
function calculateBookingFrequency(bookings: BookingForAnalysis[]): number {
  if (bookings.length === 0) return 0;

  const now = new Date();
  const oldestBooking = new Date(
    Math.min(...bookings.map((b) => new Date(b.slot_datetime).getTime()))
  );
  const monthsDiff =
    (now.getTime() - oldestBooking.getTime()) / (1000 * 60 * 60 * 24 * 30);

  return monthsDiff > 0 ? bookings.length / monthsDiff : bookings.length;
}

/**
 * Analyze preferred time slots (morning, afternoon, evening)
 */
function getPreferredTimeSlots(bookings: BookingForAnalysis[]): {
  morning: number;
  afternoon: number;
  evening: number;
} {
  const timeSlots = { morning: 0, afternoon: 0, evening: 0 };

  bookings.forEach((booking) => {
    const hour = new Date(booking.slot_datetime).getHours();
    if (hour < 12) timeSlots.morning++;
    else if (hour < 17) timeSlots.afternoon++;
    else timeSlots.evening++;
  });

  return timeSlots;
}

/**
 * Analyze seasonal booking patterns
 */
function getSeasonalPattern(bookings: BookingForAnalysis[]): {
  spring: number;
  summer: number;
  fall: number;
  winter: number;
} {
  const seasons = { spring: 0, summer: 0, fall: 0, winter: 0 };

  bookings.forEach((booking) => {
    const month = new Date(booking.slot_datetime).getMonth();
    if (month >= 2 && month <= 4) seasons.spring++;
    else if (month >= 5 && month <= 7) seasons.summer++;
    else if (month >= 8 && month <= 10) seasons.fall++;
    else seasons.winter++;
  });

  return seasons;
}
