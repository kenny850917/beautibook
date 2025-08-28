import { prisma } from "./PrismaService";
import { DayOfWeek } from "@prisma/client";
import { isWithinInterval, parse, format } from "date-fns";
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
   * Get staff availability for a specific day
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
      });

      if (override) {
        return override;
      }
    }

    // Get regular weekly schedule
    return await prisma.staffAvailability.findFirst({
      where: {
        staff_id: staffId,
        day_of_week: dayOfWeek,
        override_date: null,
      },
    });
  }

  /**
   * Get all availability for a staff member
   */
  async getAllStaffAvailability(staffId: string) {
    return await prisma.staffAvailability.findMany({
      where: {
        staff_id: staffId,
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
   * Check if staff is available at a specific time
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

    // Check if the time slot falls within availability hours
    const requestedTime = format(dateTime, "HH:mm");
    const endTime = new Date(dateTime.getTime() + durationMinutes * 60000);
    const requestedEndTime = format(endTime, "HH:mm");

    return (
      this.isTimeWithinRange(
        requestedTime,
        availability.start_time,
        availability.end_time
      ) &&
      this.isTimeWithinRange(
        requestedEndTime,
        availability.start_time,
        availability.end_time
      )
    );
  }

  /**
   * Get available time slots for a staff member on a specific date
   */
  async getAvailableSlots(
    staffId: string,
    date: Date,
    serviceDurationMinutes: number,
    slotIntervalMinutes: number = 15
  ): Promise<string[]> {
    const dayOfWeek = this.getDayOfWeekFromDate(date);
    const availability = await this.getStaffAvailability(
      staffId,
      dayOfWeek,
      date
    );

    if (!availability) {
      return [];
    }

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
    const activeHolds = await prisma.bookingHold.findMany({
      where: {
        staff_id: staffId,
        expires_at: {
          gt: new Date(),
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

        // Check for conflicts with existing bookings
        const hasBookingConflict = existingBookings.some((booking) => {
          const bookingEnd = new Date(
            booking.slot_datetime.getTime() +
              booking.service.duration_minutes * 60000
          );
          return (
            (currentSlot >= booking.slot_datetime &&
              currentSlot < bookingEnd) ||
            (slotEndTime > booking.slot_datetime &&
              slotEndTime <= bookingEnd) ||
            (currentSlot <= booking.slot_datetime && slotEndTime >= bookingEnd)
          );
        });

        // Check for conflicts with active holds
        const hasHoldConflict = activeHolds.some((hold) => {
          const holdEnd = new Date(
            hold.slot_datetime.getTime() + hold.service.duration_minutes * 60000
          );
          return (
            (currentSlot >= hold.slot_datetime && currentSlot < holdEnd) ||
            (slotEndTime > hold.slot_datetime && slotEndTime <= holdEnd) ||
            (currentSlot <= hold.slot_datetime && slotEndTime >= holdEnd)
          );
        });

        if (!hasBookingConflict && !hasHoldConflict) {
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
   * Get day of week enum from Date object
   */
  private getDayOfWeekFromDate(date: Date): DayOfWeek {
    const dayMap = {
      0: DayOfWeek.SUNDAY,
      1: DayOfWeek.MONDAY,
      2: DayOfWeek.TUESDAY,
      3: DayOfWeek.WEDNESDAY,
      4: DayOfWeek.THURSDAY,
      5: DayOfWeek.FRIDAY,
      6: DayOfWeek.SATURDAY,
    };

    return dayMap[date.getDay() as keyof typeof dayMap];
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
