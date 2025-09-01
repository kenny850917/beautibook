import { BookingHold, HoldAnalytics } from "@prisma/client";
import { PrismaService } from "./PrismaService";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { getCurrentUtcTime, getLogTimestamp } from "@/lib/utils/calendar";

// PST timezone for consistent logging
const PST_TIMEZONE = "America/Los_Angeles";

/**
 * BookingHoldService - Singleton for 5-minute booking hold system
 * Follows backend.mdc MVP architecture with simple setTimeout cleanup
 */
export class BookingHoldService {
  private static instance: BookingHoldService;
  private prisma = PrismaService.getInstance();

  // In-memory cleanup tracking following backend.mdc simple caching
  private holdTimeouts = new Map<string, NodeJS.Timeout>();

  /**
   * Format Date object to PST time string for debug logging
   */
  private formatPstTime(date: Date): string {
    const pstDate = toZonedTime(date, PST_TIMEZONE);
    return format(pstDate, "h:mm a");
  }

  private constructor() {}

  /**
   * Get singleton instance following backend.mdc pattern
   */
  static getInstance(): BookingHoldService {
    if (!BookingHoldService.instance) {
      BookingHoldService.instance = new BookingHoldService();
    }
    return BookingHoldService.instance;
  }

  /**
   * Create a 5-minute hold on a time slot and all required consecutive slots
   * Covers entire service duration (e.g., 60-min haircut = 4x 15-min slots)
   */
  async createHold(
    sessionId: string,
    staffId: string,
    serviceId: string,
    slotDateTime: Date
  ): Promise<BookingHold> {
    try {
      // Clean up expired holds first to prevent constraint violations
      await this.cleanupExpiredHolds();

      // Release any existing hold for this session FIRST
      await this.releaseHoldBySession(sessionId);

      // Fetch service details to get duration
      const service = await this.prisma.service.findUnique({
        where: { id: serviceId },
        select: { duration_minutes: true },
      });

      if (!service) {
        throw new Error("Service not found");
      }

      // ✅ UTC NORMALIZATION FIX: Single hold for exact slot only
      // Duration-based blocking handled by overlap detection in AvailabilityService
      console.log(
        `[HOLD DEBUG] Creating single hold for ${
          service.duration_minutes
        }-minute service at ${this.formatPstTime(slotDateTime)} PST`
      );

      // Check the FULL service duration at once (like calendar does)
      const fullServiceAvailable = await this.checkSlotAvailability(
        staffId,
        slotDateTime,
        service.duration_minutes // Check full service duration
      );

      if (!fullServiceAvailable.available) {
        console.log(
          `[HOLD DEBUG] Full service duration check failed: ${fullServiceAvailable.reason}`
        );
        throw new Error(
          `This time slot is no longer available. ${
            fullServiceAvailable.reason || ""
          }`
        );
      }

      // Create 5-minute expiration time using UTC utilities
      const currentTime = getCurrentUtcTime();
      const expiresAt = new Date(currentTime.getTime() + 5 * 60 * 1000); // 5 minutes

      // ✅ FIX: Create SINGLE hold for exact slot requested
      // This prevents overlapping holds that cause 9:00 AM → 2:45 PM blocking
      const hold = await this.prisma.bookingHold.create({
        data: {
          session_id: sessionId,
          staff_id: staffId,
          service_id: serviceId,
          slot_datetime: slotDateTime, // Exact slot only
          expires_at: expiresAt,
        },
      });

      // Setup automatic cleanup for the single hold
      this.scheduleHoldCleanup(hold.id, sessionId);

      // Track analytics for hold creation using UTC utilities
      await this.trackHoldAnalytics({
        session_id: sessionId,
        service_id: serviceId,
        staff_id: staffId,
        held_at: getCurrentUtcTime(),
        converted: false,
      });

      console.log(
        `[HOLD DEBUG] ✅ Created single hold ${
          hold.id
        } for ${this.formatPstTime(
          slotDateTime
        )} PST (expires: ${this.formatPstTime(expiresAt)})`
      );

      return hold;
    } catch (error) {
      console.error("Error creating booking hold:", error);
      throw error;
    }
  }

  /**
   * Check if a time slot is available for booking/holding (checks for overlapping conflicts)
   */
  async checkSlotAvailability(
    staffId: string,
    slotDateTime: Date,
    durationMinutes: number = 15
  ): Promise<{ available: boolean; reason?: string }> {
    try {
      const slotEndTime = new Date(
        slotDateTime.getTime() + durationMinutes * 60000
      );

      // Check for overlapping confirmed bookings
      const overlappingBookings = await this.prisma.booking.findMany({
        where: {
          staff_id: staffId,
          slot_datetime: {
            lt: slotEndTime, // Booking starts before our slot ends
          },
        },
        include: {
          service: { select: { duration_minutes: true } },
        },
      });

      console.log(
        `[CONFLICT DEBUG] Found ${
          overlappingBookings.length
        } potential booking conflicts for slot ${this.formatPstTime(
          slotDateTime
        )} - ${this.formatPstTime(
          slotEndTime
        )} (ISO: ${slotDateTime.toISOString()})`
      );

      // Check if any booking overlaps with our time slot
      for (const booking of overlappingBookings) {
        const bookingEndTime = new Date(
          booking.slot_datetime.getTime() +
            booking.service.duration_minutes * 60000
        );

        console.log(
          `[CONFLICT DEBUG] Checking booking: ${this.formatPstTime(
            booking.slot_datetime
          )} - ${this.formatPstTime(bookingEndTime)} (${
            booking.service.duration_minutes
          }min)`
        );

        // Check for overlap: booking ends after our slot starts
        if (bookingEndTime > slotDateTime) {
          const bookingStart = this.formatPstTime(booking.slot_datetime);
          const bookingEnd = this.formatPstTime(bookingEndTime);
          console.log(
            `[CONFLICT DEBUG] ❌ OVERLAP DETECTED: Booking ${bookingStart} - ${bookingEnd} conflicts with requested ${this.formatPstTime(
              slotDateTime
            )} - ${this.formatPstTime(slotEndTime)}`
          );
          return {
            available: false,
            reason: `Conflicts with existing booking (${bookingStart} - ${bookingEnd})`,
          };
        } else {
          console.log(
            `[CONFLICT DEBUG] ✅ No overlap: Booking ends before our slot starts`
          );
        }
      }

      // Check for overlapping active holds (not expired)
      const now = new Date();
      console.log(
        `[HOLD DEBUG] Checking for conflicts at ${now.toISOString()}`
      );

      const overlappingHolds = await this.prisma.bookingHold.findMany({
        where: {
          staff_id: staffId,
          slot_datetime: {
            lt: slotEndTime, // Hold starts before our slot ends
          },
          expires_at: {
            gt: now, // Not expired
          },
        },
        include: {
          service: { select: { duration_minutes: true } },
        },
      });

      console.log(
        `[HOLD DEBUG] Found ${overlappingHolds.length} active holds for staff ${staffId}`
      );
      overlappingHolds.forEach((hold) => {
        console.log(
          `[HOLD DEBUG] Active hold: ${
            hold.id
          } expires at ${hold.expires_at.toISOString()} (in ${Math.round(
            (hold.expires_at.getTime() - now.getTime()) / 1000
          )}s)`
        );
      });

      // Check if any active hold overlaps with our time slot
      for (const hold of overlappingHolds) {
        const holdEndTime = new Date(
          hold.slot_datetime.getTime() + hold.service.duration_minutes * 60000
        );

        // Check for overlap: hold ends after our slot starts
        if (holdEndTime > slotDateTime) {
          const holdStart = this.formatPstTime(hold.slot_datetime);
          const holdEnd = this.formatPstTime(holdEndTime);
          return {
            available: false,
            reason: `Slot currently held by another customer (${holdStart} - ${holdEnd})`,
          };
        }
      }

      return { available: true };
    } catch (error) {
      console.error("Error checking slot availability:", error);
      return { available: false, reason: "Error checking availability" };
    }
  }

  /**
   * Release a hold before it expires
   */
  async releaseHold(holdId: string): Promise<void> {
    try {
      const hold = await this.prisma.bookingHold.findUnique({
        where: { id: holdId },
      });

      if (!hold) {
        return; // Hold doesn't exist or already cleaned up
      }

      // Clear the timeout if it exists
      const timeoutId = this.holdTimeouts.get(holdId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        this.holdTimeouts.delete(holdId);
      }

      // Delete from database
      await this.prisma.bookingHold.delete({
        where: { id: holdId },
      });

      console.log(`Hold ${holdId} released manually`);
    } catch (error) {
      console.error("Error releasing hold:", error);
      throw error;
    }
  }

  /**
   * Release all holds for a session (when customer selects new slot)
   */
  async releaseHoldBySession(sessionId: string): Promise<void> {
    try {
      // Find all active holds for this session
      const holds = await this.prisma.bookingHold.findMany({
        where: {
          session_id: sessionId,
          expires_at: {
            gt: new Date(),
          },
        },
      });

      // Release each hold
      for (const hold of holds) {
        await this.releaseHold(hold.id);
      }
    } catch (error) {
      console.error("Error releasing holds by session:", error);
    }
  }

  /**
   * Convert hold to booking (called when booking is confirmed)
   */
  async convertHoldToBooking(holdId: string): Promise<void> {
    try {
      const hold = await this.prisma.bookingHold.findUnique({
        where: { id: holdId },
      });

      if (!hold) {
        throw new Error("Hold not found");
      }

      // Clear the cleanup timeout
      const timeoutId = this.holdTimeouts.get(holdId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        this.holdTimeouts.delete(holdId);
      }

      // Mark analytics as converted
      await this.prisma.holdAnalytics.updateMany({
        where: {
          session_id: hold.session_id,
          service_id: hold.service_id,
          staff_id: hold.staff_id,
          converted: false,
        },
        data: {
          converted: true,
        },
      });

      // Delete the hold (booking will be created separately)
      await this.prisma.bookingHold.delete({
        where: { id: holdId },
      });

      console.log(`Hold ${holdId} converted to booking`);
    } catch (error) {
      console.error("Error converting hold to booking:", error);
      throw error;
    }
  }

  /**
   * Get active hold for a session
   */
  async getActiveHoldBySession(sessionId: string): Promise<BookingHold | null> {
    try {
      const now = new Date();
      return await this.prisma.bookingHold.findFirst({
        where: {
          session_id: sessionId,
          expires_at: {
            gt: now,
          },
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
    } catch (error) {
      console.error("Error getting active hold:", error);
      return null;
    }
  }

  /**
   * Get hold by ID
   */
  async getHoldById(holdId: string): Promise<BookingHold | null> {
    try {
      return await this.prisma.bookingHold.findUnique({
        where: {
          id: holdId,
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
    } catch (error) {
      console.error("Error getting hold by ID:", error);
      return null;
    }
  }

  /**
   * Schedule automatic hold cleanup following backend.mdc setTimeout pattern
   */
  private scheduleHoldCleanup(holdId: string, sessionId: string): void {
    const timeoutId = setTimeout(async () => {
      try {
        // Check if hold still exists and hasn't been converted
        const hold = await this.prisma.bookingHold.findUnique({
          where: { id: holdId },
        });

        if (hold) {
          // Mark analytics as expired
          await this.prisma.holdAnalytics.updateMany({
            where: {
              session_id: sessionId,
              converted: false,
            },
            data: {
              expired_at: new Date(),
            },
          });

          // Delete expired hold
          await this.prisma.bookingHold.delete({
            where: { id: holdId },
          });

          console.log(`Hold ${holdId} expired and cleaned up`);
        }

        // Remove from timeout tracking
        this.holdTimeouts.delete(holdId);
      } catch (error) {
        console.error("Error in hold cleanup:", error);
        this.holdTimeouts.delete(holdId);
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Track timeout for manual cleanup if needed
    this.holdTimeouts.set(holdId, timeoutId);
  }

  /**
   * Track hold analytics following backend.mdc simple analytics
   */
  private async trackHoldAnalytics(data: {
    session_id: string;
    service_id: string;
    staff_id: string;
    held_at: Date;
    converted: boolean;
  }): Promise<void> {
    try {
      await this.prisma.holdAnalytics.create({
        data,
      });
    } catch (error) {
      // Don't throw - analytics shouldn't break the hold system
      console.error("Error tracking hold analytics:", error);
    }
  }

  /**
   * Cleanup all expired holds (for maintenance/startup)
   */
  async cleanupExpiredHolds(): Promise<number> {
    try {
      const now = new Date();

      // Get expired holds for analytics update
      const expiredHolds = await this.prisma.bookingHold.findMany({
        where: {
          expires_at: {
            lt: now,
          },
        },
      });

      // Update analytics for expired holds
      for (const hold of expiredHolds) {
        await this.prisma.holdAnalytics.updateMany({
          where: {
            session_id: hold.session_id,
            expired_at: null,
            converted: false,
          },
          data: {
            expired_at: now,
          },
        });
      }

      // Delete expired holds
      const result = await this.prisma.bookingHold.deleteMany({
        where: {
          expires_at: {
            lt: now,
          },
        },
      });

      console.log(`Cleaned up ${result.count} expired holds`);
      return result.count;
    } catch (error) {
      console.error("Error cleaning up expired holds:", error);
      return 0;
    }
  }

  /**
   * Get hold statistics for analytics
   */
  async getHoldStatistics(startDate: Date, endDate: Date) {
    try {
      const analytics = await this.prisma.holdAnalytics.findMany({
        where: {
          held_at: {
            gte: startDate,
            lte: endDate,
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
      });

      const totalHolds = analytics.length;
      const convertedHolds = analytics.filter((a) => a.converted).length;
      const expiredHolds = analytics.filter(
        (a) => a.expired_at && !a.converted
      ).length;
      const conversionRate =
        totalHolds > 0 ? (convertedHolds / totalHolds) * 100 : 0;

      return {
        totalHolds,
        convertedHolds,
        expiredHolds,
        conversionRate: parseFloat(conversionRate.toFixed(2)),
        analytics,
      };
    } catch (error) {
      console.error("Error getting hold statistics:", error);
      return {
        totalHolds: 0,
        convertedHolds: 0,
        expiredHolds: 0,
        conversionRate: 0,
        analytics: [],
      };
    }
  }
}
