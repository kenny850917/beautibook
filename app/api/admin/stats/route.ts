/**
 * Admin Dashboard Stats API
 * Endpoint for fetching dashboard statistics
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaService } from "@/lib/services/PrismaService";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subWeeks,
} from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const prisma = PrismaService.getInstance();
    const now = new Date();

    // Calculate date boundaries
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Fetch stats in parallel for performance
    const [
      todayBookings,
      weeklyBookings,
      monthlyBookings,
      todayRevenue,
      weeklyRevenue,
      monthlyRevenue,
      activeStaff,
      activeHolds,
      totalCustomers,
      recentBookings,
    ] = await Promise.all([
      // Today's bookings count
      prisma.booking.count({
        where: {
          slot_datetime: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      }),

      // Weekly bookings count
      prisma.booking.count({
        where: {
          slot_datetime: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
      }),

      // Monthly bookings count
      prisma.booking.count({
        where: {
          slot_datetime: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      }),

      // Today's revenue
      prisma.booking.aggregate({
        _sum: {
          final_price: true,
        },
        where: {
          slot_datetime: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      }),

      // Weekly revenue
      prisma.booking.aggregate({
        _sum: {
          final_price: true,
        },
        where: {
          slot_datetime: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
      }),

      // Monthly revenue
      prisma.booking.aggregate({
        _sum: {
          final_price: true,
        },
        where: {
          slot_datetime: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      }),

      // Active staff count
      prisma.staff.count(),

      // Active holds count
      prisma.bookingHold.count({
        where: {
          expires_at: {
            gt: now,
          },
        },
      }),

      // Total customers count
      prisma.customer.count(),

      // Recent bookings for activity feed
      prisma.booking.findMany({
        take: 10,
        orderBy: {
          created_at: "desc",
        },
        include: {
          staff: {
            select: {
              name: true,
            },
          },
          service: {
            select: {
              name: true,
            },
          },
        },
      }),
    ]);

    // ✅ UTC NORMALIZATION: Calculate growth rates using proper date utilities
    const prevWeekStart = subWeeks(weekStart, 1);
    const prevWeekEnd = subWeeks(weekEnd, 1);

    const [prevWeekBookings, prevWeekRevenue] = await Promise.all([
      prisma.booking.count({
        where: {
          slot_datetime: {
            gte: prevWeekStart,
            lte: prevWeekEnd,
          },
        },
      }),
      prisma.booking.aggregate({
        _sum: {
          final_price: true,
        },
        where: {
          slot_datetime: {
            gte: prevWeekStart,
            lte: prevWeekEnd,
          },
        },
      }),
    ]);

    // Calculate growth percentages
    const bookingGrowth =
      prevWeekBookings > 0
        ? ((weeklyBookings - prevWeekBookings) / prevWeekBookings) * 100
        : weeklyBookings > 0
        ? 100
        : 0;

    const revenueGrowth =
      (prevWeekRevenue._sum.final_price || 0) > 0
        ? (((weeklyRevenue._sum.final_price || 0) -
            (prevWeekRevenue._sum.final_price || 0)) /
            (prevWeekRevenue._sum.final_price || 0)) *
          100
        : (weeklyRevenue._sum.final_price || 0) > 0
        ? 100
        : 0;

    return NextResponse.json({
      success: true,
      stats: {
        // Current period stats
        todayBookings,
        weeklyBookings,
        monthlyBookings,
        todayRevenue: todayRevenue._sum.final_price || 0,
        weeklyRevenue: weeklyRevenue._sum.final_price || 0,
        monthlyRevenue: monthlyRevenue._sum.final_price || 0,

        // System stats
        activeStaff,
        pendingHolds: activeHolds,
        totalCustomers,

        // Growth metrics
        bookingGrowth: Math.round(bookingGrowth * 10) / 10, // Round to 1 decimal
        revenueGrowth: Math.round(revenueGrowth * 10) / 10,

        // Activity feed
        recentBookings: recentBookings.map((booking) => ({
          id: booking.id,
          customer_name: booking.customer_name,
          staff_name: booking.staff.name,
          service_name: booking.service.name,
          slot_datetime: booking.slot_datetime,
          final_price: booking.final_price,
          created_at: booking.created_at,
        })),
      },
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch dashboard statistics. Please try again later.",
        stats: null,
      },
      { status: 500 }
    );
  }
}
