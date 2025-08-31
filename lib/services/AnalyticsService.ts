// Removed unused imports - types are inferred from Prisma operations
import { PrismaService } from "./PrismaService";
import { parseISO, format, addDays } from "date-fns";
import { createPstDateTime, getTodayPst } from "@/lib/utils/calendar";

interface AnalyticsInsights {
  // Hold Analytics
  totalHolds: number;
  convertedHolds: number;
  expiredHolds: number;
  conversionRate: number;
  averageHoldDuration: number;

  // Booking Analytics
  totalBookings: number;
  totalRevenue: number;
  averageBookingValue: number;

  // Service Analytics
  popularServices: Array<{
    serviceId: string;
    serviceName: string;
    bookingCount: number;
    revenue: number;
  }>;

  // Staff Analytics
  staffPerformance: Array<{
    staffId: string;
    staffName: string;
    bookingCount: number;
    revenue: number;
    conversionRate: number;
  }>;

  // Time-based Analytics
  peakHours: Array<{
    hour: number;
    bookingCount: number;
  }>;

  // Customer Analytics
  returningCustomerRate: number;
  averageCustomerSpend: number;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * AnalyticsService - Singleton for business analytics and conversion tracking
 * Follows backend.mdc MVP architecture with consolidated analytics logic
 */
export class AnalyticsService {
  private static instance: AnalyticsService;
  private prisma = PrismaService.getInstance();

  private constructor() {}

  /**
   * Get singleton instance following backend.mdc pattern
   */
  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Track hold creation event
   * Called by BookingHoldService when hold is created
   */
  async trackHoldCreation(data: {
    sessionId: string;
    staffId: string;
    serviceId: string;
  }): Promise<void> {
    try {
      await this.prisma.holdAnalytics.create({
        data: {
          session_id: data.sessionId,
          service_id: data.serviceId,
          staff_id: data.staffId,
          held_at: new Date(),
          expired_at: null,
          converted: false,
        },
      });
    } catch (error) {
      // Don't throw - analytics failures shouldn't break core functionality
      console.error("Error tracking hold creation:", error);
    }
  }

  /**
   * Track hold expiration event
   * Called by BookingHoldService when hold expires
   */
  async trackHoldExpiration(sessionId: string): Promise<void> {
    try {
      await this.prisma.holdAnalytics.updateMany({
        where: {
          session_id: sessionId,
          expired_at: null,
          converted: false,
        },
        data: {
          expired_at: new Date(),
        },
      });
    } catch (error) {
      console.error("Error tracking hold expiration:", error);
    }
  }

  /**
   * Track hold-to-booking conversion
   * Called by BookingService when booking is created from hold
   */
  async trackHoldConversion(
    sessionId: string,
    staffId: string,
    serviceId: string
  ): Promise<void> {
    try {
      await this.prisma.holdAnalytics.updateMany({
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
    } catch (error) {
      console.error("Error tracking hold conversion:", error);
    }
  }

  /**
   * Get comprehensive analytics insights for date range
   */
  async getAnalyticsInsights(dateRange: DateRange): Promise<AnalyticsInsights> {
    try {
      const { startDate, endDate } = dateRange;

      // Parallel data fetching for performance
      const [
        holdAnalytics,
        bookings,
        serviceStats,
        staffStats,
        timeStats,
        customerStats,
      ] = await Promise.all([
        this.getHoldAnalytics(startDate, endDate),
        this.getBookingAnalytics(startDate, endDate),
        this.getServiceAnalytics(startDate, endDate),
        this.getStaffAnalytics(startDate, endDate),
        this.getTimeAnalytics(startDate, endDate),
        this.getCustomerAnalytics(startDate, endDate),
      ]);

      return {
        // Hold Analytics
        totalHolds: holdAnalytics.totalHolds,
        convertedHolds: holdAnalytics.convertedHolds,
        expiredHolds: holdAnalytics.expiredHolds,
        conversionRate: holdAnalytics.conversionRate,
        averageHoldDuration: holdAnalytics.averageHoldDuration,

        // Booking Analytics
        totalBookings: bookings.totalBookings,
        totalRevenue: bookings.totalRevenue,
        averageBookingValue: bookings.averageBookingValue,

        // Service Analytics
        popularServices: serviceStats.popularServices,

        // Staff Analytics
        staffPerformance: staffStats.staffPerformance,

        // Time Analytics
        peakHours: timeStats.peakHours,

        // Customer Analytics
        returningCustomerRate: customerStats.returningCustomerRate,
        averageCustomerSpend: customerStats.averageCustomerSpend,
      };
    } catch (error) {
      console.error("Error getting analytics insights:", error);
      // Return empty insights on error
      return this.getEmptyInsights();
    }
  }

  /**
   * Get hold-specific analytics
   */
  private async getHoldAnalytics(startDate: Date, endDate: Date) {
    const holdData = await this.prisma.holdAnalytics.findMany({
      where: {
        held_at: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalHolds = holdData.length;
    const convertedHolds = holdData.filter((h) => h.converted).length;
    const expiredHolds = holdData.filter(
      (h) => h.expired_at && !h.converted
    ).length;
    const conversionRate =
      totalHolds > 0 ? (convertedHolds / totalHolds) * 100 : 0;

    // Calculate average hold duration for expired holds
    const expiredWithDuration = holdData.filter(
      (h) => h.expired_at && !h.converted
    );
    const averageHoldDuration =
      expiredWithDuration.length > 0
        ? expiredWithDuration.reduce((sum, h) => {
            const duration = h.expired_at!.getTime() - h.held_at.getTime();
            return sum + duration;
          }, 0) /
          expiredWithDuration.length /
          1000 /
          60 // Convert to minutes
        : 0;

    return {
      totalHolds,
      convertedHolds,
      expiredHolds,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      averageHoldDuration: parseFloat(averageHoldDuration.toFixed(2)),
    };
  }

  /**
   * Get booking-specific analytics
   */
  private async getBookingAnalytics(startDate: Date, endDate: Date) {
    const bookingStats = await this.prisma.booking.aggregate({
      where: {
        slot_datetime: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: true,
      _sum: {
        final_price: true,
      },
    });

    const totalBookings = bookingStats._count;
    const totalRevenue = bookingStats._sum.final_price || 0;
    const averageBookingValue =
      totalBookings > 0 ? totalRevenue / totalBookings : 0;

    return {
      totalBookings,
      totalRevenue,
      averageBookingValue: parseFloat(averageBookingValue.toFixed(2)),
    };
  }

  /**
   * Get service popularity analytics
   */
  private async getServiceAnalytics(startDate: Date, endDate: Date) {
    const serviceData = await this.prisma.booking.groupBy({
      by: ["service_id"],
      where: {
        slot_datetime: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        service_id: true,
      },
      _sum: {
        final_price: true,
      },
    });

    // Get service names
    const serviceDetails = await this.prisma.service.findMany({
      where: {
        id: {
          in: serviceData.map((s) => s.service_id),
        },
      },
    });

    const popularServices = serviceData
      .map((service) => {
        const details = serviceDetails.find((d) => d.id === service.service_id);
        return {
          serviceId: service.service_id,
          serviceName: details?.name || "Unknown Service",
          bookingCount: service._count.service_id,
          revenue: service._sum.final_price || 0,
        };
      })
      .sort((a, b) => b.bookingCount - a.bookingCount);

    return { popularServices };
  }

  /**
   * Get staff performance analytics
   */
  private async getStaffAnalytics(startDate: Date, endDate: Date) {
    const staffData = await this.prisma.booking.groupBy({
      by: ["staff_id"],
      where: {
        slot_datetime: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        staff_id: true,
      },
      _sum: {
        final_price: true,
      },
    });

    // Get staff names and hold conversion data
    const staffDetails = await this.prisma.staff.findMany({
      where: {
        id: {
          in: staffData.map((s) => s.staff_id),
        },
      },
      include: {
        user: true,
      },
    });

    // Get hold conversion rates per staff
    const holdConversions = await this.prisma.holdAnalytics.findMany({
      where: {
        held_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        staff_id: true,
        converted: true,
      },
    });

    const staffPerformance = staffData.map((staff) => {
      const details = staffDetails.find((d) => d.id === staff.staff_id);
      const staffHolds = holdConversions.filter(
        (h) => h.staff_id === staff.staff_id
      );

      const totalHolds = staffHolds.length;
      const convertedHolds = staffHolds.filter((h) => h.converted).length;
      const conversionRate =
        totalHolds > 0 ? (convertedHolds / totalHolds) * 100 : 0;

      return {
        staffId: staff.staff_id,
        staffName: details?.name || "Unknown Staff",
        bookingCount: staff._count.staff_id,
        revenue: staff._sum.final_price || 0,
        conversionRate: parseFloat(conversionRate.toFixed(2)),
      };
    });

    return { staffPerformance };
  }

  /**
   * Get time-based analytics (peak hours)
   */
  private async getTimeAnalytics(startDate: Date, endDate: Date) {
    const bookings = await this.prisma.booking.findMany({
      where: {
        slot_datetime: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        slot_datetime: true,
      },
    });

    // Group by hour
    const hourCounts: { [hour: number]: number } = {};
    bookings.forEach((booking) => {
      const hour = booking.slot_datetime.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakHours = Object.entries(hourCounts)
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        bookingCount: count,
      }))
      .sort((a, b) => b.bookingCount - a.bookingCount);

    return { peakHours };
  }

  /**
   * Get customer analytics (returning customers, spend patterns)
   */
  private async getCustomerAnalytics(startDate: Date, endDate: Date) {
    // Group bookings by phone number to identify returning customers
    const customerData = await this.prisma.booking.groupBy({
      by: ["customer_phone"],
      where: {
        slot_datetime: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        customer_phone: true,
      },
      _sum: {
        final_price: true,
      },
    });

    const totalCustomers = customerData.length;
    const returningCustomers = customerData.filter(
      (customer) => customer._count.customer_phone > 1
    ).length;
    const returningCustomerRate =
      totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;

    const totalSpend = customerData.reduce(
      (sum, customer) => sum + (customer._sum.final_price || 0),
      0
    );
    const averageCustomerSpend =
      totalCustomers > 0 ? totalSpend / totalCustomers : 0;

    return {
      returningCustomerRate: parseFloat(returningCustomerRate.toFixed(2)),
      averageCustomerSpend: parseFloat(averageCustomerSpend.toFixed(2)),
    };
  }

  /**
   * Get conversion funnel data for specific date range
   */
  async getConversionFunnel(dateRange: DateRange) {
    const { startDate, endDate } = dateRange;

    const holds = await this.prisma.holdAnalytics.findMany({
      where: {
        held_at: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalHolds = holds.length;
    const converted = holds.filter((h) => h.converted).length;
    const expired = holds.filter((h) => h.expired_at && !h.converted).length;
    const abandoned = totalHolds - converted - expired; // Still active or manually released

    return {
      totalHolds,
      converted,
      expired,
      abandoned,
      conversionRate: totalHolds > 0 ? (converted / totalHolds) * 100 : 0,
      abandonmentRate: totalHolds > 0 ? (abandoned / totalHolds) * 100 : 0,
      expirationRate: totalHolds > 0 ? (expired / totalHolds) * 100 : 0,
    };
  }

  /**
   * Get empty insights structure for error fallback
   */
  private getEmptyInsights(): AnalyticsInsights {
    return {
      totalHolds: 0,
      convertedHolds: 0,
      expiredHolds: 0,
      conversionRate: 0,
      averageHoldDuration: 0,
      totalBookings: 0,
      totalRevenue: 0,
      averageBookingValue: 0,
      popularServices: [],
      staffPerformance: [],
      peakHours: [],
      returningCustomerRate: 0,
      averageCustomerSpend: 0,
    };
  }

  /**
   * Get real-time dashboard metrics
   */
  async getDashboardMetrics() {
    // Use PST timezone for "today" calculation to ensure consistent dashboard data
    const todayPstStr = getTodayPst(); // Gets today's date in PST as "YYYY-MM-DD"
    const tomorrowPstStr = format(
      addDays(parseISO(todayPstStr + "T00:00:00.000Z"), 1),
      "yyyy-MM-dd"
    );

    const todayPstStartIso = createPstDateTime(todayPstStr, "00:00");
    const tomorrowPstStartIso = createPstDateTime(tomorrowPstStr, "00:00");

    const today = parseISO(todayPstStartIso);
    const tomorrow = parseISO(tomorrowPstStartIso);

    return await this.getAnalyticsInsights({
      startDate: today,
      endDate: tomorrow,
    });
  }
}
