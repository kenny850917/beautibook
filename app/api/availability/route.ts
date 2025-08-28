import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AvailabilityService } from "@/lib/services/AvailabilityService";
import { BookingHoldService } from "@/lib/services/BookingHoldService";
import { PrismaService } from "@/lib/services/PrismaService";
import {
  format,
  parseISO,
  addMinutes,
  startOfDay,
  endOfDay,
  getDay,
} from "date-fns";
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

    // Get day boundaries in PST
    const dayStart = startOfDay(pstDate);
    const dayEnd = endOfDay(pstDate);

    // Use singletons following backend.mdc
    const availabilityService = AvailabilityService.getInstance();
    const holdService = BookingHoldService.getInstance();
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

    // Get existing bookings for the day
    const existingBookings = await prisma.booking.findMany({
      where: {
        staff_id: validStaffId,
        slot_datetime: {
          gte: fromZonedTime(dayStart, PST_TIMEZONE),
          lte: fromZonedTime(dayEnd, PST_TIMEZONE),
        },
      },
      include: {
        service: true,
      },
    });

    // Get active holds for the day
    const activeHolds = await prisma.bookingHold.findMany({
      where: {
        staff_id: validStaffId,
        slot_datetime: {
          gte: fromZonedTime(dayStart, PST_TIMEZONE),
          lte: fromZonedTime(dayEnd, PST_TIMEZONE),
        },
        expires_at: {
          gt: new Date(), // Only active holds
        },
      },
    });

    // Generate 15-minute time slots following requirements
    const timeSlots = await generateTimeSlots(
      [staffAvailable], // Wrap single availability object in array
      service,
      existingBookings,
      activeHolds,
      pstDate
    );

    return NextResponse.json({
      success: true,
      slots: timeSlots,
      totalSlots: timeSlots.length,
      availableSlots: timeSlots.filter((slot) => slot.available).length,
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

/**
 * Generate 15-minute time slots with availability checking
 * Following backend.mdc simple logic patterns
 */
async function generateTimeSlots(
  staffAvailability: Array<{ start_time: string; end_time: string }>,
  service: { id: string; duration_minutes: number },
  existingBookings: Array<{
    slot_datetime: Date;
    service: { duration_minutes: number };
  }>,
  activeHolds: Array<{ slot_datetime: Date }>,
  date: Date
): Promise<TimeSlot[]> {
  const slots: TimeSlot[] = [];
  const slotInterval = 15; // 15-minute intervals
  const serviceDuration = service.duration_minutes;

  for (const availability of staffAvailability) {
    // Parse availability times in PST
    const [startHour, startMinute] = availability.start_time
      .split(":")
      .map(Number);
    const [endHour, endMinute] = availability.end_time.split(":").map(Number);

    const availabilityStart = new Date(date);
    availabilityStart.setHours(startHour, startMinute, 0, 0);

    const availabilityEnd = new Date(date);
    availabilityEnd.setHours(endHour, endMinute, 0, 0);

    // Generate slots in 15-minute intervals
    let currentSlot = new Date(availabilityStart);

    while (currentSlot < availabilityEnd) {
      // Check if this slot can accommodate the full service
      const slotEnd = addMinutes(currentSlot, serviceDuration);

      if (slotEnd <= availabilityEnd) {
        // Convert to UTC for database operations
        const utcSlotTime = fromZonedTime(currentSlot, PST_TIMEZONE);

        // Check availability
        const slotAvailability = checkSlotAvailability(
          utcSlotTime,
          serviceDuration,
          existingBookings,
          activeHolds
        );

        // Format PST time for display
        const pstTimeString = format(currentSlot, "h:mm a");

        slots.push({
          time: pstTimeString,
          datetime: utcSlotTime.toISOString(),
          available: slotAvailability.available,
          reason: slotAvailability.reason,
        });
      }

      // Move to next 15-minute interval
      currentSlot = addMinutes(currentSlot, slotInterval);
    }
  }

  return slots;
}

/**
 * Check if a specific time slot is available
 * Following backend.mdc simple validation logic
 */
function checkSlotAvailability(
  slotTime: Date,
  serviceDuration: number,
  existingBookings: Array<{
    slot_datetime: Date;
    service: { duration_minutes: number };
  }>,
  activeHolds: Array<{ slot_datetime: Date }>
): { available: boolean; reason?: string } {
  const slotEnd = addMinutes(slotTime, serviceDuration);

  // Check for exact booking conflicts
  const exactBooking = existingBookings.find(
    (booking) => booking.slot_datetime.getTime() === slotTime.getTime()
  );

  if (exactBooking) {
    return { available: false, reason: "Time slot already booked" };
  }

  // Check for overlapping bookings
  const hasOverlap = existingBookings.some((booking) => {
    const bookingEnd = addMinutes(
      booking.slot_datetime,
      booking.service.duration_minutes
    );

    // Check if new slot overlaps with existing booking
    return (
      (slotTime >= booking.slot_datetime && slotTime < bookingEnd) ||
      (slotEnd > booking.slot_datetime && slotEnd <= bookingEnd) ||
      (slotTime <= booking.slot_datetime && slotEnd >= bookingEnd)
    );
  });

  if (hasOverlap) {
    return { available: false, reason: "Conflicts with existing booking" };
  }

  // Check for active holds
  const holdConflict = activeHolds.find(
    (hold) => hold.slot_datetime.getTime() === slotTime.getTime()
  );

  if (holdConflict) {
    return { available: false, reason: "Time slot currently held" };
  }

  // Check if slot is in the past
  const now = new Date();
  if (slotTime <= now) {
    return { available: false, reason: "Time slot is in the past" };
  }

  return { available: true };
}
