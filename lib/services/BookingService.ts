import { prisma } from "./PrismaService";
import { AvailabilityService } from "./AvailabilityService";

/**
 * Singleton service for booking logic and conflict prevention
 * Handles booking creation, validation, and atomic operations
 */
export class BookingService {
  private static instance: BookingService;
  private availabilityService: AvailabilityService;

  private constructor() {
    this.availabilityService = AvailabilityService.getInstance();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): BookingService {
    if (!BookingService.instance) {
      BookingService.instance = new BookingService();
    }
    return BookingService.instance;
  }

  /**
   * Create a new booking with atomic transaction to prevent conflicts
   */
  async createBooking(
    staffId: string,
    serviceId: string,
    slotDateTime: Date,
    customerName: string,
    customerPhone: string,
    sessionId?: string,
    customerId?: string,
    customerEmail?: string,
    skipAvailabilityCheck?: boolean // Skip availability check for hold conversions
  ) {
    const booking = await prisma.$transaction(async (tx) => {
      // 1. Verify staff can perform this service
      const staff = await tx.staff.findUnique({
        where: { id: staffId },
        include: { user: true },
      });

      if (!staff || !staff.services.includes(serviceId)) {
        throw new Error("Staff member cannot perform this service");
      }

      // 2. Get service details
      const service = await tx.service.findUnique({
        where: { id: serviceId },
      });

      if (!service) {
        throw new Error("Service not found");
      }

      // 3. Check for existing booking at this exact time
      const existingBooking = await tx.booking.findFirst({
        where: {
          staff_id: staffId,
          slot_datetime: slotDateTime,
        },
      });

      if (existingBooking) {
        throw new Error("Time slot already booked");
      }

      // 4. Check for booking conflicts (overlapping times)
      const conflictingBookings = await tx.booking.findMany({
        where: {
          staff_id: staffId,
          slot_datetime: {
            gte: new Date(
              slotDateTime.getTime() - service.duration_minutes * 60000
            ),
            lte: new Date(
              slotDateTime.getTime() + service.duration_minutes * 60000
            ),
          },
        },
        include: {
          service: true,
        },
      });

      // Check for actual time overlap
      const hasConflict = conflictingBookings.some((booking) => {
        const bookingEnd = new Date(
          booking.slot_datetime.getTime() +
            booking.service.duration_minutes * 60000
        );
        const newBookingEnd = new Date(
          slotDateTime.getTime() + service.duration_minutes * 60000
        );

        return (
          (slotDateTime >= booking.slot_datetime &&
            slotDateTime < bookingEnd) ||
          (newBookingEnd > booking.slot_datetime &&
            newBookingEnd <= bookingEnd) ||
          (slotDateTime <= booking.slot_datetime && newBookingEnd >= bookingEnd)
        );
      });

      if (hasConflict) {
        throw new Error("Booking conflicts with existing appointment");
      }

      // 5. Check staff availability (skip for hold conversions as they're already validated)
      if (!skipAvailabilityCheck) {
        const isAvailable = await this.availabilityService.isStaffAvailable(
          staffId,
          slotDateTime,
          service.duration_minutes
        );

        if (!isAvailable) {
          throw new Error("Staff is not available at this time");
        }
      }

      // 6. Get final price (staff override or base price)
      const staffPricing = await tx.staffServicePricing.findFirst({
        where: {
          staff_id: staffId,
          service_id: serviceId,
        },
      });

      const finalPrice = staffPricing?.custom_price || service.base_price;

      // 7. Release any existing hold for this session
      if (sessionId) {
        await tx.bookingHold.deleteMany({
          where: {
            session_id: sessionId,
            staff_id: staffId,
            service_id: serviceId,
            slot_datetime: slotDateTime,
          },
        });
      }

      // 8. Create the booking
      const booking = await tx.booking.create({
        data: {
          staff_id: staffId,
          service_id: serviceId,
          slot_datetime: slotDateTime,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_id: customerId || null,
          customer_email: customerEmail || null,
          final_price: finalPrice,
        },
        include: {
          staff: {
            include: {
              user: true,
            },
          },
          service: true,
        },
      });

      // 9. Update hold analytics if this was from a hold
      if (sessionId) {
        await tx.holdAnalytics.updateMany({
          where: {
            session_id: sessionId,
            staff_id: staffId,
            service_id: serviceId,
            converted: false,
          },
          data: {
            converted: true,
          },
        });
      }

      return booking;
    });

    return booking;
  }

  /**
   * Get all bookings for a staff member on a specific date
   */
  async getStaffBookingsForDate(staffId: string, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await prisma.booking.findMany({
      where: {
        staff_id: staffId,
        slot_datetime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        service: true,
        staff: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        slot_datetime: "asc",
      },
    });
  }

  /**
   * Get all bookings for a date range
   */
  async getBookingsForDateRange(
    startDate: Date,
    endDate: Date,
    staffId?: string
  ) {
    const where: {
      slot_datetime: { gte: Date; lte: Date };
      staff_id?: string;
    } = {
      slot_datetime: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (staffId) {
      where.staff_id = staffId;
    }

    return await prisma.booking.findMany({
      where,
      include: {
        service: true,
        staff: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        slot_datetime: "asc",
      },
    });
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: true,
        staff: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    // Check if booking is in the past
    if (booking.slot_datetime < new Date()) {
      throw new Error("Cannot cancel past bookings");
    }

    await prisma.booking.delete({
      where: { id: bookingId },
    });

    return booking;
  }

  /**
   * Reschedule a booking
   */
  async rescheduleBooking(
    bookingId: string,
    newDateTime: Date,
    newStaffId?: string
  ) {
    return await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          service: true,
        },
      });

      if (!booking) {
        throw new Error("Booking not found");
      }

      const staffId = newStaffId || booking.staff_id;

      // Check availability at new time
      const isAvailable = await this.availabilityService.isStaffAvailable(
        staffId,
        newDateTime,
        booking.service.duration_minutes
      );

      if (!isAvailable) {
        throw new Error("Staff is not available at the new time");
      }

      // Check for conflicts
      const conflictingBooking = await tx.booking.findFirst({
        where: {
          staff_id: staffId,
          slot_datetime: newDateTime,
          id: { not: bookingId },
        },
      });

      if (conflictingBooking) {
        throw new Error("New time slot conflicts with existing booking");
      }

      // Update the booking
      return await tx.booking.update({
        where: { id: bookingId },
        data: {
          staff_id: staffId,
          slot_datetime: newDateTime,
        },
        include: {
          service: true,
          staff: {
            include: {
              user: true,
            },
          },
        },
      });
    });
  }

  /**
   * Get booking statistics for analytics
   */
  async getBookingStats(staffId?: string, startDate?: Date, endDate?: Date) {
    const where: {
      staff_id?: string;
      slot_datetime?: { gte: Date; lte: Date };
    } = {};

    if (staffId) {
      where.staff_id = staffId;
    }

    if (startDate && endDate) {
      where.slot_datetime = {
        gte: startDate,
        lte: endDate,
      };
    }

    const totalBookings = await prisma.booking.count({ where });

    const totalRevenue = await prisma.booking.aggregate({
      where,
      _sum: {
        final_price: true,
      },
    });

    const bookingsByService = await prisma.booking.groupBy({
      by: ["service_id"],
      where,
      _count: {
        service_id: true,
      },
    });

    return {
      totalBookings,
      totalRevenue: totalRevenue._sum.final_price || 0,
      bookingsByService,
    };
  }

  /**
   * Check if a booking can be modified (not in the past, not too close to start time)
   */
  canModifyBooking(
    booking: { slot_datetime: Date },
    minimumHours: number = 24
  ): boolean {
    const now = new Date();
    const bookingTime = new Date(booking.slot_datetime);
    const minimumNoticeTime = new Date(
      now.getTime() + minimumHours * 60 * 60 * 1000
    );

    return bookingTime > minimumNoticeTime;
  }

  /**
   * Get upcoming bookings for a staff member
   */
  async getUpcomingBookings(staffId: string, limit: number = 10) {
    const now = new Date();

    return await prisma.booking.findMany({
      where: {
        staff_id: staffId,
        slot_datetime: {
          gte: now,
        },
      },
      include: {
        service: true,
      },
      orderBy: {
        slot_datetime: "asc",
      },
      take: limit,
    });
  }
}
