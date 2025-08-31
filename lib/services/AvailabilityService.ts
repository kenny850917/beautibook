import { prisma } from "./PrismaService";
import { DayOfWeek } from "@prisma/client";
import { isWithinInterval, parse, format } from "date-fns";
import { parseIsoToPstComponents } from "@/lib/utils/calendar";
// Timezone functions removed - not used in this service

/**
 * Singleton service for staff availability management
 * Handles schedule creation, time-off, and availability checking
 */
export class AvailabilityService {
  private static instance: AvailabilityService;

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

    // Get existing bookings for the day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existingBookings = await prisma.booking.findMany({
      where: {
        staff_id: staffId,
        slot_datetime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        service: true,
      },
    });

    // Get active holds
    // Add 30-second buffer to account for serverless timing differences
    const now = new Date();
    const bufferTime = new Date(now.getTime() + 30 * 1000); // 30 second buffer
    console.log(
      `[AVAILABILITY DEBUG] Checking holds for staff ${staffId} at ${now.toISOString()} (with 30s buffer: ${bufferTime.toISOString()})`
    );

    const activeHolds = await prisma.bookingHold.findMany({
      where: {
        staff_id: staffId,
        expires_at: {
          gt: bufferTime, // Use buffer time for serverless environments
        },
        slot_datetime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        service: true,
      },
    });

    console.log(
      `[AVAILABILITY DEBUG] Found ${activeHolds.length} active holds for availability check`
    );
    activeHolds.forEach((hold) => {
      console.log(
        `[AVAILABILITY DEBUG] Hold: ${
          hold.id
        } expires at ${hold.expires_at.toISOString()} (in ${Math.round(
          (hold.expires_at.getTime() - now.getTime()) / 1000
        )}s)`
      );
    });

    // Generate potential slots
    const slots: string[] = [];
    const startTime = parse(availability.start_time, "HH:mm", date);
    const endTime = parse(availability.end_time, "HH:mm", date);

    let currentSlot = startTime;

    while (currentSlot < endTime) {
      const slotEndTime = new Date(
        currentSlot.getTime() + serviceDurationMinutes * 60000
      );

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

        // Check for conflicts with existing bookings (improved overlap detection)
        const hasBookingConflict = existingBookings.some((booking) => {
          const bookingEnd = new Date(
            booking.slot_datetime.getTime() +
              booking.service.duration_minutes * 60000
          );

          // More comprehensive overlap detection
          return (
            // Our service starts during an existing booking
            (currentSlot >= booking.slot_datetime &&
              currentSlot < bookingEnd) ||
            // Our service ends during an existing booking
            (slotEndTime > booking.slot_datetime &&
              slotEndTime <= bookingEnd) ||
            // Our service completely covers an existing booking
            (currentSlot <= booking.slot_datetime &&
              slotEndTime >= bookingEnd) ||
            // Existing booking completely covers our service
            (booking.slot_datetime <= currentSlot && bookingEnd >= slotEndTime)
          );
        });

        // Check for conflicts with active holds (improved overlap detection)
        const hasHoldConflict = activeHolds.some((hold) => {
          const holdEnd = new Date(
            hold.slot_datetime.getTime() + hold.service.duration_minutes * 60000
          );

          // More comprehensive overlap detection
          return (
            // Our service starts during an existing hold
            (currentSlot >= hold.slot_datetime && currentSlot < holdEnd) ||
            // Our service ends during an existing hold
            (slotEndTime > hold.slot_datetime && slotEndTime <= holdEnd) ||
            // Our service completely covers an existing hold
            (currentSlot <= hold.slot_datetime && slotEndTime >= holdEnd) ||
            // Existing hold completely covers our service
            (hold.slot_datetime <= currentSlot && holdEnd >= slotEndTime)
          );
        });

        if (!hasBlockConflict && !hasBookingConflict && !hasHoldConflict) {
          slots.push(slotTime);
        }
      }

      currentSlot = new Date(
        currentSlot.getTime() + slotIntervalMinutes * 60000
      );
    }

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
