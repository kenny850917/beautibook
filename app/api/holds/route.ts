import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { BookingHoldService } from "@/lib/services/BookingHoldService";
import { AnalyticsService } from "@/lib/services/AnalyticsService";

// Validation schemas following backend.mdc Zod patterns
const CreateHoldSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  staffId: z.string().min(1, "Staff ID is required"),
  serviceId: z.string().min(1, "Service ID is required"),
  slotDateTime: z
    .string()
    .min(1, "Slot date/time is required")
    .refine((val) => {
      return !isNaN(Date.parse(val));
    }, "Invalid date/time format"),
});

const ReleaseHoldSchema = z.object({
  holdId: z.string().min(1, "Hold ID is required"),
});

const CheckHoldSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
});

/**
 * POST - Create new hold with session validation
 * Following backend.mdc API patterns
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input following backend.mdc
    const validationResult = CreateHoldSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid hold data",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { sessionId, staffId, serviceId, slotDateTime } =
      validationResult.data;

    // Parse slot date/time
    const slotDate = new Date(slotDateTime);

    // Validate slot is not in the past
    if (slotDate <= new Date()) {
      return NextResponse.json(
        { error: "Cannot create hold for past time slots" },
        { status: 400 }
      );
    }

    // Use singletons following backend.mdc
    const holdService = BookingHoldService.getInstance();
    const analyticsService = AnalyticsService.getInstance();

    // Create the hold
    const hold = await holdService.createHold(
      sessionId,
      staffId,
      serviceId,
      slotDate
    );

    // Track analytics (non-blocking)
    analyticsService
      .trackHoldCreation({
        sessionId,
        staffId,
        serviceId,
      })
      .catch((error) => {
        console.error("Analytics tracking failed:", error);
      });

    // Calculate remaining time for countdown
    const now = new Date();
    const remainingTime = Math.max(
      0,
      hold.expires_at.getTime() - now.getTime()
    );
    const remainingSeconds = Math.floor(remainingTime / 1000);

    return NextResponse.json(
      {
        success: true,
        message: "Hold created successfully",
        hold: {
          id: hold.id,
          sessionId: hold.session_id,
          staffId: hold.staff_id,
          serviceId: hold.service_id,
          slotDateTime: hold.slot_datetime.toISOString(),
          expiresAt: hold.expires_at.toISOString(),
          remainingSeconds,
          remainingTime: {
            minutes: Math.floor(remainingSeconds / 60),
            seconds: remainingSeconds % 60,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Hold creation error:", error);

    // Handle specific error cases following backend.mdc
    if (error instanceof Error) {
      if (
        error.message.includes("not available") ||
        error.message.includes("already held") ||
        error.message.includes("already booked")
      ) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 } // Conflict
        );
      }
    }

    return NextResponse.json(
      {
        error: "Failed to create hold",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Release hold before expiration
 * Following backend.mdc simple error handling
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const holdId = searchParams.get("holdId");

    // Validate input
    const validationResult = ReleaseHoldSchema.safeParse({ holdId });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid hold ID",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { holdId: validHoldId } = validationResult.data;

    // Use singleton following backend.mdc
    const holdService = BookingHoldService.getInstance();

    // Release the hold
    await holdService.releaseHold(validHoldId);

    return NextResponse.json({
      success: true,
      message: "Hold released successfully",
      holdId: validHoldId,
    });
  } catch (error) {
    console.error("Hold release error:", error);

    return NextResponse.json(
      {
        error: "Failed to release hold",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Check hold status with countdown timer
 * Following backend.mdc API patterns
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    // Validate input
    const validationResult = CheckHoldSchema.safeParse({ sessionId });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid session ID",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { sessionId: validSessionId } = validationResult.data;

    // Use singleton following backend.mdc
    const holdService = BookingHoldService.getInstance();

    // Get active hold for session
    const activeHold = await holdService.getActiveHoldBySession(validSessionId);

    if (!activeHold) {
      return NextResponse.json({
        success: true,
        hasActiveHold: false,
        message: "No active hold found for this session",
      });
    }

    // Calculate remaining time for countdown
    const now = new Date();
    const remainingTime = Math.max(
      0,
      activeHold.expires_at.getTime() - now.getTime()
    );
    const remainingSeconds = Math.floor(remainingTime / 1000);

    // Check if hold has expired
    if (remainingSeconds <= 0) {
      return NextResponse.json({
        success: true,
        hasActiveHold: false,
        expired: true,
        message: "Hold has expired",
      });
    }

    return NextResponse.json({
      success: true,
      hasActiveHold: true,
      hold: {
        id: activeHold.id,
        sessionId: activeHold.session_id,
        staffId: activeHold.staff_id,
        serviceId: activeHold.service_id,
        slotDateTime: activeHold.slot_datetime.toISOString(),
        expiresAt: activeHold.expires_at.toISOString(),
        remainingSeconds,
        remainingTime: {
          minutes: Math.floor(remainingSeconds / 60),
          seconds: remainingSeconds % 60,
        },
        // Include related data if available
        staff: undefined, // TODO: Fix when BookingHoldService types are updated
        service: undefined, // TODO: Fix when BookingHoldService types are updated
      },
    });
  } catch (error) {
    console.error("Hold status check error:", error);

    return NextResponse.json(
      {
        error: "Failed to check hold status",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
