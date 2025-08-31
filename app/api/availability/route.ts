import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AvailabilityService } from "@/lib/services/AvailabilityService";
import { PrismaService } from "@/lib/services/PrismaService";
import { parseISO } from "date-fns";
import { DayOfWeek } from "@prisma/client";
import {
  createPstDateTime,
  dateToPstMidnight,
  dateStringToDayOfWeek as utilDayOfWeek,
  parseIsoToPstComponents,
} from "@/lib/utils/calendar";

// Convert day string to Prisma enum
function stringToDayOfWeekEnum(dayStr: string): DayOfWeek {
  return DayOfWeek[dayStr as keyof typeof DayOfWeek];
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

    // Use universal date utilities (server timezone independent)
    const pstMidnightIso = dateToPstMidnight(validDate);
    const pstDate = parseISO(pstMidnightIso);

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

    // Get staff availability for the date (timezone-insensitive)
    const dayOfWeekStr = utilDayOfWeek(validDate);
    const dayOfWeek = stringToDayOfWeekEnum(dayOfWeekStr);
    console.log(
      `[AVAILABILITY DEBUG] Checking ${staff.name} availability for ${validDate} (${dayOfWeek}) - timezone-insensitive lookup`
    );
    console.log(
      `[API DEBUG] Request params - Staff: ${validStaffId}, Service: ${validServiceId}, Date: ${validDate}, PST Date: ${pstDate.toISOString()}`
    );

    const staffAvailable = await availabilityService.getStaffAvailability(
      validStaffId,
      dayOfWeek,
      pstDate
    );

    console.log(
      `[AVAILABILITY DEBUG] Staff availability result:`,
      staffAvailable
    );

    if (!staffAvailable) {
      console.log(
        `[AVAILABILITY DEBUG] No availability found for ${staff.name} on ${dayOfWeek}`
      );
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
      pstDate, // Keep PST for time calculations
      service.duration_minutes,
      15 // 15-minute intervals
    );

    console.log(
      `[AVAILABILITY DEBUG] Generated ${availableSlotTimes.length} available slots for ${staff.name} on ${dayOfWeek}:`,
      availableSlotTimes
    );

    // Filter out past time slots before converting to frontend format
    const now = new Date();
    const validSlotTimes = availableSlotTimes.filter((timeStr) => {
      const datetimeIso = createPstDateTime(validDate, timeStr);
      const slotDateTime = parseISO(datetimeIso);
      return slotDateTime > now; // Only future slots
    });

    console.log(
      `[AVAILABILITY DEBUG] Filtered ${
        availableSlotTimes.length - validSlotTimes.length
      } past slots. Remaining: ${validSlotTimes.length}`
    );

    // Convert to frontend format with universal PST times
    const timeSlots: TimeSlot[] = validSlotTimes.map((timeStr) => {
      // Use universal timezone utility to create consistent PST datetime
      const datetimeIso = createPstDateTime(validDate, timeStr);
      const components = parseIsoToPstComponents(datetimeIso);

      return {
        time: components.display, // PST formatted display (e.g., "9:00 AM")
        datetime: datetimeIso, // Universal ISO string
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
