/**
 * Slot Validation API
 * Validates if a specific time slot is still available for booking
 * Used to prevent double-bookings when users click on time slots
 */

import { NextRequest, NextResponse } from "next/server";
import { BookingHoldService } from "@/lib/services/BookingHoldService";
import { z } from "zod";

const validateRequestSchema = z.object({
  staffId: z.string().min(1, "Staff ID is required"),
  serviceId: z.string().min(1, "Service ID is required"),
  datetime: z.string().min(1, "DateTime is required"),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get("staffId");
    const serviceId = searchParams.get("serviceId");
    const datetime = searchParams.get("datetime");

    // Validate required parameters
    const validation = validateRequestSchema.safeParse({
      staffId,
      serviceId,
      datetime,
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          available: false,
          error: "Missing required parameters",
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const {
      staffId: validStaffId,
      serviceId: validServiceId,
      datetime: validDatetime,
    } = validation.data;

    // Parse and validate datetime
    const slotDateTime = new Date(validDatetime);
    if (isNaN(slotDateTime.getTime())) {
      return NextResponse.json(
        {
          success: false,
          available: false,
          error: "Invalid datetime format",
        },
        { status: 400 }
      );
    }

    const holdService = BookingHoldService.getInstance();

    // Check if the specific slot is available
    const slotAvailability = await holdService.checkSlotAvailability(
      validStaffId,
      slotDateTime
    );

    return NextResponse.json({
      success: true,
      available: slotAvailability.available,
      reason: slotAvailability.reason,
      slot: {
        staffId: validStaffId,
        serviceId: validServiceId,
        datetime: validDatetime,
      },
    });
  } catch (error) {
    console.error("Error validating slot availability:", error);

    return NextResponse.json(
      {
        success: false,
        available: false,
        error: "Failed to validate slot availability. Please try again later.",
      },
      { status: 500 }
    );
  }
}
