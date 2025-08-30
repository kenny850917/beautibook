import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AvailabilityService } from "@/lib/services/AvailabilityService";
import { PrismaService } from "@/lib/services/PrismaService";
import { format, parseISO, getDay } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { DayOfWeek } from "@prisma/client";

// PST timezone constant following frontend.mdc
const PST_TIMEZONE = "America/Los_Angeles";

// Convert Date to DayOfWeek enum
function dateToDayOfWeek(date: Date): DayOfWeek {
  const dayNumber = getDay(date); // 0 = Sunday, 1 = Monday, etc.
  const dayMap: DayOfWeek[] = [
    DayOfWeek.SUNDAY,
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
    DayOfWeek.SATURDAY,
  ];
  return dayMap[dayNumber];
}

// Validation schema following backend.mdc Zod patterns
const AvailabilityQuerySchema = z.object({
  staffId: z.string().min(1, "Staff ID is required"),
  serviceId: z.string().min(1, "Service ID is required"),
  date: z
    .string()
    .min(1, "Date is required")
    .refine((val) => {
      return !isNaN(Date.parse(val));
    }, "Invalid date format"),
});

interface TimeSlot {
  time: string; // PST formatted time for display (e.g., "9:00 AM")
  datetime: string; // ISO string
  available: boolean;
  reason?: string;
}

/**
 * GET - Available time slots for staff/service/date
 * Following backend.mdc API patterns with simple error handling
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get("staff");
    const serviceId = searchParams.get("service");
    const date = searchParams.get("date");

    // Validate input following backend.mdc
    const validationResult = AvailabilityQuerySchema.safeParse({
      staffId,
      serviceId,
      date,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const {
      staffId: validStaffId,
      serviceId: validServiceId,
      date: validDate,
    } = validationResult.data;

    // Parse date and convert to PST following frontend.mdc timezone handling
    const requestDate = parseISO(validDate);
    const pstDate = toZonedTime(requestDate, PST_TIMEZONE);

    // Use singletons following backend.mdc
    const availabilityService = AvailabilityService.getInstance();
    const prisma = PrismaService.getInstance();

    // Validate staff and service exist
    const [staff, service] = await Promise.all([
      prisma.staff.findUnique({
        where: { id: validStaffId },
        include: { user: true },
      }),
      prisma.service.findUnique({
        where: { id: validServiceId },
      }),
    ]);

    if (!staff) {
      return NextResponse.json(
        { error: "Staff member not found" },
        { status: 404 }
      );
    }

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Check if staff can perform this service
    if (!staff.services.includes(validServiceId)) {
      return NextResponse.json(
        { error: "Staff member cannot perform this service" },
        { status: 400 }
      );
    }

    // Get staff availability for the date
    const dayOfWeek = dateToDayOfWeek(pstDate);
    const staffAvailable = await availabilityService.getStaffAvailability(
      validStaffId,
      dayOfWeek,
      pstDate
    );

    if (!staffAvailable) {
      return NextResponse.json({
        success: true,
        slots: [],
        message: "Staff member is not available on this date",
        date: validDate,
        staffId: validStaffId,
        serviceId: validServiceId,
      });
    }

    // Use the updated AvailabilityService which factors in schedule blocks
    const availableSlotTimes = await availabilityService.getAvailableSlots(
      validStaffId,
      pstDate,
      service.duration_minutes,
      15 // 15-minute intervals
    );

    // Convert to frontend format with PST times
    const timeSlots: TimeSlot[] = availableSlotTimes.map((timeStr) => {
      // Parse the time string (e.g., "09:00") and create PST date
      const [hour, minute] = timeStr.split(":").map(Number);
      const pstSlotTime = new Date(pstDate);
      pstSlotTime.setHours(hour, minute, 0, 0);

      // Convert to UTC for storage
      const utcSlotTime = fromZonedTime(pstSlotTime, PST_TIMEZONE);

      return {
        time: format(pstSlotTime, "h:mm a"), // PST formatted for display
        datetime: utcSlotTime.toISOString(),
        available: true, // These are already filtered as available
      };
    });

    return NextResponse.json({
      success: true,
      slots: timeSlots,
      totalSlots: timeSlots.length,
      availableSlots: timeSlots.length, // All returned slots are available
      date: validDate,
      staffId: validStaffId,
      serviceId: validServiceId,
      staffName: staff.name,
      serviceName: service.name,
      serviceDuration: service.duration_minutes,
    });
  } catch (error) {
    console.error("Availability API error:", error);

    // Simple error handling following backend.mdc
    return NextResponse.json(
      {
        error: "Failed to get availability",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
