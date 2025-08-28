import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaService } from "@/lib/services/PrismaService";

/**
 * GET - Fetch all services with staff pricing overrides
 * Admin-only endpoint for pricing management dashboard
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prisma = PrismaService.getInstance();

    // Fetch all services with staff pricing overrides
    const services = await prisma.service.findMany({
      include: {
        staffServicePricing: {
          include: {
            staff: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        bookings: {
          where: {
            slot_datetime: {
              gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
          select: {
            id: true,
            final_price: true,
          },
        },
      },
      orderBy: {
        created_at: "asc",
      },
    });

    // Transform data for admin dashboard
    const transformedServices = services.map((service) => {
      // Calculate recent booking stats
      const recentBookings = service.bookings;
      const recentRevenue = recentBookings.reduce(
        (sum, booking) => sum + booking.final_price,
        0
      );

      // Calculate average price including staff overrides
      const allPrices = [
        service.base_price, // Base price
        ...service.staffServicePricing.map((sp) => sp.custom_price), // Staff overrides
      ];
      const averagePrice =
        allPrices.length > 0
          ? allPrices.reduce((sum, price) => sum + price, 0) / allPrices.length
          : service.base_price;

      // Check if there are any staff overrides
      const hasOverrides = service.staffServicePricing.length > 0;

      return {
        id: service.id,
        name: service.name,
        duration_minutes: service.duration_minutes,
        base_price: service.base_price,
        created_at: service.created_at,
        staffPricing: service.staffServicePricing.map((sp) => ({
          id: sp.id,
          staff_id: sp.staff_id,
          service_id: sp.service_id,
          custom_price: sp.custom_price,
          staff: sp.staff,
        })),
        averagePrice: Math.round(averagePrice),
        hasOverrides,
        stats: {
          recentBookings: recentBookings.length,
          recentRevenue,
          avgBookingValue:
            recentBookings.length > 0
              ? recentRevenue / recentBookings.length
              : 0,
        },
      };
    });

    // Calculate summary statistics
    const summary = {
      totalServices: transformedServices.length,
      servicesWithOverrides: transformedServices.filter((s) => s.hasOverrides)
        .length,
      averageBasePrice:
        transformedServices.length > 0
          ? transformedServices.reduce((sum, s) => sum + s.base_price, 0) /
            transformedServices.length
          : 0,
      averageMarketPrice:
        transformedServices.length > 0
          ? transformedServices.reduce((sum, s) => sum + s.averagePrice, 0) /
            transformedServices.length
          : 0,
      totalRecentBookings: transformedServices.reduce(
        (sum, s) => sum + s.stats.recentBookings,
        0
      ),
      totalRecentRevenue: transformedServices.reduce(
        (sum, s) => sum + s.stats.recentRevenue,
        0
      ),
    };

    // Get all staff for reference (in case admin wants to add new pricing overrides)
    const allStaff = await prisma.staff.findMany({
      select: {
        id: true,
        name: true,
        services: true, // Services they can perform
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      services: transformedServices,
      staff: allStaff,
      summary,
    });
  } catch (error) {
    console.error("Error fetching admin services data:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch services data",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
