/**
 * Individual Booking API
 * Endpoint for fetching details of a specific booking
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaService } from "@/lib/services/PrismaService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;

    if (!bookingId) {
      return NextResponse.json(
        {
          success: false,
          error: "Booking ID is required",
        },
        { status: 400 }
      );
    }

    const prisma = PrismaService.getInstance();

    // Fetch the specific booking with related data
    const booking = await prisma.booking.findUnique({
      where: {
        id: bookingId,
      },
      select: {
        id: true,
        staff_id: true,
        service_id: true,
        slot_datetime: true,
        customer_name: true,
        customer_phone: true,
        customer_email: true,
        customer_id: true,
        final_price: true,
        created_at: true,
        staff: {
          select: {
            id: true,
            name: true,
            photo_url: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            duration_minutes: true,
            base_price: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        {
          success: false,
          error: "Booking not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error("Error fetching booking:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch booking details. Please try again later.",
      },
      { status: 500 }
    );
  }
}
