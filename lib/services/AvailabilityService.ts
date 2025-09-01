import { prisma } from "./PrismaService";
import { DayOfWeek } from "@prisma/client";
import {
  isWithinInterval,
  parse,
  format,
  parseISO,
  addMinutes,
} from "date-fns";
import {
  parseIsoToPstComponents,
  createPstDateTime,
  PST_TIMEZONE,
  checkTimeOverlap,
  getCurrentUtcTime,
  createUtcDateRange,
} from "@/lib/utils/calendar";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

/**
 * Singleton service for staff availability management
 * Handles schedule creation, time-off, and availability checking
 */
export class AvailabilityService {
  private static instance: AvailabilityService;

  /**
   * Format Date object to PST time string for debug logging
   */
  private formatPstTime(date: Date): string {
    const pstDate = toZonedTime(date, PST_TIMEZONE);
    return format(pstDate, "h:mm a");
  }

  /**
   * Convert HH:mm time string to display format (for slot logging)
   */
  private formatSlotTime(timeStr: string): string {
    const [hours, minutes] = timeStr.split(":");
    const hour24 = parseInt(hours);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? "PM" : "AM";
    return `${hour12}:${minutes} ${ampm}`;
  }

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): AvailabilityService {
    if (!AvailabilityService.instance) {
      AvailabilityService.instance = new AvailabilityService();
    }
    return AvailabilityService.instance;
  }

  /**
   * Get staff availability for a specific day with schedule blocks
   */
  async getStaffAvailability(
    staffId: string,
    dayOfWeek: DayOfWeek,
    date?: Date
  ) {
    // Check for date-specific overrides first
    if (date) {
      const override = await prisma.staffAvailability.findFirst({
        where: {
          staff_id: staffId,
          override_date: date,
        },
        include: {
          scheduleBlocks: {
            orderBy: [{ block_start_time: "asc" }],
          },
        },
      });

      console.log(
        `[AVAILABILITY DEBUG] Checking override for date ${format(
          date,
          "yyyy-MM-dd"
        )}:`,
        override
      );

      if (override) {
        return override;
      }
    }

    // Get regular weekly schedule with blocks
    const regularSchedule = await prisma.staffAvailability.findFirst({
      where: {
        staff_id: staffId,
        day_of_week: dayOfWeek,
        override_date: null,
      },
      include: {
        scheduleBlocks: {
          orderBy: [{ block_start_time: "asc" }],
        },
      },
    });

    console.log(
      `[AVAILABILITY DEBUG] Regular schedule for ${dayOfWeek}:`,
      regularSchedule
    );
    return regularSchedule;
  }

  /**
   * Get all availability for a staff member with schedule blocks
   */
  async getAllStaffAvailability(staffId: string) {
    return await prisma.staffAvailability.findMany({
      where: {
        staff_id: staffId,
      },
      include: {
        scheduleBlocks: {
          orderBy: [{ block_start_time: "asc" }],
        },
      },
      orderBy: [
        { override_date: "asc" },
        { day_of_week: "asc" },
        { start_time: "asc" },
      ],
    });
  }

  /**
   * Create or update staff availability
   */
  async setStaffAvailability(
    staffId: string,
    dayOfWeek: DayOfWeek,
    startTime: string,
    endTime: string,
    overrideDate?: Date
  ) {
    const data = {
      staff_id: staffId,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      override_date: overrideDate || null,
    };

    // Check if availability already exists
    const existing = await prisma.staffAvailability.findFirst({
      where: {
        staff_id: staffId,
        day_of_week: dayOfWeek,
        override_date: overrideDate || null,
      },
    });

    if (existing) {
      return await prisma.staffAvailability.update({
        where: { id: existing.id },
        data: {
          start_time: startTime,
          end_time: endTime,
        },
      });
    } else {
      return await prisma.staffAvailability.create({
        data,
      });
    }
  }

  /**
   * Remove staff availability (for time off)
   */
  async removeStaffAvailability(
    staffId: string,
    dayOfWeek: DayOfWeek,
    overrideDate?: Date
  ) {
    const where = {
      staff_id: staffId,
      day_of_week: dayOfWeek,
      override_date: overrideDate || null,
    };

    return await prisma.staffAvailability.deleteMany({
      where,
    });
  }

  /**
   * Check if staff is available at a specific time (factoring in schedule blocks)
   */
  async isStaffAvailable(
    staffId: string,
    dateTime: Date,
    durationMinutes: number
  ): Promise<boolean> {
    const dayOfWeek = this.getDayOfWeekFromDate(dateTime);
    const availability = await this.getStaffAvailability(
      staffId,
      dayOfWeek,
      dateTime
    );

    if (!availability) {
      return false;
    }

    // Check if this is a time-off override (00:00 to 00:00 means not available)
    if (
      availability.start_time === "00:00" &&
      availability.end_time === "00:00"
    ) {
      return false;
    }

    // Check if the time slot falls within availability hours
    const requestedTime = format(dateTime, "HH:mm");
    const endTime = new Date(dateTime.getTime() + durationMinutes * 60000);
    const requestedEndTime = format(endTime, "HH:mm");

    // First check if it's within working hours
    const withinWorkingHours =
      this.isTimeWithinRange(
        requestedTime,
        availability.start_time,
        availability.end_time
      ) &&
      this.isTimeWithinRange(
        requestedEndTime,
        availability.start_time,
        availability.end_time
      );

    if (!withinWorkingHours) {
      return false;
    }

    // Check if the time conflicts with any schedule blocks
    if (availability.scheduleBlocks && availability.scheduleBlocks.length > 0) {
      const hasBlockConflict = availability.scheduleBlocks.some((block) => {
        // Check if requested time overlaps with any block
        return (
          (requestedTime >= block.block_start_time &&
            requestedTime < block.block_end_time) ||
          (requestedEndTime > block.block_start_time &&
            requestedEndTime <= block.block_end_time) ||
          (requestedTime <= block.block_start_time &&
            requestedEndTime >= block.block_end_time)
        );
      });

      if (hasBlockConflict) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get available time slots for a staff member on a specific date (factoring in schedule blocks)
   */
  async getAvailableSlots(
    staffId: string,
    date: Date,
    serviceDurationMinutes: number,
    slotIntervalMinutes: number = 15
  ): Promise<string[]> {
    // Clean up expired holds first to prevent stale availability data
    const { BookingHoldService } = await import("./BookingHoldService");
    await BookingHoldService.getInstance().cleanupExpiredHolds();

    const dayOfWeek = this.getDayOfWeekFromDate(date);
    const availability = await this.getStaffAvailability(
      staffId,
      dayOfWeek,
      date
    );

    if (!availability) {
      return [];
    }

    // Check if this is a time-off override (00:00 to 00:00 means not available)
    if (
      availability.start_time === "00:00" &&
      availability.end_time === "00:00"
    ) {
      console.log(
        `[SLOTS DEBUG] Time-off detected for staff ${staffId} on ${format(
          date,
          "yyyy-MM-dd"
        )}`
      );
      return [];
    }

    console.log(
      `[SLOTS DEBUG] Staff ${staffId} availability on ${format(
        date,
        "yyyy-MM-dd"
      )}: ${availability.start_time} - ${availability.end_time}`
    );

    // ✅ UTC NORMALIZATION: Use standardized date range utilities
    const dateStr = date.toISOString().split("T")[0]; // Extract YYYY-MM-DD
    const { startUtc, endUtc } = createUtcDateRange(dateStr);

    console.log(
      `[TIMEZONE DEBUG] Input date: ${date.toISOString()}, Timezone: ${
        Intl.DateTimeFormat().resolvedOptions().timeZone
      }, startUtc: ${startUtc.toISOString()}, endUtc: ${endUtc.toISOString()}`
    );

    const existingBookings = await prisma.booking.findMany({
      where: {
        staff_id: staffId,
        slot_datetime: {
          gte: startUtc,
          lte: endUtc,
        },
      },
      include: {
        service: true,
      },
    });

    console.log(
      `[AVAILABILITY DEBUG] Found ${
        existingBookings.length
      } existing bookings for staff ${staffId} on ${format(date, "yyyy-MM-dd")}`
    );
    console.log(
      `[QUERY DEBUG] Staff ID: ${staffId}, Service ID: ${serviceDurationMinutes}min service, Querying date range: ${startUtc.toISOString()} to ${endUtc.toISOString()}`
    );
    console.log(
      `[ENVIRONMENT DEBUG] Server time: ${getCurrentUtcTime().toISOString()}, Date range: ${this.formatPstTime(
        startUtc
      )} to ${this.formatPstTime(endUtc)} PST`
    );
    existingBookings.forEach((booking) => {
      const bookingEnd = new Date(
        booking.slot_datetime.getTime() +
          booking.service.duration_minutes * 60000
      );
      console.log(
        `[AVAILABILITY DEBUG] Existing booking: ${this.formatPstTime(
          booking.slot_datetime
        )} - ${this.formatPstTime(bookingEnd)} (${
          booking.service.duration_minutes
        }min) [ISO: ${booking.slot_datetime.toISOString()}] [Staff: ${
          booking.staff_id
        }] [Service: ${booking.service_id}]`
      );
    });

    // ✅ UTC NORMALIZATION: Get active holds using UTC utilities
    const now = getCurrentUtcTime();
    console.log(
      `[AVAILABILITY DEBUG] Checking holds for staff ${staffId} at ${now.toISOString()}`
    );

    const activeHolds = await prisma.bookingHold.findMany({
      where: {
        staff_id: staffId,
        expires_at: {
          gt: now,
        },
        slot_datetime: {
          gte: startUtc,
          lte: endUtc,
        },
      },
      include: {
        service: true,
      },
    });

    console.log(
      `[AVAILABILITY DEBUG] ${dateStr}: ${existingBookings.length} bookings, ${activeHolds.length} active holds to check`
    );

    // Generate potential slots using PST timezone
    const slots: string[] = [];
    // Create PST midnight for this date to use as base for time parsing
    const pstMidnight = parseISO(createPstDateTime(dateStr, "00:00"));
    const startTime = parse(availability.start_time, "HH:mm", pstMidnight);
    const endTime = parse(availability.end_time, "HH:mm", pstMidnight);

    let currentSlot = startTime;

    while (currentSlot < endTime) {
      const slotEndTime = addMinutes(currentSlot, serviceDurationMinutes);

      // Check if slot end time is within availability
      if (slotEndTime <= endTime) {
        const slotTime = format(currentSlot, "HH:mm");
        const slotEndTimeStr = format(slotEndTime, "HH:mm");

        // Check for conflicts with schedule blocks
        const hasBlockConflict =
          availability.scheduleBlocks &&
          availability.scheduleBlocks.some((block) => {
            return (
              (slotTime >= block.block_start_time &&
                slotTime < block.block_end_time) ||
              (slotEndTimeStr > block.block_start_time &&
                slotEndTimeStr <= block.block_end_time) ||
              (slotTime <= block.block_start_time &&
                slotEndTimeStr >= block.block_end_time)
            );
          });

        // ✅ UTC NORMALIZATION: Use standardized overlap detection for bookings
        const hasBookingConflict = existingBookings.some((booking) => {
          const bookingEnd = new Date(
            booking.slot_datetime.getTime() +
              booking.service.duration_minutes * 60000
          );

          // ✅ PROPER FIX: Convert PST slot times to UTC using timezone utilities
          const slotStartUtc = fromZonedTime(currentSlot, PST_TIMEZONE); // PST to UTC (handles DST)
          const slotEndUtc = fromZonedTime(slotEndTime, PST_TIMEZONE); // PST to UTC (handles DST)

          // Use standardized UTC-aware overlap detection (all UTC now)
          const hasOverlap = checkTimeOverlap(
            booking.slot_datetime, // Booking start (UTC)
            bookingEnd, // Booking end (UTC)
            slotStartUtc, // Slot start (UTC - converted)
            slotEndUtc // Slot end (UTC - converted)
          );

          // Only log conflicts, not every check
          if (hasOverlap) {
            console.log(
              `[BOOKING CONFLICT] ❌ Slot ${this.formatSlotTime(
                slotTime
              )} - ${this.formatSlotTime(
                slotEndTimeStr
              )} conflicts with booking ${this.formatPstTime(
                booking.slot_datetime
              )} - ${this.formatPstTime(bookingEnd)}`
            );
          }

          return hasOverlap;
        });

        // ✅ UTC NORMALIZATION: Use standardized overlap detection
        const hasHoldConflict = activeHolds.some((hold) => {
          const holdEnd = addMinutes(
            hold.slot_datetime,
            hold.service.duration_minutes
          );

          // ✅ PROPER FIX: Convert PST slot times to UTC using timezone utilities
          const slotStartUtc = fromZonedTime(currentSlot, PST_TIMEZONE); // PST to UTC (handles DST)
          const slotEndUtc = fromZonedTime(slotEndTime, PST_TIMEZONE); // PST to UTC (handles DST)

          // Use standardized UTC-aware overlap detection (all UTC now)
          const hasOverlap = checkTimeOverlap(
            hold.slot_datetime, // Hold start (UTC)
            holdEnd, // Hold end (UTC)
            slotStartUtc, // Slot start (UTC - converted)
            slotEndUtc // Slot end (UTC - converted)
          );

          // Only log conflicts, not every check
          if (hasOverlap) {
            console.log(
              `[HOLD CONFLICT] ❌ Slot ${this.formatSlotTime(
                slotTime
              )} - ${this.formatSlotTime(
                slotEndTimeStr
              )} conflicts with hold ${this.formatPstTime(
                hold.slot_datetime
              )} - ${this.formatPstTime(holdEnd)}`
            );
          }

          return hasOverlap;
        });

        const slotIsAvailable =
          !hasBlockConflict && !hasBookingConflict && !hasHoldConflict;

        console.log(
          `[SLOT DECISION] ${slotTime}: Block=${
            hasBlockConflict ? "❌" : "✅"
          }, Booking=${hasBookingConflict ? "❌" : "✅"}, Hold=${
            hasHoldConflict ? "❌" : "✅"
          } → ${slotIsAvailable ? "AVAILABLE" : "BLOCKED"}`
        );

        if (slotIsAvailable) {
          slots.push(slotTime);
        }
      }

      currentSlot = addMinutes(currentSlot, slotIntervalMinutes);
    }

    console.log(
      `[AVAILABILITY SUMMARY] ${dateStr} ${this.formatSlotTime(
        availability.start_time
      )}-${this.formatSlotTime(availability.end_time)}: ${
        slots.length
      } available slots (filtered ${existingBookings.length} bookings, ${
        activeHolds.length
      } holds)`
    );

    return slots;
  }

  /**
   * Get day of week enum from Date object (timezone-safe)
   */
  private getDayOfWeekFromDate(date: Date): DayOfWeek {
    // Convert Date to ISO and use timezone-safe parsing
    const isoString = date.toISOString();
    const components = parseIsoToPstComponents(isoString);

    const dayMap = {
      0: DayOfWeek.SUNDAY,
      1: DayOfWeek.MONDAY,
      2: DayOfWeek.TUESDAY,
      3: DayOfWeek.WEDNESDAY,
      4: DayOfWeek.THURSDAY,
      5: DayOfWeek.FRIDAY,
      6: DayOfWeek.SATURDAY,
    };

    return dayMap[components.dayOfWeek as keyof typeof dayMap];
  }

  /**
   * Check if time is within a range
   */
  private isTimeWithinRange(
    time: string,
    startTime: string,
    endTime: string
  ): boolean {
    const checkTime = parse(time, "HH:mm", new Date());
    const start = parse(startTime, "HH:mm", new Date());
    const end = parse(endTime, "HH:mm", new Date());

    return isWithinInterval(checkTime, { start, end });
  }

  /**
   * Get staff members available for a service at a specific time
   */
  async getAvailableStaffForService(
    serviceId: string,
    dateTime: Date,
    durationMinutes: number
  ): Promise<string[]> {
    // Get all staff who can perform this service
    const staffWithService = await prisma.staff.findMany({
      where: {
        services: {
          has: serviceId,
        },
      },
    });

    const availableStaff: string[] = [];

    for (const staff of staffWithService) {
      const isAvailable = await this.isStaffAvailable(
        staff.id,
        dateTime,
        durationMinutes
      );
      if (isAvailable) {
        availableStaff.push(staff.id);
      }
    }

    return availableStaff;
  }

  /**
   * Create default availability schedule for new staff (Tue-Sat, 9AM-6PM)
   */
  async createDefaultSchedule(staffId: string) {
    const defaultSchedule = [
      { day: DayOfWeek.TUESDAY, start: "09:00", end: "18:00" },
      { day: DayOfWeek.WEDNESDAY, start: "09:00", end: "18:00" },
      { day: DayOfWeek.THURSDAY, start: "09:00", end: "18:00" },
      { day: DayOfWeek.FRIDAY, start: "09:00", end: "18:00" },
      { day: DayOfWeek.SATURDAY, start: "09:00", end: "18:00" },
    ];

    const createdSchedules = [];

    for (const schedule of defaultSchedule) {
      const created = await this.setStaffAvailability(
        staffId,
        schedule.day,
        schedule.start,
        schedule.end
      );
      createdSchedules.push(created);
    }

    return createdSchedules;
  }
}
